/**
 * Provides hashing utilities using MurmurHash3 x64 128-bit and UTF-8 encoding.
 * Hexadecimal output, and base62 encoding for compact visitor IDs.
 * Example: jK5OamuKlQbEYJKJ, 7x01u8m5yBbQad4Syz3p
 */

import { encodeUtf8 } from './utf8';
import { murmur3x64_128 } from './murmur3-x64-128';

export { encodeUtf8, utf8ByteLength } from './utf8';
export { murmur3x64_128 } from './murmur3-x64-128';

const HEX = '0123456789abcdef';
const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

// A 128-bit number, needs 22 base62 digits (62^22 > 2^128), 
// Visitor ID default length: 20
export const MAX_BASE62_LENGTH = 22;
export const DEFAULT_VISITOR_ID_LENGTH = 20;

// Converts bytes to a lowercase hexadecimal string.
export function bytesToHex(bytes: Uint8Array): string {
    let out = '';
    for (let i = 0; i < bytes.length; i++) {
        out += HEX[bytes[i] >> 4] + HEX[bytes[i] & 15];
    }
    return out;
}

// Encodes bytes as base62,
// retaining the last `length` digits and padding with zeros if required.
export function bytesToBase62(bytes: Uint8Array, length = DEFAULT_VISITOR_ID_LENGTH): string {
    const work = Array.from(bytes);
    const digits: string[] = [];
    while (digits.length < length) {
        let remainder = 0;
        for (let i = 0; i < work.length; i++) {
            const acc = remainder * 256 + work[i];
            work[i] = Math.floor(acc / 62);
            remainder = acc % 62;
        }

        // Once the number is exhausted, this keeps adding '0'.
        digits.push(BASE62[remainder]);
    }
    return digits.reverse().join('');
}

// Hashes raw bytes using MurmurHash3 x64 128-bit and 
// Returns 32 lowercase hexadecimal characters.
export function hashBytes(bytes: Uint8Array, seed = 0): string {
    return bytesToHex(murmur3x64_128(bytes, seed));
}

// Hashes a UTF-8 encoded string and 
// Returns 32 lowercase hexadecimal characters.
export function hash(input: string, seed = 0): string {
    if (typeof input !== 'string') throw new TypeError('TypeError: hash() function expects a string.');
    return bytesToHex(murmur3x64_128(encodeUtf8(input), seed));
}

// Hashes a string and returns a base62-encoded string,
// Of the specified length for visitor IDs. ({ Important })
export function hashBase62(input: string, length = DEFAULT_VISITOR_ID_LENGTH, seed = 0) {
    if (typeof input !== 'string') throw new TypeError('TypeError: hashBase62() function expects a string.');
    return bytesToBase62(murmur3x64_128(encodeUtf8(input), seed), length);
}