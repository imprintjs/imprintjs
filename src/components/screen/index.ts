// Screen: size, color depth, touch support and user-preference media queries.
const MEDIA_FEATURES: ReadonlyArray<readonly [string, readonly string[]]> = [
    ['prefers-contrast', ['high', 'more', 'low', 'less', 'forced', 'no-preference']],
    ['any-hover', ['hover', 'none']],
    ['any-pointer', ['none', 'coarse', 'fine']],
    ['pointer', ['none', 'coarse', 'fine']],
    ['hover', ['hover', 'none']],
    ['update', ['fast', 'slow']],
    ['inverted-colors', ['inverted', 'none']],
    ['prefers-reduced-motion', ['reduce', 'no-preference']],
    ['prefers-reduced-transparency', ['reduce', 'no-preference']],
    ['scripting', ['none', 'initial-only', 'enabled']],
    ['forced-colors', ['active', 'none']],
];

// [shorter side, longer side]: turning the device does not change the value.
export function orderedResolution(width: number, height: number): [number, number] {
    return width <= height ? [width, height] : [height, width];
}

export function matchMediaQueries(match: (query: string) => { matches: boolean }): string[] {
    const hits: string[] = [];
    for (const [feature, values] of MEDIA_FEATURES) {
        for (const value of values) {
            try {
                if (match(`(${feature}: ${value})`).matches) hits.push(`${feature}: ${value}`);
            } catch {}
        }
    }
    return hits;
}

export const collectScreen = () => {
    const g = globalThis as {
        screen?: { width: number; height: number; colorDepth: number };
        navigator?: { maxTouchPoints?: number };
        matchMedia?: (query: string) => { matches: boolean };
        ontouchstart?: unknown;
    };

    if (!g.screen) return null;
    const touchPoints = (g.navigator && g.navigator.maxTouchPoints) || 0;

    return {
        resolution: orderedResolution(g.screen.width, g.screen.height),
        color_depth: g.screen.colorDepth,
        touchscreen: touchPoints > 0 || 'ontouchstart' in g,
        max_touch_points: touchPoints,
        media_queries: typeof g.matchMedia === 'function' ? matchMediaQueries(g.matchMedia.bind(g)) : [],
    };
};