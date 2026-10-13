import { readFileSync } from 'node:fs';
import replace from '@rollup/plugin-replace';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';

// It reads package metadata for build configuration and versioning.
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// Adds package name, version, copyright and license information to each bundle.
// It makes generated files easier to identify.
const startYear = 2026;
const currentYear = new Date().getFullYear();
const copyrightYear = startYear === currentYear ? `${startYear}` : `${startYear} - ${currentYear}`;
const banner = `/*! ${pkg.name} v${pkg.version} | (c) ${copyrightYear} ${pkg.author} | ${pkg.license} License */`;

/**
 * Configures TypeScript compilation and package version replacement.
 * @param extra - Optional: TypeScript settings for a specific build.
 * @returns Rollup plugins needed to compile the SDK.
 */
const compile = (extra = {}) => [
    typescript({ tsconfig: './tsconfig.build.json', ...extra }),
    replace({
        preventAssignment: true,
        values: { __SDK_VERSION__: JSON.stringify(pkg.version) },
    }),
];

// Configures CJS (require), ESM (import), UMD (unpkg), and TypeScript declaration outputs.
export default [
    {
        input: 'src/index.ts',
        output: [
            { file: pkg.main, format: 'cjs', exports: 'named', sourcemap: true, banner, plugins: [terser()] },
            { file: pkg.module, format: 'es', sourcemap: true, banner, plugins: [terser()] }
        ],
        plugins: compile({ declaration: true, declarationDir: 'dist/types' }),
    },
    {
        input: 'src/index.ts',
        output: { file: pkg.unpkg, format: 'umd', name: 'ImprintJS', exports: 'named', sourcemap: true, banner },
        plugins: [...compile(), terser()],
    },
    {
        input: 'src/index.ts',
        output: { file: pkg.types, format: 'es' },
        plugins: [dts()],
    }
];