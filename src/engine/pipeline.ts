import type { CollectContext, PipelineEntry } from '../types/component';
import type { ImprintError } from '../types/errors';
import type { JsonValue } from '../types/json';
import { isJsonValue } from '../utils/json-safe';
import { raceAll } from '../utils/race-all';
import { createError, describeError } from './errors';

export interface PipelineResult {
    values: Record<string, JsonValue>;
    errors: ImprintError[];
    elapsed: Record<string, number>;
}

/**
 * Runs all components at the same time, each with its own timeout.
 * One slow or broken component never stops the others and this function never rejects.
 */
export async function runPipeline(entries: readonly PipelineEntry[], ctx: CollectContext, timeoutMs: number): Promise<PipelineResult> {
    const settled = await raceAll(entries.map((entry) => () => entry.collect(ctx)), timeoutMs);

    const values: Record<string, JsonValue> = {};
    const errors: ImprintError[] = [];
    const elapsed: Record<string, number> = {};

    settled.forEach((result, index) => {
        const name = entries[index].name;
        elapsed[name] = Math.round(result.elapsed * 100) / 100;

        if (result.status === 'timeout') {
            errors.push(createError('component_timeout', `Component "${name}" did not finish within ${timeoutMs}ms`, name));
        } else if (result.status === 'rejected') {
            errors.push(createError('component_error', `Component "${name}" failed: ${describeError(result.error)}`, name));
        } else if (result.value === null || result.value === undefined) {
            errors.push(createError('component_unsupported', `Component "${name}" is not supported by this browser`, name));
        } else if (!isJsonValue(result.value)) {
            errors.push(createError('component_error', `Component "${name}" returned data that is not plain JSON`, name));
        } else {
            values[name] = result.value;
        }
    });
    return { values, errors, elapsed };
}