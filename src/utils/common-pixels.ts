/**
 * Combines multiple pixel, renders by selecting the most frequent byte value
 * at each position to reduce random rendering noise from canvas or WebGL.
 * If values are tied, the earliest render wins to ensure deterministic results.
 */

// Reduces pixel noise by selecting the most common byte value across renders.
export function getCommonPixels(renders: ReadonlyArray<Uint8ClampedArray | Uint8Array>): Uint8ClampedArray {
    if (renders.length === 0) throw new RangeError('getCommonPixels() needs at least one render.');
    const length = renders[0].length;
    for (const r of renders) {
        if (r.length !== length) throw new RangeError('All renders must have the same length.');
    }

    const out = new Uint8ClampedArray(length);
    if (renders.length === 1) {
        out.set(renders[0]);
        return out;
    }

    const n = renders.length;
    for (let i = 0; i < length; i++) {
        let best = renders[0][i];
        let bestCount = 0;
        for (let a = 0; a < n; a++) {
            const candidate = renders[a][i];
            let count = 0;
            for (let b = 0; b < n; b++) if (renders[b][i] === candidate) count++;
            if (count > bestCount) { best = candidate; bestCount = count; }
        }
        out[i] = best;
    }

    // Return
    return out;
}