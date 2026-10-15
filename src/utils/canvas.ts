export interface PixelBuffer {
    data: Uint8ClampedArray;
    width: number;
    height: number;
}

type CanvasFactoryDoc = Pick<Document, 'createElement'>;

// Creates a canvas of the given size, or null when there is no DOM.
export function createCanvas(width: number, height: number, doc?: CanvasFactoryDoc): HTMLCanvasElement | null {
    const d = doc || (globalThis as { document?: CanvasFactoryDoc }).document;
    if (!d || typeof d.createElement !== 'function') return null;
    try {
        const canvas = d.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        return canvas;
    } catch { return null; }
}

// A 2D context, or null if unsupported / blocked.
export function get2dContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
    try { return canvas.getContext('2d', { willReadFrequently: true } as CanvasRenderingContext2DSettings) as CanvasRenderingContext2D | null; } 
    catch { return null; }
}

// Runs `draw` on a fresh canvas and returns its pixels, or null when canvas is unavailable.
// A fresh canvas per render keeps runs independent, which the majority vote relies on.
export function renderPixels(width: number, height: number, draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void,): PixelBuffer | null {
    const canvas = createCanvas(width, height);
    if (!canvas) { return null; }
    const ctx = get2dContext(canvas);
    if (!ctx) { return null; }
    draw(ctx, width, height);
    const image = ctx.getImageData(0, 0, width, height);
    return { data: image.data, width, height };
}