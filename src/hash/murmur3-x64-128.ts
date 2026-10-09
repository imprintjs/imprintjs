/**
 * Implements MurmurHash3 x64 128-bit hashing.
 *
 * MurmurHash3 is a non-cryptographic hash function that produces a
 * `128-bit` result. ImprintJS uses this implementation to generate a
 * consistent hash from input data.
 *
 * JavaScript does not provide convenient, universally supported unsigned
 * `64-bit` integer arithmetic for this implementation. Each `64-bit` value is
 * therefore stored as two `32-bit` halves in a Uint32Array:
 * - Index 0 stores the high 32 bits.
 * - Index 1 stores the low 32 bits.
 *
 * The final hash is returned as 32 lowercase hexadecimal characters.
 * Any server implementation that needs matching results must use the
 * same algorithm, seed, input encoding, and output format.
 *
 * Reference: https://github.com/aappleby/smhasher
 */

// String input is encoded as `UTF-8` before hashing. 
// Byte-array input is hashed directly, and the original input is never modified.
export type HashInput = string | Uint8Array | Uint8ClampedArray;

// A `64-bit` unsigned integer as [high32, low32].
type U64 = Uint32Array;

// Two multiplication constants of the algo, split into [high, low] halves.
const C1_HI = 0x87c37b91;
const C1_LO = 0x114253d5;
const C2_HI = 0x4cf5ad43;
const C2_LO = 0x2745937f;

// Constants used by the final mixing step.
const FMIX_1_HI = 0xff51afd7;
const FMIX_1_LO = 0xed558ccd;
const FMIX_2_HI = 0xc4ceb9fe;
const FMIX_2_LO = 0x1a85ec53;

// Creates a `64-bit` value from its high and low `32-bit` halves.
function u64(high = 0, low = 0): U64 {
    return new Uint32Array([high, low]);
}

// Calculates the upper {high} 32 bits of an unsigned `32-bit` multiplication.
function mulHigh32(a: number, b: number): number {
    const a0 = a & 0xffff;
    const a1 = a >>> 16;
    const b0 = b & 0xffff;
    const b1 = b >>> 16;

    const p00 = a0 * b0;
    const p01 = a0 * b1;
    const p10 = a1 * b0;
    const p11 = a1 * b1;

    const carry = ((p00 >>> 16) + (p01 & 0xffff) + (p10 & 0xffff)) >>> 16;
    return (p11 + (p01 >>> 16) + (p10 >>> 16) + carry) >>> 0;
}

// Multiplies a `64-bit` value by another `64-bit` value, 
// keeping only the lower 64 bits of the result. ({ x = x * (high:low) mod 2^64 })
function mul(x: U64, high: number, low: number): void {
    const xHigh = x[0];
    const xLow = x[1];
    x[0] = mulHigh32(xLow, low) + Math.imul(xHigh, low) + Math.imul(xLow, high);
    x[1] = Math.imul(xLow, low);
}

// Adds one `64-bit` value to another, keeping only the lower 64 bits.
// The low-half addition may overflow 32 bits. When that happens, its
// carry is added to the high half. ({ x = x + y mod 2^64 })
function add(x: U64, y: U64): void {
    const low = x[1] + y[1];
    x[1] = low;
    x[0] = x[0] + y[0] + (low > 0xffffffff ? 1 : 0);
}

// Adds a `64-bit` constant to a value, keeping only the lower 64 bits.
// This is used for the fixed constants added during block processing. ({ x = x + (high:low) mod 2^64 })
function addConstant(x: U64, high: number, low: number): void {
    const sum = x[1] + low;
    x[1] = sum;
    x[0] = x[0] + high + (sum > 0xffffffff ? 1 : 0);
}

// Applies a bitwise XOR to both halves of a 64-bit value.
// The result is stored in `x`.
function xor(x: U64, y: U64): void {
    x[0] ^= y[0];
    x[1] ^= y[1];
}

/**
 * Rotates a `64-bit` value to the left by the requested number of `bits`.
 * Bits shifted out of the high end are wrapped around to the low end.
 * The operation updates `x` in place.
 *
 * @param x - The value to rotate.
 * @param bits - The number of bits to rotate, from 1 to 63.
 */
function rotl(x: U64, bits: number): void {
    let high = x[0];
    let low = x[1];
    if (bits >= 32) {

        // Rotating by 32, is just swapping the two halves.
        const swap = high;
        high = low;
        low = swap;
        bits -= 32;
    }
    if (bits === 0) {
        x[0] = high;
        x[1] = low;
        return;
    }
    x[0] = (high << bits) | (low >>> (32 - bits));
    x[1] = (low << bits) | (high >>> (32 - bits));
}

// Applies the MurmurHash3 finalization XOR shift by 33 bits.
// This operation mixes the upper half into the lower half before,
// subsequent multiplication steps. ({ x = x ^ (x >>> 33) })
function xorShiftRight33(x: U64): void {

    // Shifting a 64-bit value right by 33 moves,
    // the high half down and drops the low half.
    x[1] ^= x[0] >>> 1;
}

// Applies the MurmurHash3 final mixing sequence to a `64-bit` value.
// Repeated XOR shifts and multiplications help spread the influence
// of each input bit across the resulting hash.
function fmix(x: U64): void {
    xorShiftRight33(x);
    mul(x, FMIX_1_HI, FMIX_1_LO);
    xorShiftRight33(x);
    mul(x, FMIX_2_HI, FMIX_2_LO);
    xorShiftRight33(x);
}

let encoder: TextEncoder | undefined;

/**
 * Converts supported input into bytes for hashing.
 * Strings are encoded as UTF-8. Supported byte arrays are returned
 * directly without modifying their contents.
 *
 * @param input - The string or byte array to convert.
 * @returns The bytes to hash.
 * @throws TypeError if the input is not a supported type.
 */
function toBytes(input: HashInput): Uint8Array | Uint8ClampedArray {
    if (typeof input === 'string') {

        // Created on first use so that,
        // importing this file never touches a global.
        encoder = encoder ?? new TextEncoder();
        return encoder.encode(input);
    }
    if (input instanceof Uint8Array || input instanceof Uint8ClampedArray) return input;
    throw new TypeError('murmur3-x64-128 hash expects a string, Uint8Array or Uint8ClampedArray!');
}

/**
 * Reads eight bytes as a little-endian `64-bit` value.
 * The first byte becomes the least significant byte of the low half.
 * The resulting high and low halves are written into out.
 *
 * @param bytes - Source data.
 * @param offset - Index of the first byte to read.
 * @param out - Destination `64-bit` value.
 */
function readUint64LE(bytes: ArrayLike<number>, offset: number, out: U64): void {
    out[1] = bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24);
    out[0] = bytes[offset + 4] | (bytes[offset + 5] << 8) | (bytes[offset + 6] << 16) | (bytes[offset + 7] << 24);
}

// Formats a `32-bit` value as eight lowercase hexadecimal characters.
// Leading zeros are included so every half of the final hash has a
// consistent width.
function hex32(value: number): string {
    return value.toString(16).padStart(8, '0');
}

/**
 * Hashes a string or byte array into a `128-bit` MurmurHash3 value.
 *
 * @param input the data to hash, as a string or byte array
 * @param seed  unsigned `32-bit` integer, default 0
 * @returns 32 lowercase hex characters
 */
export function murmurHash128(input: HashInput, seed = 0): string {
    const data = toBytes(input);
    const length = data.length;
    const blockCount = length >> 4;

    const h1 = u64(0, seed >>> 0);
    const h2 = u64(0, seed >>> 0);
    const k1 = u64();
    const k2 = u64();

    // Body: Every full 16-byte block.
    for (let block = 0; block < blockCount; block++) {
        readUint64LE(data, block * 16, k1);
        readUint64LE(data, block * 16 + 8, k2);

        mul(k1, C1_HI, C1_LO);
        rotl(k1, 31);
        mul(k1, C2_HI, C2_LO);
        xor(h1, k1);

        rotl(h1, 27);
        add(h1, h2);
        mul(h1, 0, 5);
        addConstant(h1, 0, 0x52dce729);

        mul(k2, C2_HI, C2_LO);
        rotl(k2, 33);
        mul(k2, C1_HI, C1_LO);
        xor(h2, k2);

        rotl(h2, 31);
        add(h2, h1);
        mul(h2, 0, 5);
        addConstant(h2, 0, 0x38495ab5);
    }

    // Tail: The last 0 to 15 bytes.
    const tailLength = length & 15;
    if (tailLength > 0) {
        const tailStart = length - tailLength;
        k1[0] = 0;
        k1[1] = 0;
        k2[0] = 0;
        k2[1] = 0;

        // Bytes 0-7 of the tail fill k1, bytes 8-14 fill k2 (little-endian).
        for (let i = 0; i < tailLength; i++) {
            const target = i < 8 ? k1 : k2;
            const position = i & 7;
            if (position < 4) { 
                target[1] ^= data[tailStart + i] << (8 * position);
            } else { 
                target[0] ^= data[tailStart + i] << (8 * (position - 4));
            }
        }

        if (tailLength > 8) {
            mul(k2, C2_HI, C2_LO);
            rotl(k2, 33);
            mul(k2, C1_HI, C1_LO);
            xor(h2, k2);
        }

        mul(k1, C1_HI, C1_LO);
        rotl(k1, 31);
        mul(k1, C2_HI, C2_LO);
        xor(h1, k1);
    }

    // Finalization: The length is mixed in as a `64-bit` number. JavaScript strings and arrays cannot be
    // longer than 2^53, but only the low 32 bits matter in practice for any real input.
    const lengthPair = u64(Math.floor(length / 0x100000000), length >>> 0);
    xor(h1, lengthPair);
    xor(h2, lengthPair);

    add(h1, h2);
    add(h2, h1);

    fmix(h1);
    fmix(h2);

    add(h1, h2);
    add(h2, h1);

    // Return
    return hex32(h1[0]) + hex32(h1[1]) + hex32(h2[0]) + hex32(h2[1]);
}