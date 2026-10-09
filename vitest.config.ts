import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

/**
 * Package metadata required by the test configuration.
 * The version is read from `package.json` to keep the SDK version
 * consistent with the package metadata.
 */
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string};
export default defineConfig({
    define: { __SDK_VERSION__: JSON.stringify(pkg.version) },
    test: {
        environment: 'jsdom',
        include: ['test/**/*.test.ts'],
    },
});