/**
 * Implements MurmurHash3 x64 128-bit hashing without *BigInt,
 * using 32-bit halves for 64-bit arithmetic and,
 * explicit little-endian byte order.
 */

const TWO_32 = 4294967296;

// 64-bit Multiplication constants,
// split into [high, low] halves.
const C1_HI = 0x87c37b91;
const C1_LO = 0x114253d5;
const C2_HI = 0x4cf5ad43;
const C2_LO = 0x2745937f;

// 64-bit Constants used in final mixing step,
// split into [high, low] halves.
const FMIX_1_HI = 0xff51afd7;
const FMIX_1_LO = 0xed558ccd;
const FMIX_2_HI = 0xc4ceb9fe;
const FMIX_2_LO = 0x1a85ec53;

// Scratch result of the 64-bit helpers.
// (avoids allocating a pair per operation)
let rHi = 0;
let rLo = 0;

// Multiplies two unsigned 64-bit values.
// (ah:al) * (bh:bl) mod 2^64 -> rHi:rLo
function mul64(ah: number, al: number, bh: number, bl: number): void {
    const a0 = al & 0xffff;
    const a1 = al >>> 16;
    const b0 = bl & 0xffff;
    const b1 = bl >>> 16;
    const p00 = a0 * b0;
    const mid = a0 * b1 + a1 * b0 + (p00 >>> 16);
    rLo = (((mid & 0xffff) << 16) | (p00 & 0xffff)) >>> 0;
    const carry = a1 * b1 + Math.floor(mid / 65536);
    rHi = (carry + Math.imul(ah, bl) + Math.imul(al, bh)) >>> 0;
}

// Adds two unsigned 64-bit values.
// (ah:al) + (bh:bl) mod 2^64 -> rHi:rLo
function add64(ah: number, al: number, bh: number, bl: number): void {
    const lo = al + bl;
    rLo = lo >>> 0;
    rHi = (ah + bh + (lo >= TWO_32 ? 1 : 0)) >>> 0;
}

// Rotates a 64-bit value to left by the specified number of bits.
// 1..63 bits -> rHi:rLo
function rotl64(hi: number, lo: number, bits: number): void {
    if (bits >= 32) {
        const t = hi; hi = lo; lo = t;
        bits -= 32;
    }
    if (bits === 0) {
        rHi = hi >>> 0; rLo = lo >>> 0;
        return;
    }
    rHi = ((hi << bits) | (lo >>> (32 - bits))) >>> 0;
    rLo = ((lo << bits) | (hi >>> (32 - bits))) >>> 0;
}

// Applies the MurmurHash3 64-bit finalization mix.
function fmix64(hi: number, lo: number): void {
    lo = (lo ^ (hi >>> 1)) >>> 0;
    mul64(hi, lo, FMIX_1_HI, FMIX_1_LO);
    hi = rHi; 
    lo = rLo;
    lo = (lo ^ (hi >>> 1)) >>> 0;
    mul64(hi, lo, FMIX_2_HI, FMIX_2_LO);
    hi = rHi;
    lo = rLo;
    rLo = (lo ^ (hi >>> 1)) >>> 0;
    rHi = hi;
}

// Reads an unsigned 32-bit integer from a byte array in little-endian order.
function readU32LE(bytes: Uint8Array, at: number): number {
    return (bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16) | (bytes[at + 3] << 24)) >>> 0;
}

// Writes an unsigned 32-bit integer to a byte array in little-endian order.
function writeU32LE(out: Uint8Array, at: number, value: number): void {
    out[at] = value & 0xff;
    out[at + 1] = (value >>> 8) & 0xff;
    out[at + 2] = (value >>> 16) & 0xff;
    out[at + 3] = (value >>> 24) & 0xff;
}

/**
 * Computes the MurmurHash3 x64 128-bit hash.
 * Returns its 16-byte little-endian digest.
 * @param seed unsigned 32-bit seed, default 0.
 */
export function murmur3x64_128(bytes: Uint8Array, seed = 0): Uint8Array {
    const seed32 = seed >>> 0;
    let h1h = 0;
    let h1l = seed32;
    let h2h = 0;
    let h2l = seed32;
    const length = bytes.length;
    const blockEnd = length - (length % 16);

    // Loop blockend
    for (let i = 0; i < blockEnd; i += 16) {
        const k1l = readU32LE(bytes, i);
        const k1h = readU32LE(bytes, i + 4);
        const k2l = readU32LE(bytes, i + 8);
        const k2h = readU32LE(bytes, i + 12);

        mul64(k1h, k1l, C1_HI, C1_LO); 
        rotl64(rHi, rLo, 31); 
        mul64(rHi, rLo, C2_HI, C2_LO);
        h1h = (h1h ^ rHi) >>> 0; 
        h1l = (h1l ^ rLo) >>> 0;
        rotl64(h1h, h1l, 27);
        add64(rHi, rLo, h2h, h2l);
        mul64(rHi, rLo, 0, 5); 
        add64(rHi, rLo, 0, 0x52dce729);
        h1h = rHi; 
        h1l = rLo;

        mul64(k2h, k2l, C2_HI, C2_LO); 
        rotl64(rHi, rLo, 33); 
        mul64(rHi, rLo, C1_HI, C1_LO);
        h2h = (h2h ^ rHi) >>> 0; 
        h2l = (h2l ^ rLo) >>> 0;
        rotl64(h2h, h2l, 31);
        add64(rHi, rLo, h1h, h1l);
        mul64(rHi, rLo, 0, 5); 
        add64(rHi, rLo, 0, 0x38495ab5);
        h2h = rHi; 
        h2l = rLo;
    }

    // Tail: the last (length % 16) bytes, little-endian, 
    // bytes 0-7 -> k1, 
    // bytes 8-15 -> k2
    const rem = length - blockEnd;
    if (rem > 0) {
        let k1l = 0;
        let k1h = 0;
        let k2l = 0;
        let k2h = 0;

        for (let i = 0; i < rem; i++) {
            const b = bytes[blockEnd + i];
            if (i < 4) { 
                k1l |= b << (8 * i);
            } else if (i < 8) {
                k1h |= b << (8 * (i - 4));
            } else if (i < 12) {
                k2l |= b << (8 * (i - 8));
            } else {
                k2h |= b << (8 * (i - 12));
            }
        }

        if (rem > 8) {
            mul64(k2h >>> 0, k2l >>> 0, C2_HI, C2_LO); 
            rotl64(rHi, rLo, 33); 
            mul64(rHi, rLo, C1_HI, C1_LO);
            h2h = (h2h ^ rHi) >>> 0; 
            h2l = (h2l ^ rLo) >>> 0;
        }

        mul64(k1h >>> 0, k1l >>> 0, C1_HI, C1_LO); 
        rotl64(rHi, rLo, 31); 
        mul64(rHi, rLo, C2_HI, C2_LO);
        h1h = (h1h ^ rHi) >>> 0; 
        h1l = (h1l ^ rLo) >>> 0;
    }

    // Finalization
    const lenLo = length >>> 0;
    const lenHi = Math.floor(length / TWO_32) >>> 0;
    h1h = (h1h ^ lenHi) >>> 0; 
    h1l = (h1l ^ lenLo) >>> 0;
    h2h = (h2h ^ lenHi) >>> 0; 
    h2l = (h2l ^ lenLo) >>> 0;

    add64(h1h, h1l, h2h, h2l); 
    h1h = rHi; 
    h1l = rLo;
    add64(h2h, h2l, h1h, h1l); 
    h2h = rHi; 
    h2l = rLo;
    fmix64(h1h, h1l); 
    h1h = rHi; 
    h1l = rLo;
    fmix64(h2h, h2l); 
    h2h = rHi; 
    h2l = rLo;
    add64(h1h, h1l, h2h, h2l); 
    h1h = rHi; 
    h1l = rLo;
    add64(h2h, h2l, h1h, h1l); 
    h2h = rHi; 
    h2l = rLo;

    const out = new Uint8Array(16);
    writeU32LE(out, 0, h1l); 
    writeU32LE(out, 4, h1h);
    writeU32LE(out, 8, h2l); 
    writeU32LE(out, 12, h2h);
    return out;
}