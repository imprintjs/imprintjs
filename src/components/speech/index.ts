import type { SpeechComponent } from '../../types/components';
import { hash } from '../../hash';
import { stableStringify } from '../../serialize';

/**
 * Speech: the text-to-speech voices installed in the browser/OS.
 * Hashes use only LOCAL voices, because remote voices depend on the network and login state.
 */
export const VOICE_WAIT_MS = 800;

interface VoiceLike { 
    voiceURI: string; 
    name: string; 
    lang: string; 
    localService: boolean; 
    default: boolean 
}

interface SynthLike {
    getVoices(): VoiceLike[];
    addEventListener?(type: string, listener: () => void): void;
    removeEventListener?(type: string, listener: () => void): void;
}

const byText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

// Pure: turns a voice list into the component shape.
export function summarizeVoices(voices: readonly VoiceLike[]): SpeechComponent {
    const local = voices.filter((v) => v.localService);
    const signatures = local.map((v) => `${v.voiceURI}|${v.name}|${v.lang}`).sort(byText);
    const languages = Array.from(new Set(local.map((v) => v.lang))).sort(byText);
    const defaultVoice = voices.find((v) => v.default);
    const voicesHash = hash(stableStringify(signatures));
    const languagesHash = hash(stableStringify(languages));

    return {
        has_speech_synthesis: true,
        voice_count: voices.length,
        local_voice_count: local.length,
        remote_voice_count: voices.length - local.length,
        default_voice_uri: defaultVoice ? defaultVoice.voiceURI : null,
        languages_hash: languagesHash,
        voices_hash: voicesHash,
        hash: hash(stableStringify({ local_voice_count: local.length, languages_hash: languagesHash, voices_hash: voicesHash })),
    };
}

export function unsupportedSpeech(): SpeechComponent {
    const empty = summarizeVoices([]);
    return { ...empty, has_speech_synthesis: false };
}

// Voices often load a moment after page start. Wait for them, but never longer than VOICE_WAIT_MS.
function loadVoices(synth: SynthLike): Promise<VoiceLike[]> {
    return new Promise((resolve) => {
        const first = synth.getVoices();
        if (first.length > 0 || typeof synth.addEventListener !== 'function') { resolve(first); return; }

        let done = false;
        const finish = (): void => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            if (synth.removeEventListener) synth.removeEventListener('voiceschanged', finish);
            resolve(synth.getVoices());
        };
        const timer = setTimeout(finish, VOICE_WAIT_MS);
        synth.addEventListener('voiceschanged', finish);
    });
}

export const collectSpeech = async () => {
    const synth = (globalThis as { speechSynthesis?: SynthLike }).speechSynthesis;
    if (!synth || typeof synth.getVoices !== 'function') return unsupportedSpeech();
    return summarizeVoices(await loadVoices(synth));
};