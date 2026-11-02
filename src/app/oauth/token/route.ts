import {
  AccessEnvelope,
  AuthorizationCode,
  PURPOSE,
  RefreshEnvelope,
  callbackUrl,
  corsPreflight,
  json,
  oauthError,
  originOf,
  verifyPkce,
} from '../../../mcp/bridge';
import { seal, unseal } from '../../../mcp/sealed';
import { contentfulClientId, refreshContentfulToken } from '../../../mcp/contentfulOAuth';

/** The bridge's tokens are sealed envelopes holding Contentful's, not keys into a store. */
function issue(accessToken: string, refreshToken: string | undefined, expiresAt: number) {
  const expiresIn = Math.max(1, Math.floor((expiresAt - Date.now()) / 1000));
  return json({
    access_token: seal(PURPOSE.access, { accessToken, expiresAt } satisfies AccessEnvelope),
    token_type: 'Bearer',
    expires_in: expiresIn,
    ...(refreshToken
      ? { refresh_token: seal(PURPOSE.refresh, { refreshToken } satisfies RefreshEnvelope) }
      : {}),
  });
}

export async function POST(req: Request) {
  const form = new URLSearchParams(await req.text());
  const grantType = form.get('grant_type');

  if (grantType === 'authorization_code') {
    const sealed = form.get('code');
    const code = sealed ? unseal<AuthorizationCode>(PURPOSE.code, sealed) : undefined;
    if (!code) return oauthError('invalid_grant', 'Unknown or expired authorization code.');

    if (!(await verifyPkce(code.clientChallenge, form.get('code_verifier') ?? undefined))) {
      return oauthError('invalid_grant', 'PKCE verification failed.');
    }
    const redirectUri = form.get('redirect_uri');
    if (redirectUri && redirectUri !== code.clientRedirectUri) {
      return oauthError('invalid_grant', 'redirect_uri does not match the authorization request.');
    }

    return issue(code.accessToken, code.refreshToken, code.expiresAt);
  }

  if (grantType === 'refresh_token') {
    const sealed = form.get('refresh_token');
    const envelope = sealed ? unseal<RefreshEnvelope>(PURPOSE.refresh, sealed) : undefined;
    if (!envelope) return oauthError('invalid_grant', 'Unknown refresh token.');

    try {
      const tokens = await refreshContentfulToken({
        clientId: await contentfulClientId(callbackUrl(originOf(req))),
        refreshToken: envelope.refreshToken,
      });
      return issue(
        tokens.access_token,
        tokens.refresh_token ?? envelope.refreshToken,
        Date.now() + (tokens.expires_in ?? 3600) * 1000
      );
    } catch (error) {
      return oauthError(
        'invalid_grant',
        error instanceof Error ? error.message.slice(0, 200) : 'Contentful refused the refresh.'
      );
    }
  }

  return oauthError('unsupported_grant_type', `Unsupported grant_type: ${grantType ?? '(none)'}`);
}

export const OPTIONS = corsPreflight;
