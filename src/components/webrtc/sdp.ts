// Pure SDP parsing helpers for the webrtc component.
export interface CodecDescriptor {
    mime: string;
    clock_rate: number;
    channels: number;
    fmtp: string;
    feedback: string[];
}

// Lines that change on every connection (ids, keys, addresses) and must not reach a hash.
const RANDOM_LINE = /^(o=|c=|a=ice-ufrag|a=ice-pwd|a=fingerprint|a=msid|a=ssrc|a=candidate|a=end-of-candidates|a=mid|a=group|a=rtcp:|a=setup)/;
function lines(sdp: string): string[] {
    return sdp.split(/\r?\n/).filter((l) => l.length > 0);
}

// The lines of the `m=<media>` section (header line included), or [] when absent.
function section(sdp: string, media: string): string[] {
    const all = lines(sdp);
    const start = all.findIndex((l) => l.startsWith(`m=${media} `));
    if (start === -1) return [];
    let end = all.length;
    for (let i = start + 1; i < all.length; i++) if (all[i].startsWith('m=')) { end = i; break; }
    return all.slice(start, end);
}

// Codecs offered for `audio` or `video`, in canonical (sorted) order. Payload numbers are ignored.
export function parseCodecs(sdp: string, media: 'audio' | 'video'): CodecDescriptor[] {
    const block = section(sdp, media);
    if (block.length === 0) return [];
    const payloads = block[0].split(' ').slice(3);

    const codecs: CodecDescriptor[] = [];
    for (const pt of payloads) {
        const rtpmap = block.map((l) => l.match(new RegExp(`^a=rtpmap:${pt} ([^/\\s]+)/(\\d+)(?:/(\\d+))?`))).find((m) => m);
        if (!rtpmap) continue;
        const fmtp = block.map((l) => l.match(new RegExp(`^a=fmtp:${pt} (.+)$`))).find((m) => m);
        const feedback = block
            .map((l) => l.match(new RegExp(`^a=rtcp-fb:(?:${pt}|\\*) (.+)$`)))
            .filter((m): m is RegExpMatchArray => !!m)
            .map((m) => m[1])
            .sort();
        codecs.push({
            mime: `${media}/${rtpmap[1]}`,
            clock_rate: parseInt(rtpmap[2], 10),
            channels: media === 'audio' ? (rtpmap[3] ? parseInt(rtpmap[3], 10) : 1) : 0,
            fmtp: fmtp ? fmtp[1] : '',
            feedback,
        });
    }
    return codecs.sort((a, b) => {
        const x = JSON.stringify(a), y = JSON.stringify(b);
        return x < y ? -1 : x > y ? 1 : 0;
    });
}

// Unique RTP header extension URIs, sorted. The numeric ids are dropped (they are negotiated per call).
export function parseExtensions(sdp: string): string[] {
    const uris = new Set<string>();
    for (const line of lines(sdp)) {
        const m = line.match(/^a=extmap:\d+(?:\/\w+)? (\S+)/);
        if (m) uris.add(m[1]);
    }
    return Array.from(uris).sort();
}

// The SDP without per-connection random lines, so the same browser gives the same text every time.
export function sanitizeSdp(sdp: string): string {
    return lines(sdp).filter((l) => !RANDOM_LINE.test(l)).join('\n');
}

export interface CandidateSummary {
    leak: boolean;
    type: string | null;
}

// Reads ICE candidate lines like "candidate:1 1 udp 2113937151 192.168.1.5 54321 typ host ...".
export function summarizeCandidates(candidates: readonly string[]): CandidateSummary {
    let leak = false;
    let type: string | null = null;
    for (const text of candidates) {
        const parts = text.trim().split(/\s+/);
        const typIndex = parts.indexOf('typ');
        if (typIndex === -1) continue;
        if (type === null) type = parts[typIndex + 1] || null;
        const address = parts[4] || '';
        if (parts[typIndex + 1] === 'host' && address.length > 0 && !address.endsWith('.local')) leak = true;
    }
    return { leak, type };
}