import type { BrowserInfo } from '../types/browser';
import type { StabilizeProfile } from '../types/options';

/**
 * Stability rules: which signals must NOT go into the visitor_id hash for a given browser,
 * because that browser randomises them (Brave "farbling", Firefox/Safari private modes) or
 * because they change between visits (battery, remote voices, iframe storage limits).
 * The reported `components` still show every value. Only the hash input is trimmed.
 * Keeping all rules in this one table makes them easy to audit and extend.
 */

export interface StabilityRule {
    paths: readonly string[];
    browsers?: readonly string[];
}

// Signals that are volatile by nature in every browser. Always removed from the hash.
export const VOLATILE_RULES: readonly StabilityRule[] = [
    { paths: ['hardware.battery_level', 'hardware.battery_charging'] },
    { paths: ['audio.base_latency'] },                                  
    { paths: ['webrtc.local_ip_leak', 'webrtc.candidate_type', 'webrtc.sdp_hash'] },
    { paths: ['speech.voice_count', 'speech.remote_voice_count', 'speech.default_voice_uri'] }, 
    { paths: ['screen.resolution'], browsers: ['desktop'] },           
    { paths: ['speech'], browsers: ['brave', 'firefox'] },              
];

export const PROFILE_RULES: Readonly<Record<StabilizeProfile, readonly StabilityRule[]>> = {
    private: [
        { paths: ['canvas'], browsers: ['firefox', 'safari>=17', 'ios>=17', 'brave'] },
        { paths: ['audio'], browsers: ['samsungbrowser', 'safari', 'ios', 'brave'] },
        { paths: ['fonts'], browsers: ['firefox'] },
        { paths: ['webgl.pixels_hash', 'hardware.device_memory', 'hardware.hardware_concurrency', 'plugins'], browsers: ['brave'] },
    ],
    iframe: [
        { paths: ['system.cookies_enabled', 'system.session_storage', 'system.local_storage', 'system.indexed_db'] },
    ],
};

const MATCHER = /^([a-z]+)(?:(>=|<=|>|<|=)(\d+))?$/;
const BROWSER_TOKENS = ['chrome', 'edge', 'firefox', 'safari', 'opera', 'samsungbrowser', 'vivaldi', 'brave', 'ie'];
const OS_TOKENS = ['windows', 'macos', 'ios', 'android', 'linux'];
const ENGINE_TOKENS = ['blink', 'webkit', 'gecko', 'trident'];

function compare(actual: number, op: string | undefined, wanted: number): boolean {
    switch (op) {
        case '>=': return actual >= wanted;
        case '<=': return actual <= wanted;
        case '>': return actual > wanted;
        case '<': return actual < wanted;
        case '=': return actual === wanted;
        default: return true;
    }
}

// True when a matcher string describes `browser`. Unknown tokens never match.
export function matchesBrowser(matcher: string, browser: BrowserInfo): boolean {
    const m = MATCHER.exec(matcher);
    if (!m) return false;
    const token = m[1], op = m[2], wanted = m[3] === undefined ? 0 : parseInt(m[3], 10);

    if (BROWSER_TOKENS.indexOf(token) !== -1) return browser.name === token && compare(browser.major, op, wanted);
    if (OS_TOKENS.indexOf(token) !== -1) return browser.os === token && compare(browser.osMajor, op, wanted);
    if (ENGINE_TOKENS.indexOf(token) !== -1) return op === undefined && browser.engine === token;
    if (token === 'mobile') return op === undefined && browser.mobile;
    if (token === 'desktop') return op === undefined && !browser.mobile;
    return false;
}

// True when every matcher in the table is well formed (used by tests to catch typos).
export function isKnownMatcher(matcher: string): boolean {
    const m = MATCHER.exec(matcher);
    if (!m) return false;
    const t = m[1];
    return [...BROWSER_TOKENS, ...OS_TOKENS, ...ENGINE_TOKENS, 'mobile', 'desktop'].indexOf(t) !== -1;
}

function collect(rules: readonly StabilityRule[], browser: BrowserInfo, into: string[]): void {
    for (const rule of rules) {
        if (!rule.browsers || rule.browsers.some((b) => matchesBrowser(b, browser))) {
            for (const path of rule.paths) if (into.indexOf(path) === -1) into.push(path);
        }
    }
}

// Paths to remove from the hash input for this browser and these profiles (always includes the volatile list).
export function getHashExclusions(browser: BrowserInfo, profiles: readonly StabilizeProfile[]): string[] {
    const paths: string[] = [];
    collect(VOLATILE_RULES, browser, paths);
    for (const profile of profiles) collect(PROFILE_RULES[profile] || [], browser, paths);
    return paths;
}