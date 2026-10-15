import type { JsonObject, JsonValue } from '../types/json';
export interface FilterRules {
    include?: readonly string[];
    exclude?: readonly string[];
    keep?: readonly string[];
}

// True when `path` is `rule` itself or lives below it. 
// "audio.sample_hash" matches "audio". "audioX" does not.
export function pathMatches(path: string, rule: string): boolean {
    return path === rule || path.startsWith(rule + '.');
}

// True when some rule lives below `path` ("audio.sample_hash" is below "audio").
function hasRuleBelow(path: string, rules: readonly string[]): boolean {
    const prefix = path + '.';
    return rules.some((rule) => rule.startsWith(prefix));
}

function isPlainObject(value: JsonValue): value is JsonObject {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Returns a copy of `data` with the rules applied. Never mutates `data`.
 * - `include` (if not empty) keeps only matching paths; ancestors of matching paths stay as containers.
 * - `exclude` removes matching paths. Exclude beats include.
 * - `keep` rescues paths from `exclude`.
 * - Arrays and primitives are leaves. Objects left empty after filtering disappear.
 */
export function filterComponents(data: JsonObject, rules: FilterRules = {}): JsonObject {
    const include = rules.include || [];
    const exclude = rules.exclude || [];
    const keep = rules.keep || [];

    const covered = (path: string, list: readonly string[]): boolean => list.some((r) => pathMatches(path, r));
    const isExcluded = (path: string): boolean => covered(path, exclude) && !covered(path, keep);

    function walk(node: JsonObject, prefix: string): JsonObject {
        const out: JsonObject = {};
        for (const key of Object.keys(node)) {
            const path = prefix ? `${prefix}.${key}` : key;
            const value = node[key];

            const included = include.length === 0 || covered(path, include);
            const container = isPlainObject(value);
            if (!included && !(container && hasRuleBelow(path, include))) continue;

            if (container) {
                if (isExcluded(path) && !hasRuleBelow(path, keep)) continue;
                const child = walk(value, path);
                if (Object.keys(child).length > 0) out[key] = child;
            } else if (!isExcluded(path)) {
                out[key] = value;
            }
        }
        return out;
    }
    return walk(data, '');
}

// True when the whole top-level component `name` is switched off by include/exclude (so it need not run).
export function isComponentDisabled(name: string, rules: Pick<FilterRules, 'include' | 'exclude'>): boolean {
    const include = rules.include || [];
    const exclude = rules.exclude || [];
    if (exclude.some((r) => r === name)) return true;
    if (include.length === 0) return false;
    return !include.some((r) => pathMatches(name, r) || r.startsWith(name + '.'));
}