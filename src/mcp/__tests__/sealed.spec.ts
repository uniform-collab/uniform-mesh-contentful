import { describe, expect, it } from 'vitest';
import { seal, unseal } from '../sealed';
import { PURPOSE } from '../bridge';

describe('sealed envelopes', () => {
  it('round-trips a payload', () => {
    const sealed = seal(PURPOSE.access, { accessToken: 'abc', expiresAt: 123 });
    expect(unseal(PURPOSE.access, sealed)).toEqual({ accessToken: 'abc', expiresAt: 123 });
  });

  it('refuses an envelope opened with the wrong purpose', () => {
    // An authorization code must never be replayable as an access token.
    const code = seal(PURPOSE.code, { accessToken: 'abc' });
    expect(unseal(PURPOSE.access, code)).toBeUndefined();
  });

  it('refuses a tampered envelope', () => {
    const sealed = seal(PURPOSE.refresh, { refreshToken: 'secret' });
    const raw = Buffer.from(sealed, 'base64url');
    raw[raw.length - 1] ^= 0xff;
    expect(unseal(PURPOSE.refresh, raw.toString('base64url'))).toBeUndefined();
  });

  it('refuses truncated or junk input', () => {
    expect(unseal(PURPOSE.access, '')).toBeUndefined();
    expect(unseal(PURPOSE.access, 'not-base64url!!')).toBeUndefined();
    expect(unseal(PURPOSE.access, Buffer.alloc(20).toString('base64url'))).toBeUndefined();
  });

  it('produces a different ciphertext each time', () => {
    const a = seal(PURPOSE.access, { accessToken: 'same' });
    const b = seal(PURPOSE.access, { accessToken: 'same' });
    expect(a).not.toEqual(b);
    expect(unseal(PURPOSE.access, a)).toEqual(unseal(PURPOSE.access, b));
  });
});
