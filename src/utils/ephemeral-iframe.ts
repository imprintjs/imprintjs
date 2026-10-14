/**
 * Create a temporary, hidden iframe document for, isolated DOM measurements.
 * It waits briefly for the host document body, 
 * Returns null if setup fails.
 * Always removes the iframe after the callback completes.
 */

import { wait } from './wait';

const WAIT_MS = 1000;
const POLL_MS = 25;

// Runs a callback with a temporary iframe document and removes the iframe afterward.
export async function EphemeralIframe<T>(callback: (doc: Document) => T | Promise<T>) {
    const host = (globalThis as { document?: Document }).document;
    if (!host) { return null; }

    // Wait briefly for the body to become available.
    for (let waited = 0; !host.body && waited < WAIT_MS; waited += POLL_MS) { await wait(POLL_MS); }
    if (!host.body) { return null; }

    // Create a hidden iframe that does not interfere with the page.
    const frame = host.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.setAttribute('tabindex', '-1');
    frame.style.cssText = 'position:fixed;left:-9999px;top:0;width:0;height:0;border:0;opacity:0;pointer-events:none;';
    try {
        host.body.appendChild(frame);
        const doc = frame.contentDocument || (frame.contentWindow && frame.contentWindow.document);
        if (!doc) return null;
        return await callback(doc);
    } finally {
        if (frame.parentNode) { frame.parentNode.removeChild(frame); }
    }
}