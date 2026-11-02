import { createCipheriv, createDecipheriv, hkdfSync, randomBytes, timingSafeEqual } from 'crypto';

/**
 * Authenticated encryption for values that are handed to a client and come
 * back later. This is what keeps the OAuth bridge stateless: instead of storing
 * per-user Contentful tokens and issuing opaque keys, every value the bridge
 * issues - client ids, authorization codes, access and refresh tokens - is a
 * sealed envelope the client carries for us.
 *
 * The trade-off is revocation: a sealed token cannot be invalidated before it
 * expires without a denylist, which would reintroduce the state we are avoiding.
 * Contentful access tokens live an hour, which bounds the exposure.
 */

const DEV_SECRET = 'uniform-contentful-mcp-development-secret-do-not-use-in-production';

const IV_BYTES = 12;
const TAG_BYTES = 16;

function secret(): string {
  const configured = process.env.MCP_BRIDGE_SECRET;
  if (configured && configured.length >= 16) return configured;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('MCP_BRIDGE_SECRET must be set (32+ random characters) to run the OAuth bridge.');
  }
  return DEV_SECRET;
}

/** Separate keys per purpose, so a code can never be replayed as a token. */
function keyFor(purpose: string): Uint8Array {
  return new Uint8Array(hkdfSync('sha256', secret(), 'uniform-contentful-mcp', purpose, 32));
}

const toBytes = (buf: Buffer): Uint8Array => new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);

export function seal(purpose: string, payload: unknown): string {
  const iv = toBytes(randomBytes(IV_BYTES));
  const cipher = createCipheriv('aes-256-gcm', keyFor(purpose), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  return Buffer.concat([Buffer.from(iv), cipher.getAuthTag(), body]).toString('base64url');
}

export function unseal<T>(purpose: string, sealed: string): T | undefined {
  try {
    const raw = Buffer.from(sealed, 'base64url');
    if (raw.length <= IV_BYTES + TAG_BYTES) return undefined;

    const decipher = createDecipheriv('aes-256-gcm', keyFor(purpose), toBytes(raw.subarray(0, IV_BYTES)));
    decipher.setAuthTag(toBytes(raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES)));
    const plain = Buffer.concat([
      decipher.update(toBytes(raw.subarray(IV_BYTES + TAG_BYTES))),
      decipher.final(),
    ]);
    return JSON.parse(plain.toString('utf8')) as T;
  } catch {
    // A tampered, truncated or wrong-purpose envelope is simply not valid.
    return undefined;
  }
}

export function safeEqual(a: string, b: string): boolean {
  const left = toBytes(Buffer.from(a));
  const right = toBytes(Buffer.from(b));
  return left.length === right.length && timingSafeEqual(left, right);
}
