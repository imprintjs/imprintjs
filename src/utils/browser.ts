import type { BrowserInfo, BrowserName, EngineName, OsName } from '../types/browser';
const UNKNOWN: BrowserInfo = {
    name: 'unknown',
    version: 'unknown', 
    major: 0, 
    engine: 'unknown', 
    os: 'unknown', 
    osMajor: 0, 
    mobile: false,
};

interface BrowserPattern { name: BrowserName; pattern: RegExp }

// Order matters: most specific first,
// (Edge and Opera also say "Chrome" in their UA).
const BROWSER_PATTERNS: BrowserPattern[] = [
    { name: 'samsungbrowser', pattern: /SamsungBrowser\/(\d+(?:\.\d+)*)/ },
    { name: 'edge', pattern: /(?:EdgA|EdgiOS|Edge|Edg)\/(\d+(?:\.\d+)*)/ },
    { name: 'opera', pattern: /(?:OPR|OPX|Opera)[/ ](\d+(?:\.\d+)*)/ },
    { name: 'vivaldi', pattern: /Vivaldi\/(\d+(?:\.\d+)*)/ },
    { name: 'chrome', pattern: /CriOS\/(\d+(?:\.\d+)*)/ },
    { name: 'firefox', pattern: /(?:Firefox|FxiOS|Waterfox|Iceweasel|IceCat)\/(\d+(?:\.\d+)*)/ },
    { name: 'chrome', pattern: /(?:Chrome|Chromium)\/(\d+(?:\.\d+)*)/ },
    { name: 'safari', pattern: /Version\/(\d+(?:\.\d+)*).*Safari\// },
    { name: 'ie', pattern: /(?:MSIE |rv:)(\d+(?:\.\d+)*)(?=.*Trident|\))/ },
];

function toMajor(version: string): number {
    const n = parseInt(version.split('.')[0] || '0', 10);
    return Number.isFinite(n) ? n : 0;
}

function detectOs(ua: string): { os: OsName; osMajor: number } {
    let m: RegExpMatchArray | null;
    if ((m = ua.match(/(?:iPhone|iPad|iPod).*? OS (\d+)[_.]/))) return { os: 'ios', osMajor: parseInt(m[1], 10) };
    if (/iPhone|iPad|iPod/.test(ua)) return { os: 'ios', osMajor: 0 };
    if ((m = ua.match(/Android (\d+)/))) return { os: 'android', osMajor: parseInt(m[1], 10) };
    if (/Android/.test(ua)) return { os: 'android', osMajor: 0 };
    if ((m = ua.match(/Windows NT (\d+)/))) return { os: 'windows', osMajor: parseInt(m[1], 10) };
    if (/Windows/.test(ua)) return { os: 'windows', osMajor: 0 };
    if (/Mac OS X|Macintosh/.test(ua)) return { os: 'macos', osMajor: 0 };
    if (/CrOS|Linux|X11/.test(ua)) return { os: 'linux', osMajor: 0 };
    return { os: 'unknown', osMajor: 0 };
}

function engineFor(name: BrowserName, os: OsName): EngineName {
    if (os === 'ios') return 'webkit';
    switch (name) {
        case 'chrome':
        case 'edge': 
        case 'opera':
        case 'samsungbrowser': 
        case 'vivaldi': 
        case 'brave': 
            return 'blink';
        case 'firefox': 
            return 'gecko';
        case 'safari': 
            return 'webkit';
        case 'ie': 
            return 'trident';
        default: 
            return 'unknown';
    }
}

// Pure UA parser. `brave` must come from `navigator.brave` because Brave hides itself in the UA.
export function parseUserAgent(ua: string, brave = false): BrowserInfo {
    if (typeof ua !== 'string' || ua.length === 0) return { ...UNKNOWN };

    let name: BrowserName = 'unknown';
    let version = 'unknown';
    for (const candidate of BROWSER_PATTERNS) {
        const m = ua.match(candidate.pattern);
        if (m) { name = candidate.name; version = m[1]; break; }
    }

    if (brave) name = 'brave';
    const { os, osMajor } = detectOs(ua);

    // Android phones say "Mobile"; Android tablets do not, so they count as non-mobile.
    const mobile = /Mobi|iPhone|iPod|IEMobile|Opera Mini|webOS|BlackBerry|Windows Phone/i.test(ua) && !/iPad/i.test(ua);
    return { name, version, major: toMajor(version), engine: engineFor(name, os), os, osMajor, mobile };
}

interface NavigatorLike {
    userAgent?: string;
    platform?: string;
    maxTouchPoints?: number;
    brave?: unknown;
}

const cache = new Map<string, BrowserInfo>();

// Detects the current browser (memoised per UA + Brave flag). 
// Returns "unknown" outside a browser.
export function detectBrowser(): BrowserInfo {
    const nav = (globalThis as { navigator?: NavigatorLike }).navigator;
    if (!nav || typeof nav.userAgent !== 'string') return { ...UNKNOWN };
    const brave = !!nav.brave;

    // iPadOS 13+ pretends to be a Mac: a Mac with a touch screen is an iPad.
    const ipadAsMac = nav.platform === 'MacIntel' && (nav.maxTouchPoints || 0) > 1;
    const key = `${brave ? 'B' : 'N'}${ipadAsMac ? 'I' : 'M'}|${nav.userAgent}`;
    const hit = cache.get(key);
    if (hit) return hit;
    const info = parseUserAgent(nav.userAgent, brave);
    if (ipadAsMac && info.os === 'macos') { info.os = 'ios'; info.engine = 'webkit'; }
    cache.set(key, info);
    return info;
}

// Test helper: clears the memo cache.
export function resetBrowserCache(): void {
    cache.clear();
}