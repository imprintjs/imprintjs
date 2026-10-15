import type { FontsComponent } from '../../types/components';
import { hash } from '../../hash';
import { stableStringify } from '../../serialize';
import { createCanvas, get2dContext } from '../../utils/canvas';
import { EphemeralIframe } from '../../utils/ephemeral-iframe';
import { FONT_LIST } from './font-list';

/**
 * Fonts: a font is "installed" when text drawn with it is a different width than the same text
 * drawn with each of three generic fallbacks. We test every fallback separately, so a font
 * whose width happens to equal one generic width is still found.
 */
const TEXT = 'mmMwWLliI0fiflO&1';
const SIZE = 72;
const FALLBACKS = ['monospace', 'sans-serif', 'serif'] as const;

type Measure = Pick<CanvasRenderingContext2D, 'font' | 'measureText'>;
export function measure(ctx: Measure, fontFamily: string): number {
    ctx.font = `${SIZE}px ${fontFamily}`;
    return ctx.measureText(TEXT).width;
}

// Returns { fontName: width } for every font in `fonts` that is installed. Pure given `ctx`.
export function detectFonts(ctx: Measure, fonts: readonly string[] = FONT_LIST): Record<string, number> {
    const baseline: number[] = FALLBACKS.map((fallback) => measure(ctx, fallback));
    const found: Record<string, number> = {};
    for (const font of fonts) {
        for (let i = 0; i < FALLBACKS.length; i++) {
            const width = measure(ctx, `"${font}", ${FALLBACKS[i]}`);
            if (width !== baseline[i]) { found[font] = width; break; }
        }
    }
    return found;
}

function contextFor(doc?: Document): Measure | null {
    const canvas = createCanvas(10, 10, doc);
    return canvas ? get2dContext(canvas) : null;
}

export function buildResult(detected: Record<string, number>): FontsComponent {
    return { count: Object.keys(detected).length, hash: hash(stableStringify(detected)), detected };
}

export const collectFonts = async () => {

    // Prefer a clean iframe so the host page's own web fonts do not show up as "installed".
    const inFrame = await EphemeralIframe((doc) => {
        const ctx = contextFor(doc);
        return ctx ? detectFonts(ctx) : null;
    }).catch(() => null);
    if (inFrame) return buildResult(inFrame);

    const ctx = contextFor();
    return ctx ? buildResult(detectFonts(ctx)) : null;
};