/**
 * System: navigator identity fields and storage availability.
 * The User-Agent is deliberately NOT collected: it is trivial to spoof and adds no trust.
 */

// Runs `probe`; any exception (e.g. storage blocked by the browser) counts as "not available".
export function available(probe: () => unknown): boolean {
    try { return !!probe(); } catch { return false; }
}

export const collectSystem = () => {
    const g = globalThis as {
        navigator?: { product?: string; productSub?: string; vendor?: string; platform?: string; cookieEnabled?: boolean; userAgentData?: { platform?: string } };
        sessionStorage?: unknown; localStorage?: unknown; indexedDB?: unknown;
    };

    const nav = g.navigator;
    if (!nav) return null;

    return {
        product: nav.product || '',
        product_sub: nav.productSub || '',
        vendor: nav.vendor || '',
        platform: nav.platform || (nav.userAgentData && nav.userAgentData.platform) || '',
        cookies_enabled: nav.cookieEnabled === true,
        session_storage: available(() => g.sessionStorage),
        local_storage: available(() => g.localStorage),
        indexed_db: available(() => g.indexedDB),
    };
};