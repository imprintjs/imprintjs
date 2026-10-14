// Returns a promise that resolves after the specified delay in milliseconds.
export function wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}