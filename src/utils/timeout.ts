/**
 * Provides timeout handling for promises by rejecting operations that take
 * longer than the specified time limit, with a descriptive TimeoutError.
 */

// Represents an operation that exceeds its allowed time limit.
export class TimeoutError extends Error {
    readonly ms: number;
    constructor(ms: number, labelName = 'Operation') {
        super(`${labelName} timed out after ${ms}ms`);
        this.name = 'TimeoutError';
        this.ms = ms;
        Object.setPrototypeOf(this, TimeoutError.prototype);
    }
}

// Rejects request with a TimeoutError, if the promise does not settle,
// within the specified time frame.
export function withTimeout<T>(promise: Promise<T>, ms: number, labelName?: string)  {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => reject(new TimeoutError(ms, labelName)), ms);
        promise.then(
            (value) => { clearTimeout(timer); resolve(value); },
            (error) => { clearTimeout(timer); reject(error); },
        );
    });
}