import type { WebrtcComponent } from '../../types/components';
import { hash } from '../../hash';
import { stableStringify } from '../../serialize';
import { parseCodecs, parseExtensions, sanitizeSdp, summarizeCandidates } from './sdp';

/**
 * WebRTC: which audio/video codecs and RTP extensions the browser offers.
 * No server is contacted: with an empty ICE server list only local "host" candidates exist.
 * `hash` covers only the stable parts (not the leak/candidate/sdp fields).
 */
export const GATHER_WAIT_MS = 500;

interface PeerLike {
    createDataChannel(label: string): unknown;
    createOffer(options: unknown): Promise<{ sdp?: string }>;
    setLocalDescription(description: unknown): Promise<void>;
    close(): void;
    onicecandidate: ((event: { candidate: { candidate: string } | null }) => void) | null;
    iceGatheringState?: string;
}

type PeerCtor = new (config: unknown) => PeerLike;

function getPeerCtor(): PeerCtor | null {
    const g = globalThis as unknown as { RTCPeerConnection?: PeerCtor; webkitRTCPeerConnection?: PeerCtor; mozRTCPeerConnection?: PeerCtor };
    return g.RTCPeerConnection || g.webkitRTCPeerConnection || g.mozRTCPeerConnection || null;
}

const EMPTY_CODECS = { codec_count: 0, codecs_hash: hash('[]') };

export function unsupportedWebrtc(): WebrtcComponent {
    return {
        supported: false, stun_supported: false, local_ip_leak: false, data_channel_supported: false, candidate_type: null,
        audio: { ...EMPTY_CODECS }, video: { ...EMPTY_CODECS }, extensions_hash: hash('[]'), sdp_hash: hash(''),
        hash: hash('unsupported'),
    };
}

// Whether the browser accepts a STUN server in its configuration (nothing is sent to it).
function stunAccepted(Ctor: PeerCtor): boolean {
    try {
        new Ctor({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }).close();
        return true;
    } catch { return false; }
}

// Collects ICE candidate strings until gathering ends (null candidate) or `waitMs` passes.
function gatherCandidates(pc: PeerLike, waitMs: number): Promise<string[]> {
    return new Promise((resolve) => {
        const found: string[] = [];
        const timer = setTimeout(() => resolve(found), waitMs);
        pc.onicecandidate = (event) => {
            if (event.candidate) found.push(event.candidate.candidate);
            else { clearTimeout(timer); resolve(found); }
        };
    });
}

export const collectWebrtc = async () => {
    const Ctor = getPeerCtor();
    if (!Ctor) return unsupportedWebrtc();

    const stun = stunAccepted(Ctor);
    const pc = new Ctor({ iceServers: [] });
    try {
        let dataChannel = false;
        try { dataChannel = !!pc.createDataChannel('imprint'); } catch { dataChannel = false; }

        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
        const sdp = offer.sdp || '';
        const gathering = gatherCandidates(pc, GATHER_WAIT_MS);
        await pc.setLocalDescription(offer);
        const candidates = summarizeCandidates(await gathering);

        const audio = parseCodecs(sdp, 'audio');
        const video = parseCodecs(sdp, 'video');
        const extensionsHash = hash(stableStringify(parseExtensions(sdp)));
        const audioInfo = { codec_count: audio.length, codecs_hash: hash(stableStringify(audio)) };
        const videoInfo = { codec_count: video.length, codecs_hash: hash(stableStringify(video)) };

        return {
            supported: true,
            stun_supported: stun,
            local_ip_leak: candidates.leak,
            data_channel_supported: dataChannel,
            candidate_type: candidates.type,
            audio: audioInfo,
            video: videoInfo,
            extensions_hash: extensionsHash,
            sdp_hash: hash(sanitizeSdp(sdp)),
            hash: hash(stableStringify({ audio: audioInfo, video: videoInfo, extensions_hash: extensionsHash, data_channel_supported: dataChannel })),
        };
    } finally { try { pc.close(); } catch {} }
};