/**
 * Encodes strings as UTF-8 without relying on `TextEncoder`.
 * Handles surrogate pairs and replaces unpaired surrogates with U+FFFD,
 */

// Checks whether a UTF-16 code unit is a low surrogate.
function isLowSurrogate(unit: number): boolean {
    return unit >= 0xdc00 && unit <= 0xdfff;
}

// It returns the number of UTF-8 bytes required to encode the given string.
export function utf8ByteLength(text: string): number {
    let bytes = 0;
    for (let i = 0; i < text.length; i++) {
        const unit = text.charCodeAt(i);
        if (unit < 0x80) {
            bytes += 1;
        } else if (unit < 0x800) {
            bytes += 2;
        } else if (unit >= 0xd800 && unit <= 0xdbff && isLowSurrogate(text.charCodeAt(i + 1))) {
            bytes += 4;
            i++;
        } else {
           bytes += 3; 
        }
    }
    return bytes;
}

// Encodes a string into UTF-8 bytes, replacing unpaired surrogates with U+FFFD.
export function encodeUtf8(text: string): Uint8Array {
    const out = new Uint8Array(utf8ByteLength(text));
    let pos = 0;
    for (let i = 0; i < text.length; i++) {
        let cp = text.charCodeAt(i);

        if (cp >= 0xd800 && cp <= 0xdfff) {
            const next = text.charCodeAt(i + 1);
            if (cp <= 0xdbff && isLowSurrogate(next)) {
                cp = 0x10000 + ((cp - 0xd800) << 10) + (next - 0xdc00);
                i++;
            } else {

                // Lone surrogate
                cp = 0xfffd;
            }
        }

        if (cp < 0x80) {
            out[pos++] = cp;
        } else if (cp < 0x800) {
            out[pos++] = 0xc0 | (cp >> 6);
            out[pos++] = 0x80 | (cp & 0x3f);
        } else if (cp < 0x10000) {
            out[pos++] = 0xe0 | (cp >> 12);
            out[pos++] = 0x80 | ((cp >> 6) & 0x3f);
            out[pos++] = 0x80 | (cp & 0x3f);
        } else {
            out[pos++] = 0xf0 | (cp >> 18);
            out[pos++] = 0x80 | ((cp >> 12) & 0x3f);
            out[pos++] = 0x80 | ((cp >> 6) & 0x3f);
            out[pos++] = 0x80 | (cp & 0x3f);
        }
    }
    return out;
}