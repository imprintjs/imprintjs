import type { PluginEntry } from '../../types/components';

// Plugins: the browser's plugin list with each plugin's MIME types, sorted so order never matters.
interface MimeLike { type: string; suffixes: string }
interface PluginLike { name: string; description: string; length: number; [index: number]: MimeLike }

const byText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

export function readPlugin(plugin: PluginLike): PluginEntry {
    const mimeTypes: PluginEntry['mime_types'] = [];
    for (let i = 0; i < plugin.length; i++) {
        const mime = plugin[i];
        if (mime) mimeTypes.push({ type: String(mime.type), suffixes: String(mime.suffixes) });
    }
    mimeTypes.sort((a, b) => byText(a.type, b.type));
    return { name: String(plugin.name), description: String(plugin.description), mime_types: mimeTypes };
}

export const collectPlugins = () => {
    const nav = (globalThis as { navigator?: { plugins?: ArrayLike<PluginLike> } }).navigator;
    const list = nav && nav.plugins;
    if (!list) return [];
    const entries: PluginEntry[] = [];
    for (let i = 0; i < list.length; i++) if (list[i]) entries.push(readPlugin(list[i]));
    entries.sort((a, b) => byText(a.name, b.name) || byText(a.description, b.description));
    return entries;
};