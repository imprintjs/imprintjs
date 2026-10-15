import { withTimeout } from '../../utils/timeout';

/**
 * Hardware: CPU architecture hint, core count, memory, JS heap limit and battery.
 * Battery values are reported but excluded from the visitor hash (they change all the time).
 */
const BATTERY_TIMEOUT_MS = 500;

/**
 * Infinity - Infinity is NaN, and the bit pattern of that NaN differs by CPU family
 * (sign bit set on x86, clear on ARM). We read the top byte of the 32-bit word, which does not
 * depend on the byte order of the machine: 255 on x86, 127 on ARM.
 */
export function detectArchitecture(): number {
    const f = new Float32Array(1);
    f[0] = Infinity;
    f[0] = f[0] - f[0];
    return new Uint32Array(f.buffer)[0] >>> 24;
}

interface BatteryLike { level: number; charging: boolean }

async function readBattery(): Promise<{ level: number | null; charging: boolean | null }> {
    const nav = (globalThis as { navigator?: { getBattery?: () => Promise<BatteryLike> } }).navigator;
    if (!nav || typeof nav.getBattery !== 'function') return { level: null, charging: null };
    try {
        const battery = await withTimeout(nav.getBattery(), BATTERY_TIMEOUT_MS, 'getBattery');
        const level = typeof battery.level === 'number' && Number.isFinite(battery.level) ? Math.round(battery.level * 100) : null;
        return { level, charging: typeof battery.charging === 'boolean' ? battery.charging : null };
    } catch {
        return { level: null, charging: null };
    }
}

function finiteOrNull(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export const collectHardware = async () => {
    const g = globalThis as {
        navigator?: { hardwareConcurrency?: number; deviceMemory?: number };
        performance?: { memory?: { jsHeapSizeLimit?: number } };
    };
    const battery = await readBattery();
    return {
        architecture: detectArchitecture(),
        hardware_concurrency: finiteOrNull(g.navigator && g.navigator.hardwareConcurrency) ?? 0,
        device_memory: finiteOrNull(g.navigator && g.navigator.deviceMemory),
        js_heap_size_limit: finiteOrNull(g.performance && g.performance.memory && g.performance.memory.jsHeapSizeLimit),
        battery_level: battery.level,
        battery_charging: battery.charging,
    };
};