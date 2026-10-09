import { readFileSync } from 'node:fs';
import replace from '@rollup/plugin-replace';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';

/**
 * Package metadata used to configure build outputs and version information.
 * Reading these values from `package.json` keeps the generated bundles
 * aligned with the package's declared name, version, and entry points.
 */
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

/**
 * Add package name, version, copyright, and license information to each bundle.
 * This makes generated files easier to identify.
 */
const startYear = 2026;
const currentYear = new Date().getFullYear();
const copyrightYear = startYear === currentYear ? `${startYear}` : `${startYear} - ${currentYear}`;
const banner = `/*! ${pkg.name} v${pkg.version} | (c) ${copyrightYear} ${pkg.author} | ${pkg.license} License */`;

/**
 * Set up the rollup plugins used to compile the SDK.
 * TypeScript runs first to compile the source files.
 * The replace plugin then inserts the package version wherever.
 * __SDK_VERSION__ appears in the compiled code.
 *
 * @param extra - Optional: TypeScript settings for a specific build.
 * @returns The plugins needed to compile the SDK.
 */
const compile = (extra = {}) => [
    typescript({ tsconfig: './tsconfig.build.json', ...extra }),
    replace({
        preventAssignment: true,
        values: { __SDK_VERSION__: JSON.stringify(pkg.version) },
    }),
];

/**
 * Configure the three outputs published by ImprintJS:
 * 1. ESM and CommonJS bundles for JavaScript tools and applications.
 * 2. A UMD bundle for browsers using script tags or CDNs.
 * 3. A single TypeScript declaration file for TypeScript users.
 */
export default [
    {
        input: 'src/index.ts',
        output: [
            { file: pkg.module, format: 'es', sourcemap: true, banner, plugins: [terser()] },
            { file: pkg.main, format: 'cjs', exports: 'named', sourcemap: true, banner, plugins: [terser()] }
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
    },
];