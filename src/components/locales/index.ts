/**
 * Standard-time offset in minutes WEST of UTC (the JS convention: New York = 300, India = -330).
 * Daylight saving only ever lowers the number, so the larger of January and July is standard time.
 * That keeps the value identical all year, unlike getTimezoneOffset() on today's date.
 */
export function standardOffsetMinutes(year: number = new Date().getFullYear()): number {
    const january = new Date(year, 0, 1).getTimezoneOffset();
    const july = new Date(year, 6, 1).getTimezoneOffset();
    return Math.max(january, july);
}

// Minutes west of UTC -> "+05:30" style (note the sign flip: east of UTC is positive).
export function formatOffset(minutesWest: number): string {
    const eastMinutes = Math.round(-minutesWest);
    const sign = eastMinutes < 0 ? '-' : '+';
    const abs = Math.abs(eastMinutes);
    const pad = (n: number): string => (n < 10 ? '0' : '') + n;
    return `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

export const collectLocales = () => {
    const nav = (globalThis as { navigator?: { language?: string; languages?: readonly string[] } }).navigator;
    const language = (nav && typeof nav.language === 'string' && nav.language) || '';
    const languages = nav && nav.languages && nav.languages.length ? Array.from(nav.languages) : language ? [language] : [];
    return { language, languages, timezone_offset: formatOffset(standardOffsetMinutes()) };
};