import crypto from 'node:crypto';

/**
 * Encodes binary buffers to base32 strings
 */
const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

const base32Encode = (buffer) => {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += base32Chars[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += base32Chars[(value << (5 - bits)) & 31];
  }

  return output;
};

/**
 * Decodes base32 strings to binary buffers
 */
const base32Decode = (base32Str) => {
  const cleanStr = base32Str.toUpperCase().replace(/=+$/, '');
  const buffer = Buffer.alloc(Math.floor((cleanStr.length * 5) / 8));
  let bits = 0;
  let value = 0;
  let index = 0;

  for (let i = 0; i < cleanStr.length; i++) {
    const charValue = base32Chars.indexOf(cleanStr[i]);
    if (charValue === -1) {
      throw new Error('Invalid base32 character');
    }

    value = (value << 5) | charValue;
    bits += 5;

    if (bits >= 8) {
      buffer[index++] = (value >>> (bits - 8)) & 255;
      bits -= 8;
    }
  }

  return buffer;
};

/**
 * Dynamic TOTP (Time-Based One-Time Password) Cryptographic Helper
 */
export const TOTPHelper = {
  /**
   * Generates a random base32 encoded secret (default 160-bit key)
   */
  generateSecret: (length = 20) => {
    const bytes = crypto.randomBytes(length);
    return base32Encode(bytes);
  },

  /**
   * Generates standard otpauth URL for authenticator QR setups
   */
  generateOtpauthUrl: (label, issuer, secret) => {
    return `otpauth://totp/${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
  },

  /**
   * Verifies a 6-digit standard TOTP token against a base32 secret
   */
  verifyToken: (secret, token, window = 1) => {
    if (!token || token.length !== 6) {
      return false;
    }

    try {
      const key = base32Decode(secret);
      // Determine standard Unix time intervals of 30 seconds
      const epochSeconds = Math.floor(Date.now() / 1000);
      const currentCounter = Math.floor(epochSeconds / 30);

      // Verify token across a target validation window (to handle clock drift)
      for (let i = -window; i <= window; i++) {
        const counter = currentCounter + i;

        // Convert counter to 8-byte hexadecimal big-endian buffer
        const counterBuffer = Buffer.alloc(8);
        let temp = counter;
        for (let j = 7; j >= 0; j--) {
          counterBuffer[j] = temp & 0xff;
          temp = temp >> 8;
        }

        // Generate dynamic HMAC SHA-1 signature
        const hmac = crypto.createHmac('sha1', key);
        hmac.update(counterBuffer);
        const hmacSig = hmac.digest();

        // Perform standard dynamic truncation mapping
        const offset = hmacSig[hmacSig.length - 1] & 0xf;
        const binary =
          ((hmacSig[offset] & 0x7f) << 24) |
          ((hmacSig[offset + 1] & 0xff) << 16) |
          ((hmacSig[offset + 2] & 0xff) << 8) |
          (hmacSig[offset + 3] & 0xff);

        // Convert to 6-digit standard token format
        const calculatedToken = String(binary % 1000000).padStart(6, '0');
        if (calculatedToken === token) {
          return true;
        }
      }
    } catch (err) {
      return false;
    }

    return false;
  },
};
export default TOTPHelper;
