export type StabilizeProfile = 'private' | 'iframe';

export interface ImprintOptions {
    timeout?: number;
    include?: string[];
    exclude?: string[];
    stabilize?: StabilizeProfile[];
    performance?: boolean;
}

export interface ResolvedOptions {
    timeout: number;
    include: string[];
    exclude: string[];
    stabilize: StabilizeProfile[];
    performance: boolean;
}