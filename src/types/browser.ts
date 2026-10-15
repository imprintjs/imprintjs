export type BrowserName = | 'chrome' | 'edge' | 'firefox' | 'safari' | 'opera' | 'samsungbrowser'| 'vivaldi' | 'brave' | 'ie' | 'unknown';
export type EngineName = 'blink' | 'webkit' | 'gecko' | 'trident' | 'unknown';
export type OsName = 'windows' | 'macos' | 'ios' | 'android' | 'linux' | 'unknown';

// What the SDK knows about the running browser. Used only for stability rules, never reported.
export interface BrowserInfo {
    name: BrowserName;
    version: string;
    major: number;
    engine: EngineName;
    os: OsName;
    osMajor: number;
    mobile: boolean;
}