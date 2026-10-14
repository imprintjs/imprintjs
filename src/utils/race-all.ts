/**
 * Runs multiple tasks concurrently and 
 * records each result without rejecting the overall promise. 
 * Tasks can complete successfully, time out, or fail.
 */

import { TimeoutError, withTimeout } from './timeout';

// Returns the status, result or error, 
// and elapsed time for a completed task.
export type Settled<T> = 
    | { status: 'fulfilled'; value: T; elapsed: number }
    | { status: 'timeout'; elapsed: number }
    | { status: 'rejected'; error: unknown; elapsed: number };

// Returns the current time in milliseconds,
// using a monotonic clock when available.
function now(): number {
    const perf = (globalThis as { performance?: { now(): number } }).performance;
    return perf ? perf.now() : Date.now();
}

/**
 * Runs all tasks concurrently and returns their results, recording successes,
 * timeouts, and failures without rejecting the overall promise.
 * Also catches synchronous errors thrown by tasks.
 */
export function raceAll<T>(tasks: Array<() => T | Promise<T>>, timeoutMs: number) {
    return Promise.all(tasks.map(async (task) => {
        const start = now();
        try {
            const value = await withTimeout(Promise.resolve().then(task), timeoutMs);
            return { status: 'fulfilled', value, elapsed: now() - start };
        } catch (error) {
            const elapsed = now() - start;
            if (error instanceof TimeoutError) {
                return { status: 'timeout', elapsed };
            }
            return { status: 'rejected', error, elapsed };
        }
    }));
}