/**
 * Math: engines (and CPUs) round transcendental functions slightly differently.
 * asin/cos/sin/tan are integrated numerically (midpoint rule, 97 steps), which amplifies those
 * last-digit differences. The "large_*" values use arguments far outside the normal range.
 */

const STEPS = 97;

export function integrate(fn: (x: number) => number, from: number, to: number, steps: number = STEPS): number {
    const width = (to - from) / steps;
    let area = 0;
    for (let i = 0; i < steps; i++) area += fn(from + (i + 0.5) * width);
    return area * width;
}

function finite(value: number): number | null {
    return Number.isFinite(value) ? value : null;
}

export const collectMath = () => ({
    acos: finite(Math.acos(0.5)),
    asin: finite(integrate(Math.asin, -1, 1)),
    atan: finite(Math.atan(0.5)),
    atan2: finite(Math.atan2(1, 1)),
    cos: finite(integrate(Math.cos, 0, Math.PI)),
    sin: finite(integrate(Math.sin, -Math.PI, Math.PI)),
    tan: finite(integrate(Math.tan, 0, 2 * Math.PI)),
    exp: finite(Math.exp(1)),
    log: finite(Math.log(2)),
    pow: finite(Math.pow(Math.PI, -100)),
    sqrt: finite(Math.sqrt(2)),
    sinh: finite(Math.sinh(1)),
    cosh: finite(Math.cosh(1)),
    tanh: finite(Math.tanh(1)),
    large_cos: finite(Math.cos(1e20)),
    large_sin: finite(Math.sin(1e20)),
    large_tan: finite(Math.tan(1e20)),
});