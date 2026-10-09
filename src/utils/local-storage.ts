/**
 * Reads a value from localStorage.
 * Returns null if the key does not exist or storage is unavailable.
 *
 * @param key - The key to read.
 * @returns The stored value, or null if unavailable.
 */
export function read(key: string): string | null {
    try {
        return window.localStorage.getItem(key);
    } catch (error) {
        return null;
    }
}

/**
 * Creates or overwrites a value in localStorage.
 * Storage failures are ignored because persistence is optional.
 *
 * @param key - The key to write.
 * @param value - The value to store.
 */
export function write(key: string, value: string): void {
    try {
        window.localStorage.setItem(key, value)
    } catch (error) {}
}

/**
 * Updates an existing value in localStorage without creating a missing key.
 * The new value can be provided directly or computed from the current value.
 *
 * @param key - The key to update.
 * @param next - The replacement value or a function that returns the updated value.
 * @returns True if the value was written, false if the key was missing or storage failed.
 */
export function edit(key: string, next: string | ((current: string) => string)): boolean {
    try {
        const current = window.localStorage.getItem(key);
        if (current === null) return false;

        // Set items
        const value = typeof next === "function" ? next(current) : next;
        window.localStorage.setItem(key, value);
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Removes an existing value from localStorage.
 *
 * @param key - The key to remove.
 * @returns True if the key existed and was removed, false if it was missing or storage failed.
 */
export function remove(key: string): boolean {
    try {
        if (window.localStorage.getItem(key) === null) return false;
        window.localStorage.removeItem(key);
        return true;
    } catch (error) {
        return false;
    }
}