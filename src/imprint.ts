import { BUILTIN_COMPONENTS, isBuiltinName } from './components';
import { createError, ImprintException } from './engine/errors';
import { filterComponents, isComponentDisabled } from './engine/filter';
import { DEFAULT_OPTIONS, resolveOptions } from './engine/options';
import { runPipeline } from './engine/pipeline';
import { getHashExclusions } from './engine/stabilize';
import { hashBase62 } from './hash';
import { stableStringify } from './serialize';
import type { Collector, CollectContext, PipelineEntry } from './types/component';
import type { ImprintError } from './types/errors';
import type { JsonObject } from './types/json';
import type { ImprintOptions, ResolvedOptions } from './types/options';
import type { ImprintComponents, ImprintResult } from './types/response';
import { detectBrowser } from './utils/browser';
import { __SDK_NAME__, __SDK_VERSION__ } from './utils/version';

export const MESSAGE = 'Try ImprintJS Pro, It adds visitor identification, IP intelligence, TLS, and smart signals. Learn more: https://imprintjs.com/pro';
export const HASH_SCHEMA = 'imprintjs:v1|';
const COMPONENT_NAME = /^[a-z][a-z0-9_]{0,31}$/;

export class Imprint {
    private options: ResolvedOptions = resolveOptions();
    private readonly custom = new Map<string, Collector>();

    // `new ImprintJS.init(options?)`. Throws ImprintException for invalid options.
    constructor(options?: ImprintOptions) {
        this.init(options);
    }

    // Applies options on top of the current ones (validated). Returns `this` for chaining.
    init(options?: ImprintOptions): this {
        this.options = resolveOptions(options, this.options);
        return this;
    }

    // Adds your own component. Its result appears under `components[name]` and joins the visitor hash. 
    register(name: string, collector: Collector): this {
        if (typeof name !== 'string' || !COMPONENT_NAME.test(name)) {
            throw new ImprintException('invalid_component', `Component name "${String(name)}" must match ${COMPONENT_NAME}`, 'name');
        }
        if (isBuiltinName(name)) {
            throw new ImprintException('invalid_component', `"${name}" is a built-in component and cannot be replaced`, 'name');
        }
        if (this.custom.has(name)) {
            throw new ImprintException('invalid_component', `Component "${name}" is already registered`, 'name');
        }
        if (typeof collector !== 'function') {
            throw new ImprintException('invalid_component', `Collector for "${name}" must be a function`, 'collector');
        }
        this.custom.set(name, collector);
        return this;
    }

    version(): string {
        return __SDK_VERSION__;
    }

    // Collects the signals and resolves with the response. 
    // Never rejects for runtime problems.
    async get(overrides?: ImprintOptions): Promise<ImprintResult> {
        const options = resolveOptions(overrides, this.options);
        const startedAt = Date.now();
        const errors: ImprintError[] = [];
        const g = globalThis as { navigator?: unknown; document?: unknown; location?: { href?: string } };

        let values: JsonObject = {};
        let elapsed: Record<string, number> = {};
        let visitorId = '';

        if (typeof g.navigator === 'undefined' || typeof g.document === 'undefined') {
            errors.push(createError('environment', 'ImprintJS must run in a browser (navigator/document not found)'));
        } else {
            const browser = detectBrowser();
            const ctx: CollectContext = { options, browser };
            const result = await runPipeline(this.entriesFor(options), ctx, options.timeout);
            errors.push(...result.errors);
            elapsed = result.elapsed;

            // 1) What the user sees: user include/exclude only.
            const sorted: JsonObject = {};
            for (const key of Object.keys(result.values).sort()) sorted[key] = result.values[key];
            values = filterComponents(sorted, { include: options.include, exclude: options.exclude });

            // 2) What gets hashed: also drop unstable signals, unless the user explicitly included them.
            const stable = filterComponents(values, {
                exclude: getHashExclusions(browser, options.stabilize),
                keep: options.include,
            });
            if (Object.keys(stable).length === 0) {
                errors.push(createError('empty_fingerprint', 'No stable signals were collected, so no visitor_id was created'));
            } else {
                visitorId = hashBase62(HASH_SCHEMA + stableStringify(stable));
            }
        }

        const url = (g.location && g.location.href) || '';
        const response: ImprintResult = {
            timestamp: startedAt,
            version: __SDK_VERSION__,
            identification: { visitor_id: visitorId },
            request: { url },
            components: values as ImprintComponents,
            message: MESSAGE,
        };

        if (options.performance) {
            elapsed._total = Date.now() - startedAt;
            response.elapsed = elapsed;
        }

        return response;
    }

    // Built-in + custom components that are not switched off by include/exclude.
    private entriesFor(options: ResolvedOptions): PipelineEntry[] {
        const all: PipelineEntry[] = Object.keys(BUILTIN_COMPONENTS).map((name) => ({
            name, collect: (BUILTIN_COMPONENTS as unknown as Record<string, Collector>)[name],
        }));
        this.custom.forEach((collect, name) => all.push({ name, collect }));
        return all.filter((e) => !isComponentDisabled(e.name, options));
    }
}

// `new ImprintJS.init(options)` is the same class as `new ImprintJS.Imprint(options)`.
export const init = Imprint;
export { DEFAULT_OPTIONS };