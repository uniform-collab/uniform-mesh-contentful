import { createHash, randomBytes } from 'crypto';
import { CONTENTFUL_AUTH_SERVER, CONTENTFUL_MCP_URL } from './constants';

/**
 * The bridge's Contentful side. Contentful binds a token's audience to the
 * `resource` of the authorization request and will not let it change later
 * (`invalid_target` on refresh), and `mcp.contentful.com/mcp` accepts only its
 * own identifier - so every request here names CONTENTFUL_MCP_URL. That is the
 * whole reason the bridge exists: a client's token for *this* server can never
 * be valid at Contentful's.
 */

export const CONTENTFUL_AUTHORIZE_URL = `${CONTENTFUL_AUTH_SERVER}/authorize`;
export const CONTENTFUL_TOKEN_URL = `${CONTENTFUL_AUTH_SERVER}/token`;
export const CONTENTFUL_REGISTER_URL = `${CONTENTFUL_AUTH_SERVER}/register`;

export interface ContentfulTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}

export function pkcePair() {
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

/**
 * Contentful supports dynamic client registration, so no OAuth app has to be
 * created by hand. Pin CONTENTFUL_OAUTH_CLIENT_ID in the environment to reuse
 * one registration; otherwise each cold start registers its own, which is fine
 * for a preview deployment but noisy for a long-lived one.
 */
let cachedClientId: { redirectUri: string; clientId: string } | undefined;

export async function contentfulClientId(redirectUri: string): Promise<string> {
  const pinned = process.env.CONTENTFUL_OAUTH_CLIENT_ID;
  if (pinned) return pinned;
  if (cachedClientId?.redirectUri === redirectUri) return cachedClientId.clientId;

  const response = await fetch(CONTENTFUL_REGISTER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_name: 'Uniform Contentful MCP App',
      redirect_uris: [redirectUri],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    }),
  });

  if (!response.ok) {
    throw new Error(`Could not register with Contentful (${response.status}): ${await response.text()}`);
  }

  const { client_id: clientId } = (await response.json()) as { client_id: string };
  cachedClientId = { redirectUri, clientId };
  return clientId;
}

export function contentfulAuthorizeUrl(options: {
  clientId: string;
  redirectUri: string;
  challenge: string;
  state: string;
}): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: options.clientId,
    redirect_uri: options.redirectUri,
    code_challenge: options.challenge,
    code_challenge_method: 'S256',
    state: options.state,
    resource: CONTENTFUL_MCP_URL,
  });
  return `${CONTENTFUL_AUTHORIZE_URL}?${params}`;
}

async function postToken(body: URLSearchParams): Promise<ContentfulTokens> {
  const response = await fetch(CONTENTFUL_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Contentful token endpoint ${response.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text) as ContentfulTokens;
}

export function exchangeContentfulCode(options: {
  clientId: string;
  code: string;
  verifier: string;
  redirectUri: string;
}): Promise<ContentfulTokens> {
  return postToken(
    new URLSearchParams({
      grant_type: 'authorization_code',
      code: options.code,
      code_verifier: options.verifier,
      redirect_uri: options.redirectUri,
      client_id: options.clientId,
      resource: CONTENTFUL_MCP_URL,
    })
  );
}

export function refreshContentfulToken(options: {
  clientId: string;
  refreshToken: string;
}): Promise<ContentfulTokens> {
  return postToken(
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: options.refreshToken,
      client_id: options.clientId,
      resource: CONTENTFUL_MCP_URL,
    })
  );
}
