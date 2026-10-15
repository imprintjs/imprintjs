export type AudioComponent = {
    sample_hash: number;
    sample_rate: number | null;
    base_latency: number | null;
    max_channels: number;
    channel_count_mode: string;
    oscillator_hash: string;
};

export type CanvasComponent = {
    winding: boolean;
    geometry_hash: string;
    text_hash: string;
    emoji_hash: string;
};

export type FontsComponent = {
    count: number;
    hash: string;
    detected: { [font: string]: number };
};

export type HardwareComponent = {
    architecture: number;
    hardware_concurrency: number;
    device_memory: number | null;
    js_heap_size_limit: number | null;
    battery_level: number | null;
    battery_charging: boolean | null;
};

export type LocalesComponent = {
    language: string;
    languages: string[];
    timezone_offset: string;
};

export type MathComponent = {
    acos: number | null; 
    asin: number | null; 
    atan: number | null; 
    atan2: number | null;
    cos: number | null; 
    sin: number | null; 
    tan: number | null;
    exp: number | null; 
    log: number | null; 
    pow: number | null; 
    sqrt: number | null;
    sinh: number | null; 
    cosh: number | null; 
    tanh: number | null;
    large_cos: number | null; 
    large_sin: number | null; 
    large_tan: number | null;
};

export type PluginMimeType = { type: string; suffixes: string };
export type PluginEntry = { name: string; description: string; mime_types: PluginMimeType[] };
export type PluginsComponent = PluginEntry[];

export type ScreenComponent = {
    resolution: [number, number];
    color_depth: number;
    touchscreen: boolean;
    max_touch_points: number;
    media_queries: string[];
};

export type SpeechComponent = {
    has_speech_synthesis: boolean;
    voice_count: number;
    local_voice_count: number;
    remote_voice_count: number;
    default_voice_uri: string | null;
    languages_hash: string;
    voices_hash: string;
    hash: string;
};

export type SystemComponent = {
    product: string;
    product_sub: string;
    vendor: string;
    platform: string;
    cookies_enabled: boolean;
    session_storage: boolean;
    local_storage: boolean;
    indexed_db: boolean;
};

export type WebglComponent = {
    vendor: string;
    vendor_unmasked: string | null;
    renderer: string;
    renderer_unmasked: string | null;
    version: string;
    shading_language_version: string;
    context_attributes_hash: string;
    parameters_hash: string;
    shader_precision_hash: string;
    extensions_hash: string;
    extension_parameters_hash: string;
    unsupported_extensions: string[];
    pixels_hash: string;
};

export type WebrtcCodecs = { codec_count: number; codecs_hash: string };
export type WebrtcComponent = {
    supported: boolean;
    stun_supported: boolean;
    local_ip_leak: boolean;
    data_channel_supported: boolean;
    candidate_type: string | null;
    audio: WebrtcCodecs;
    video: WebrtcCodecs;
    extensions_hash: string;
    sdp_hash: string;
    hash: string;
};

export interface BuiltinComponents {
    audio?: AudioComponent;
    canvas?: CanvasComponent;
    fonts?: FontsComponent;
    hardware?: HardwareComponent;
    locales?: LocalesComponent;
    math?: MathComponent;
    plugins?: PluginsComponent;
    screen?: ScreenComponent;
    speech?: SpeechComponent;
    system?: SystemComponent;
    webgl?: WebglComponent;
    webrtc?: WebrtcComponent;
}