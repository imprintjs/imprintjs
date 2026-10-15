import { collectAudio } from './audio';
import { collectCanvas } from './canvas';
import { collectFonts } from './fonts';
import { collectHardware } from './hardware';
import { collectLocales } from './locales';
import { collectMath } from './math';
import { collectPlugins } from './plugins';
import { collectScreen } from './screen';
import { collectSpeech } from './speech';
import { collectSystem } from './system';
import { collectWebgl } from './webgl';
import { collectWebrtc } from './webrtc';

// The 12 built-in components, in alphabetical order (the order they appear in the response).
export const BUILTIN_COMPONENTS = {
    audio: collectAudio,
    canvas: collectCanvas,
    fonts: collectFonts,
    hardware: collectHardware,
    locales: collectLocales,
    math: collectMath,
    plugins: collectPlugins,
    screen: collectScreen,
    speech: collectSpeech,
    system: collectSystem,
    webgl: collectWebgl,
    webrtc: collectWebrtc,
} as const;

export type BuiltinName = keyof typeof BUILTIN_COMPONENTS;
export const BUILTIN_NAMES = Object.keys(BUILTIN_COMPONENTS) as BuiltinName[];

export function isBuiltinName(name: string): name is BuiltinName {
    return Object.prototype.hasOwnProperty.call(BUILTIN_COMPONENTS, name);
}

export const builtinCollectors = BUILTIN_COMPONENTS;
export {
    collectAudio,
    collectCanvas, 
    collectFonts, 
    collectHardware, 
    collectLocales, 
    collectMath,
    collectPlugins, 
    collectScreen, 
    collectSpeech, 
    collectSystem, 
    collectWebgl, 
    collectWebrtc,
};