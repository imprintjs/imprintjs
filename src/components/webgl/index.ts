import type { WebglComponent } from '../../types/components';
import { hash, hashBytes } from '../../hash';
import { stableStringify } from '../../serialize';
import { createCanvas } from '../../utils/canvas';
import { getCommonPixels } from '../../utils/common-pixels';

/**
 * WebGL: GPU identity, limits, supported extensions and a rendered image.
 * Every context is released again (loseContext) because browsers allow only ~16 at once.
 */
const WIDTH = 200;
const HEIGHT = 100;
const SPOKES = 137;
const FAN_POINTS = 64;

// Context limits that differ between GPUs and drivers.
export const PARAMETER_NAMES = [
    'MAX_TEXTURE_SIZE', 'MAX_CUBE_MAP_TEXTURE_SIZE', 'MAX_RENDERBUFFER_SIZE', 'MAX_VIEWPORT_DIMS',
    'MAX_VERTEX_ATTRIBS', 'MAX_VERTEX_UNIFORM_VECTORS', 'MAX_VARYING_VECTORS', 'MAX_FRAGMENT_UNIFORM_VECTORS',
    'MAX_COMBINED_TEXTURE_IMAGE_UNITS', 'MAX_VERTEX_TEXTURE_IMAGE_UNITS', 'MAX_TEXTURE_IMAGE_UNITS',
    'ALIASED_LINE_WIDTH_RANGE', 'ALIASED_POINT_SIZE_RANGE', 'RED_BITS', 'GREEN_BITS', 'BLUE_BITS',
    'ALPHA_BITS', 'DEPTH_BITS', 'STENCIL_BITS', 'SUBPIXEL_BITS', 'SAMPLES', 'SAMPLE_BUFFERS',
] as const;

// Extensions most desktop and mobile browsers offer. Missing ones are reported.
export const KNOWN_EXTENSIONS = [
    'ANGLE_instanced_arrays', 'EXT_blend_minmax', 'EXT_color_buffer_half_float', 'EXT_float_blend',
    'EXT_frag_depth', 'EXT_shader_texture_lod', 'EXT_sRGB', 'EXT_texture_compression_bptc',
    'EXT_texture_compression_rgtc', 'EXT_texture_filter_anisotropic', 'OES_element_index_uint',
    'OES_fbo_render_mipmap', 'OES_standard_derivatives', 'OES_texture_float', 'OES_texture_float_linear',
    'OES_texture_half_float', 'OES_texture_half_float_linear', 'OES_vertex_array_object',
    'WEBGL_color_buffer_float', 'WEBGL_compressed_texture_s3tc', 'WEBGL_compressed_texture_s3tc_srgb',
    'WEBGL_debug_renderer_info', 'WEBGL_debug_shaders', 'WEBGL_depth_texture', 'WEBGL_draw_buffers',
    'WEBGL_lose_context', 'WEBGL_multi_draw',
] as const;

type Gl = WebGLRenderingContext;
type GlConstants = Record<string, number>;

const VERTEX_SHADER = `
attribute vec2 position;
varying vec2 v;
void main() {
    v = position;
    gl_Position = vec4(position, 0.0, 1.0);
}`;

const FRAGMENT_SHADER = `
precision mediump float;
varying vec2 v;
void main() {
    gl_FragColor = vec4(0.5 + 0.5 * sin(v.x * 13.0), 0.5 + 0.5 * cos(v.y * 7.0), fract(v.x * v.y * 31.0), 1.0);
}`;

function toPlain(value: unknown): unknown {
    if (value && typeof value === 'object' && 'length' in (value as object)) return Array.from(value as ArrayLike<number>);
    return value === undefined ? null : value;
}

// getParameter that never throws: a driver that rejects one query must not lose the whole component.
function safeParameter(gl: Gl, constant: number): unknown {
    try { return toPlain(gl.getParameter(constant)); } catch { return null; }
}

export function readParameters(gl: Gl): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const name of PARAMETER_NAMES) {
        const constant = (gl as unknown as GlConstants)[name];
        if (typeof constant !== 'number') continue;
        out[name] = safeParameter(gl, constant);
    }
    return out;
}

export function readShaderPrecision(gl: Gl): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    const stages: Array<[string, number]> = [['vertex', gl.VERTEX_SHADER], ['fragment', gl.FRAGMENT_SHADER]];
    const levels: Array<[string, number]> = [
        ['low_float', gl.LOW_FLOAT], ['medium_float', gl.MEDIUM_FLOAT], ['high_float', gl.HIGH_FLOAT],
        ['low_int', gl.LOW_INT], ['medium_int', gl.MEDIUM_INT], ['high_int', gl.HIGH_INT],
    ];
    for (const [stage, shaderType] of stages) {
        for (const [level, precisionType] of levels) {
            const f = gl.getShaderPrecisionFormat(shaderType, precisionType);
            out[`${stage}_${level}`] = f ? [f.rangeMin, f.rangeMax, f.precision] : null;
        }
    }
    return out;
}

// Numbers that only exist once an extension is enabled (anisotropy, draw buffers).
export function readExtensionParameters(gl: Gl): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    const aniso = gl.getExtension('EXT_texture_filter_anisotropic') || gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');
    if (aniso) out.max_anisotropy = safeParameter(gl, (aniso as unknown as GlConstants).MAX_TEXTURE_MAX_ANISOTROPY_EXT);
    const draw = gl.getExtension('WEBGL_draw_buffers');
    if (draw) {
        const c = draw as unknown as GlConstants;
        out.max_draw_buffers = safeParameter(gl, c.MAX_DRAW_BUFFERS_WEBGL);
        out.max_color_attachments = safeParameter(gl, c.MAX_COLOR_ATTACHMENTS_WEBGL);
    }
    return out;
}

function compile(gl: Gl, type: number, source: string): WebGLShader | null {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
}

// Vertices in clip space: 137 lines from the centre, then a 64-point fan around it.
export function buildVertices(): Float32Array {
    const out = new Float32Array(SPOKES * 4 + (FAN_POINTS + 2) * 2);
    let n = 0;
    for (let i = 0; i < SPOKES; i++) {
        const a = (i * 2 * Math.PI) / SPOKES;
        out[n++] = 0; out[n++] = 0;
        out[n++] = Math.cos(a) * 0.95; out[n++] = Math.sin(a) * 0.95;
    }
    out[n++] = 0; out[n++] = 0;
    for (let i = 0; i <= FAN_POINTS; i++) {
        const a = (i * 2 * Math.PI) / FAN_POINTS;
        out[n++] = Math.cos(a) * 0.4; out[n++] = Math.sin(a) * 0.4;
    }
    return out;
}

// Draws the scene and returns its pixels, or null if the GPU refuses.
function renderScene(gl: Gl): Uint8Array | null {
    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    const program = gl.createProgram();
    if (!vs || !fs || !program) return null;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;

    const buffer = gl.createBuffer();
    if (!buffer) return null;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, buildVertices(), gl.STATIC_DRAW);
    gl.useProgram(program);
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    gl.viewport(0, 0, WIDTH, HEIGHT);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.LINES, 0, SPOKES * 2);
    gl.drawArrays(gl.TRIANGLE_FAN, SPOKES * 2, FAN_POINTS + 2);

    const pixels = new Uint8Array(WIDTH * HEIGHT * 4);
    gl.readPixels(0, 0, WIDTH, HEIGHT, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    return pixels;
}

function openContext(): { gl: Gl; canvas: HTMLCanvasElement } | null {
    const canvas = createCanvas(WIDTH, HEIGHT);
    if (!canvas) return null;
    try {
        const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as Gl | null;
        return gl ? { gl, canvas } : null;
    } catch {
        return null;
    }
}

function release(gl: Gl): void {
    try {
        const lose = gl.getExtension('WEBGL_lose_context');
        if (lose) lose.loseContext();
    } catch { }
}

function textParameter(gl: Gl, constant: number): string {
    try { return String(gl.getParameter(constant) ?? ''); } catch { return ''; }
}

export const collectWebgl= (ctx: any) => {
    const opened = openContext();
    if (!opened) return null;
    const { gl } = opened;
    try {
        let vendorUnmasked: string | null = null;
        let rendererUnmasked: string | null = null;
        const debug = gl.getExtension('WEBGL_debug_renderer_info');
        if (debug) {
            const c = debug as unknown as GlConstants;
            vendorUnmasked = textParameter(gl, c.UNMASKED_VENDOR_WEBGL) || null;
            rendererUnmasked = textParameter(gl, c.UNMASKED_RENDERER_WEBGL) || null;
        }

        const supported = (gl.getSupportedExtensions() || []).slice().sort();
        const unsupported = KNOWN_EXTENSIONS.filter((name) => supported.indexOf(name) === -1);

        const runs = ctx.browser.name === 'samsungbrowser' ? 3 : 1;
        const frames: Uint8Array[] = [];
        for (let i = 0; i < runs; i++) {
            const pixels = renderScene(gl);
            if (pixels) frames.push(pixels);
        }
        const pixelsHash = frames.length ? hashBytes(new Uint8Array(getCommonPixels(frames).buffer)) : hash('no-pixels');

        return {
            vendor: textParameter(gl, gl.VENDOR),
            vendor_unmasked: vendorUnmasked,
            renderer: textParameter(gl, gl.RENDERER),
            renderer_unmasked: rendererUnmasked,
            version: textParameter(gl, gl.VERSION),
            shading_language_version: textParameter(gl, gl.SHADING_LANGUAGE_VERSION),
            context_attributes_hash: hash(stableStringify(gl.getContextAttributes() || {})),
            parameters_hash: hash(stableStringify(readParameters(gl))),
            shader_precision_hash: hash(stableStringify(readShaderPrecision(gl))),
            extensions_hash: hash(stableStringify(supported)),
            extension_parameters_hash: hash(stableStringify(readExtensionParameters(gl))),
            unsupported_extensions: unsupported,
            pixels_hash: pixelsHash,
        };
    } finally { release(gl); }
};