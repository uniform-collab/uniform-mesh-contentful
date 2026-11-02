import { getPublicOrigin } from 'mcp-handler';

/** Envelope purposes. Separate keys mean one kind can never be replayed as another. */
export const PURPOSE = {
  client: 'client-registration',
  handoff: 'contentful-handoff',
  code: 'authorization-code',
  access: 'access-token',
  refresh: 'refresh-token',
} as const;

/** A client that registered with this bridge; the client id *is* this payload. */
export interface ClientRegistration {
  redirect_uris: string[];
  client_name?: string;
}

/** Carried through Contentful's `state` so the round trip needs no storage. */
export interface Handoff {
  clientId: string;
  clientRedirectUri: string;
  clientState?: string;
  clientChallenge?: string;
  verifier: string;
}

/** Sealed into the authorization code handed back to the client. */
export interface AuthorizationCode {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  clientChallenge?: string;
  clientRedirectUri: string;
}

export interface AccessEnvelope {
  accessToken: string;
  expiresAt: number;
}

export interface RefreshEnvelope {
  refreshToken: string;
}

export function originOf(req: Request): string {
  return getPublicOrigin(req);
}

export const callbackUrl = (origin: string) => `${origin}/oauth/callback`;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, MCP-Protocol-Version',
};

export function json(body: unknown, init?: { status?: number }): Response {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...CORS },
  });
}

export function oauthError(error: string, description: string, status = 400): Response {
  return json({ error, error_description: description }, { status });
}

export function corsPreflight(): Response {
  return new Response(null, { status: 204, headers: CORS });
}

/** RFC 7636 S256 check, done here because the challenge travels in the code. */
export async function verifyPkce(
  challenge: string | undefined,
  verifier: string | undefined
): Promise<boolean> {
  if (!challenge) return true;
  if (!verifier) return false;
  const { createHash } = await import('crypto');
  return createHash('sha256').update(verifier).digest('base64url') === challenge;
}
