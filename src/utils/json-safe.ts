/**
 * Validates whether a value contains only JSON-compatible data.
 * Types: null, booleans, finite numbers, strings, arrays, and plain objects.
 * Rejects unsupported types and values nested beyond the maximum depth.
 */

const MAX_DEPTH = 20;

// Checks whether a value is a valid JsonValue,
// within the allowed nesting depth.
export function isJsonValue(value: unknown, depth = 0): any {
    if (depth > MAX_DEPTH) { return false; }
    switch(typeof value) {
        case 'string':
        case 'boolean':
            return true;
        case 'number':
            return Number.isFinite(value);
        case 'object': {
            if (value === null) { return true; }
            if (Array.isArray(value)) { return value.every((item) => isJsonValue(item, depth + 1)); }
            const proto = Object.getPrototypeOf(value);
            if (proto !== Object.prototype && proto !== null) { return false; }
            return Object.keys(value as object).every((key) => isJsonValue((value as Record<string, unknown>)[key], depth + 1));
        }
        default:
            return false;
    }
}