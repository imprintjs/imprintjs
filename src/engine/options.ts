import type { ImprintOptions, ResolvedOptions, StabilizeProfile } from '../types/options';
import { ImprintException } from './errors';

export const STABILIZE_PROFILES: readonly StabilizeProfile[] = ['private', 'iframe'];
export const MIN_TIMEOUT_MS = 100;
export const MAX_TIMEOUT_MS = 60000;

export const DEFAULT_OPTIONS: Readonly<ResolvedOptions> = Object.freeze({
    timeout: 5000,
    include: [] as string[],
    exclude: [] as string[],
    stabilize: ['private', 'iframe'] as StabilizeProfile[],
    performance: false,
});

const KNOWN_KEYS = ['timeout', 'include', 'exclude', 'stabilize', 'performance'];
function invalid(field: string, message: string): never {
    throw new ImprintException('invalid_options', `Invalid option "${field}": ${message}`, field);
}

// A dotted path: non-empty segments, 
// no spaces at the ends, no empty parts ("a..b", ".a", "a."). */
export function isValidPath(path: unknown): path is string {
    if (typeof path !== 'string' || path.length === 0 || path !== path.trim()) return false;
    return path.split('.').every((segment) => segment.length > 0);
}

function readPathList(field: 'include' | 'exclude', value: unknown): string[] {
    if (!Array.isArray(value)) invalid(field, 'must be an array of dotted paths like ["audio", "canvas.text_hash"]');
    const out: string[] = [];
    for (const item of value) {
        if (!isValidPath(item)) invalid(field, `"${String(item)}" is not a valid dotted path`);
        if (out.indexOf(item) === -1) out.push(item);
    }
    return out;
}

/**
 * Merges `input` over `base` (defaults unless given) and validates every field.
 * Unknown keys are rejected so a typo like `timout` is caught immediately.
 * Never mutates its inputs; the result owns fresh arrays.
 */
export function resolveOptions(input?: ImprintOptions, base: Readonly<ResolvedOptions> = DEFAULT_OPTIONS): ResolvedOptions {
    const result: ResolvedOptions = {
        timeout: base.timeout,
        include: base.include.slice(),
        exclude: base.exclude.slice(),
        stabilize: base.stabilize.slice(),
        performance: base.performance,
    };

    if (input === undefined || input === null) return result;
    if (typeof input !== 'object' || Array.isArray(input)) invalid('Options', 'must be an object');

    for (const key of Object.keys(input)) {
        if (KNOWN_KEYS.indexOf(key) === -1) invalid(key, `unknown option. Known options: ${KNOWN_KEYS.join(', ')}`);
    }

    if (input.timeout !== undefined) {
        const t = input.timeout;
        if (typeof t !== 'number' || !Number.isInteger(t) || t < MIN_TIMEOUT_MS || t > MAX_TIMEOUT_MS) {
            invalid('timeout', `must be an integer from ${MIN_TIMEOUT_MS} to ${MAX_TIMEOUT_MS} (milliseconds)`);
        }
        result.timeout = t;
    }

    if (input.include !== undefined) result.include = readPathList('include', input.include);

    if (input.exclude !== undefined) result.exclude = readPathList('exclude', input.exclude);

    if (input.stabilize !== undefined) {
        if (!Array.isArray(input.stabilize)) invalid('stabilize', 'must be an array');
        const profiles: StabilizeProfile[] = [];
        for (const p of input.stabilize) {
            if (STABILIZE_PROFILES.indexOf(p) === -1) invalid('stabilize', `"${String(p)}" is not a profile. Use: ${STABILIZE_PROFILES.join(', ')}`);
            if (profiles.indexOf(p) === -1) profiles.push(p);
        }
        result.stabilize = profiles;
    }

    if (input.performance !== undefined) {
        if (typeof input.performance !== 'boolean') invalid('performance', 'must be true or false');
        result.performance = input.performance;
    }

    return result;
}