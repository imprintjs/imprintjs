import type { ImprintError, ImprintErrorCode, ImprintExceptionCode } from '../types/errors';
export type { ImprintError, ImprintErrorCode, ImprintExceptionCode } from '../types/errors';

// Builds a plain error record for `result.errors`.
export function createError(code: ImprintErrorCode, message: string, component?: string): ImprintError {
    const error: ImprintError = { code, message };
    if (component !== undefined) error.component = component;
    return error;
}

// Turns anything that was thrown into readable text.
export function describeError(error: unknown): string {
    if (error instanceof Error) return error.message || error.name;
    if (typeof error === 'string') return error;
    try { return JSON.stringify(error) ?? String(error); } catch { return String(error); }
}

// Thrown for developer mistakes (bad options, bad component registration). get() itself never throws.
export class ImprintException extends Error {
    readonly code: ImprintExceptionCode;
    readonly field?: string;
    constructor(code: ImprintExceptionCode, message: string, field?: string) {
        super(message);
        this.name = 'ImprintException';
        this.code = code;
        this.field = field;
        Object.setPrototypeOf(this, ImprintException.prototype);
    }
}