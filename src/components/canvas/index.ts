import { hashBytes } from '../../hash';
import { createCanvas, get2dContext, renderPixels } from '../../utils/canvas';
import type { PixelBuffer } from '../../utils/canvas';
import { getCommonPixels } from '../../utils/common-pixels';

export const RUNS = 3;
type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

export const drawGeometry: Draw = (ctx, w, h) => {
    const gradient = ctx.createLinearGradient(0, 0, w, h);
    ['#ff0040', '#ff9a00', '#f6f000', '#00c853', '#2979ff', '#651fff', '#d500f9'].forEach((c, i, all) => {
        gradient.addColorStop(i / (all.length - 1), c);
    });
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = 'multiply';
    [['#ff3b30', 60], ['#34c759', 95], ['#0a84ff', 130]].forEach(([color, x]) => {
        ctx.fillStyle = color as string;
        ctx.beginPath();
        ctx.arc(x as number, 30, 22, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';

    ctx.lineWidth = 1.7;
    ctx.strokeStyle = 'rgba(20, 20, 20, 0.85)';
    ctx.beginPath();
    ctx.moveTo(150, 8);
    ctx.bezierCurveTo(190, 70, 230, -20, 270, 50);
    ctx.quadraticCurveTo(210, 10, 160, 52);
    ctx.stroke();

    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 4.3;
    ctx.shadowOffsetX = 2.2;
    ctx.fillStyle = '#ffffff';
    ctx.save();
    ctx.translate(215, 40);
    ctx.rotate(0.37);
    ctx.fillRect(-14.5, -9.25, 29, 18.5);
    ctx.restore();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
};

export const drawText: Draw = (ctx, w, h) => {
    ctx.fillStyle = '#f5f5f0';
    ctx.fillRect(0, 0, w, h);
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#102030';
    ctx.font = '17.3px Arial, sans-serif';
    ctx.fillText('Cwm fjordbank glyphs vext quiz, \u00c5\u00df\u03a9\u0416\u4e2d', 4, 20);
    ctx.fillStyle = 'rgba(200, 30, 30, 0.7)';
    ctx.font = 'italic 15.1px Georgia, serif';
    ctx.fillText('Sphinx of black quartz, judge my vow 0Oo1lI', 6.5, 38);
    ctx.fillStyle = 'rgba(30, 30, 200, 0.6)';
    ctx.font = '13px "Courier New", monospace';
    ctx.fillText('WMwmil10Oo|{}[]@#', 8.25, 52);
};

export const drawEmoji: Draw = (ctx, w, h) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.textBaseline = 'top';
    ctx.font = '26px sans-serif';
    ctx.fillText('\u{1F600}\u{1F9D1}\u200D\u{1F680}\u{1F3F3}\uFE0F\u200D\u{1F308}\u{1F984}\u{1F468}\u200D\u{1F469}\u200D\u{1F467}', 2, 4);
};

export function hashDrawing(width: number, height: number, draw: Draw): string | null {
    const renders: PixelBuffer[] = [];
    for (let i = 0; i < RUNS; i++) {
        const pixels = renderPixels(width, height, draw);
        if (pixels) renders.push(pixels);
    }
    if (renders.length === 0) return null;
    return hashBytes(new Uint8Array(getCommonPixels(renders.map((r) => r.data)).buffer));
}

export function detectWinding(): boolean {
    const canvas = createCanvas(4, 4);
    const ctx = canvas && get2dContext(canvas);
    if (!ctx) return false;
    ctx.rect(0, 0, 10, 10);
    ctx.rect(2, 2, 6, 6);
    return !ctx.isPointInPath(5, 5, 'evenodd');
}

export const collectCanvas = () => {
    const geometry = hashDrawing(280, 60, drawGeometry);
    if (geometry === null) return null;
    const text = hashDrawing(320, 60, drawText);
    const emoji = hashDrawing(200, 40, drawEmoji);
    if (text === null || emoji === null) return null;
    return { winding: detectWinding(), geometry_hash: geometry, text_hash: text, emoji_hash: emoji };
};