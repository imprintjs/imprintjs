import type { BuiltinComponents } from './components';
import type { JsonValue } from './json';

export type ImprintComponents = BuiltinComponents & { [custom: string]: JsonValue | undefined };

export interface ImprintResponse {
    timestamp: number;
    version: string;
    identification: { visitor_id: string; };
    request: { url: string };
    components: ImprintComponents;
    elapsed?: Record<string, number>;
    message: string;
}

export type ImprintResult = ImprintResponse & { [extra: string]: unknown };