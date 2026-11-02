import { ClientRegistration, PURPOSE, corsPreflight, json, oauthError } from '../../../mcp/bridge';
import { seal } from '../../../mcp/sealed';

/**
 * Dynamic client registration (RFC 7591). The issued `client_id` is itself the
 * sealed registration, so nothing has to be stored to recognise the client
 * again at /oauth/authorize.
 */
export async function POST(req: Request) {
  let body: ClientRegistration;
  try {
    body = (await req.json()) as ClientRegistration;
  } catch {
    return oauthError('invalid_client_metadata', 'Body must be JSON.');
  }

  const redirectUris = Array.isArray(body?.redirect_uris) ? body.redirect_uris.filter(Boolean) : [];
  if (!redirectUris.length) {
    return oauthError('invalid_redirect_uri', 'At least one redirect_uri is required.');
  }

  const clientId = seal(PURPOSE.client, {
    redirect_uris: redirectUris,
    client_name: body.client_name,
  } satisfies ClientRegistration);

  return json(
    {
      client_id: clientId,
      redirect_uris: redirectUris,
      client_name: body.client_name,
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
      client_id_issued_at: Math.floor(Date.now() / 1000),
    },
    { status: 201 }
  );
}

export const OPTIONS = corsPreflight;
