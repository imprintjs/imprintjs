import { hashBytes } from '../../hash';

const SAMPLE_RATE = 44100;
const FRAMES = 5000;

interface AudioNodeLike { connect(target: unknown): void }
interface OfflineContextLike {
    sampleRate: number;
    destination: { maxChannelCount: number };
    createOscillator(): AudioNodeLike & { type: string; frequency: { value: number }; start(when?: number): void };
    createDynamicsCompressor(): AudioNodeLike & Record<'threshold' | 'knee' | 'ratio' | 'attack' | 'release', { value: number }>;
    createBufferSource(): { channelCountMode: string };
    startRendering(): Promise<{ getChannelData(channel: number): Float32Array }> | undefined;
    oncomplete: ((event: { renderedBuffer: { getChannelData(channel: number): Float32Array } }) => void) | null;
}
type OfflineCtor = new (channels: number, length: number, sampleRate: number) => OfflineContextLike;

interface LiveContextLike {
    sampleRate: number;
    baseLatency?: number;
    destination: { maxChannelCount: number };
    createBufferSource(): { channelCountMode: string };
    close?(): Promise<void> | void;
}

type LiveCtor = new () => LiveContextLike;

function getOfflineCtor(): OfflineCtor | null {
    const g = globalThis as unknown as { OfflineAudioContext?: OfflineCtor; webkitOfflineAudioContext?: OfflineCtor };
    return g.OfflineAudioContext || g.webkitOfflineAudioContext || null;
}

function getLiveCtor(): LiveCtor | null {
    const g = globalThis as unknown as { AudioContext?: LiveCtor; webkitAudioContext?: LiveCtor };
    return g.AudioContext || g.webkitAudioContext || null;
}

// Renders one tone through a dynamics compressor offline and returns its samples.
function renderTone(Ctor: OfflineCtor, wave: string, frequency: number): Promise<{ samples: Float32Array; ctx: OfflineContextLike }> {
    const ctx = new Ctor(1, FRAMES, SAMPLE_RATE);
    const osc = ctx.createOscillator();
    osc.type = wave;
    osc.frequency.value = frequency;
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -50;
    compressor.knee.value = 40;
    compressor.ratio.value = 12;
    compressor.attack.value = 0;
    compressor.release.value = 0.2;
    osc.connect(compressor);
    compressor.connect(ctx.destination);
    osc.start(0);

    const rendering = ctx.startRendering();
    if (rendering && typeof rendering.then === 'function') {
        return rendering.then((buffer) => ({ samples: buffer.getChannelData(0), ctx }));
    }

    // Old Safari: no promise, result arrives through oncomplete
    return new Promise((resolve) => { ctx.oncomplete = (event) => resolve({ samples: event.renderedBuffer.getChannelData(0), ctx }); });
}

// Sum of absolute sample values. Cheap, and sensitive to the tiniest floating point difference.
export function sumAbs(samples: ArrayLike<number>): number {
    let total = 0;
    for (let i = 0; i < samples.length; i++) total += Math.abs(samples[i]);
    return total;
}

function hashSamples(samples: Float32Array): string {
    return hashBytes(new Uint8Array(samples.buffer, samples.byteOffset, samples.byteLength));
}

interface LiveInfo { sampleRate: number; baseLatency: number | null; maxChannels: number; channelCountMode: string }

// Reads the real audio device settings. The context is closed again straight away.
function readLiveContext(): LiveInfo | null {
    const Ctor = getLiveCtor();
    if (!Ctor) return null;
    let ctx: LiveContextLike | null = null;
    try {
        ctx = new Ctor();
        return {
            sampleRate: ctx.sampleRate,
            baseLatency: typeof ctx.baseLatency === 'number' && Number.isFinite(ctx.baseLatency) ? ctx.baseLatency : null,
            maxChannels: ctx.destination.maxChannelCount,
            channelCountMode: ctx.createBufferSource().channelCountMode,
        };
    } catch { return null; }
    finally {
        try {
            const closing = ctx && ctx.close && ctx.close();
            if (closing && typeof (closing as Promise<void>).catch === 'function') (closing as Promise<void>).catch(() => undefined);
        } catch {}
    }
}

export const collectAudio = async () => {
    const Offline = getOfflineCtor();
    if (!Offline) return null;

    const [triangle, sine] = await Promise.all([renderTone(Offline, 'triangle', 10000), renderTone(Offline, 'sine', 1000)]);
    const live = readLiveContext();
    const fallback = triangle.ctx;

    return {
        sample_hash: sumAbs(sine.samples),
        sample_rate: live ? live.sampleRate : fallback.sampleRate,
        base_latency: live ? live.baseLatency : null,
        max_channels: live ? live.maxChannels : fallback.destination.maxChannelCount,
        channel_count_mode: live ? live.channelCountMode : fallback.createBufferSource().channelCountMode,
        oscillator_hash: hashSamples(triangle.samples),
    };
};