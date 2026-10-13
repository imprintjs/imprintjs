/**
 * Converts a value into a JSON string with object keys sorted alphabetically,
 * so the same data always produces the same string and same hash.
 *
 * Handles special values, supports toJSON(), and detects circular references
 * and data nested deeper than the allowed limit.
 * 
 * Rules:
 * - Object keys are sorted by UTF-16 code unit order.
 * - Undefined, functions, and symbols are skipped in objects and become null in arrays.
 * - NaN and infinities become null; -0 becomes 0.
 * - BigInt throws TypeError.
 * - Circular references throw TypeError.
 * - Nesting deeper than MAX_DEPTH throws RangeError.
 */

export const MAX_DEPTH = 100;

// Serializes a value into deterministic JSON,
// Returning an empty string for unsupported top-level values.
export function stableStringify(value: unknown): string {
    const result = write(value, [], 0, '');
    return result === undefined ? '' : result;
}

// Recursively serializes values with sorted keys and
// circular-reference and depth checks.
function write(input: unknown, ancestors: object[], depth: number, key: string): string | undefined {
    let value = input;

    // Match JSON.stringify by passing the property's key to `toJSON()`
    if (value !== null && typeof value === 'object' && typeof (value as { toJSON?: unknown }).toJSON === 'function') {
        value = (value as { toJSON(key: string): unknown }).toJSON(key);
    }

    // Skip unsupported values, BigInt cannot be serialized as JSON.
    switch (typeof value) {
        case 'undefined':
        case 'function':
        case 'symbol':
            return undefined;
        case 'bigint':
            throw new TypeError('stableStringify() cannot serialize a BigInt.');
        case 'number':
            return Number.isFinite(value) ? String(value === 0 ? 0 : value) : 'null';
        case 'string':
        case 'boolean':
            return JSON.stringify(value);
    }

    if (value === null) return 'null';
    const node = value as object;

    // Prevent excessively deep recursion.
    if (depth >= MAX_DEPTH) {
        throw new RangeError(`stableStringify(): nesting deeper than ${MAX_DEPTH}.`);
    }

    // Prevent excessively circular references.
    if (ancestors.indexOf(node) !== -1) {
        throw new TypeError('stableStringify(): circular reference.');
    }
    ancestors.push(node);

    // Serialize arrays in order and objects with sorted keys for consistent output.
    let out: string;
    if (Array.isArray(node)) {
        const parts: string[] = [];
        for (let i = 0; i < node.length; i++) {
            const item = write(node[i], ancestors, depth + 1, String(i));
            parts.push(item === undefined ? 'null' : item);
        }
        out = '[' + parts.join(',') + ']';
    } else {
        const record = node as Record<string, unknown>;
        const parts: string[] = [];
        for (const key of Object.keys(record).sort()) {
            const item = write(record[key], ancestors, depth + 1, key);
            if (item !== undefined) {
                parts.push(JSON.stringify(key) + ':' + item);
            }
        }
        out = '{' + parts.join(',') + '}';
    }

    // Remove the current object so shared references remain valid and,
    // Return.
    ancestors.pop();
    return out;
}