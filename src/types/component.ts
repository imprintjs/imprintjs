import type { BrowserInfo } from './browser';
import type { JsonValue } from './json';
import type { ResolvedOptions } from './options';

// Read-only context handed to every component.
export interface CollectContext {
    readonly options: Readonly<ResolvedOptions>;
    readonly browser: Readonly<BrowserInfo>;
}

/**
 * A component collector. Return JSON data, or `null` when the browser lacks the API.
 * Throwing / rejecting is allowed: the pipeline turns it into a `component_error`.
 */
export type Collector<T extends JsonValue = JsonValue> = (ctx: CollectContext) => T | null | Promise<T | null>;
export interface PipelineEntry {
    name: string;
    collect: Collector;
}