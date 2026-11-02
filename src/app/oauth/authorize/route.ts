import { ClientRegistration, Handoff, PURPOSE, callbackUrl, oauthError, originOf } from '../../../mcp/bridge';
import { seal, unseal } from '../../../mcp/sealed';
import { contentfulAuthorizeUrl, contentfulClientId, pkcePair } from '../../../mcp/contentfulOAuth';

/**
 * Starts the client's flow by starting our own against Contentful. Everything
 * needed to finish the client's half - who they are, where to send them back,
 * their PKCE challenge, and our Contentful verifier - is sealed into the
 * `state` Contentful hands back, so the callback needs no stored session.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const params = url.searchParams;

  const clientId = params.get('client_id');
  const redirectUri = params.get('redirect_uri');
  if (!clientId || !redirectUri) {
    return oauthError('invalid_request', 'client_id and redirect_uri are required.');
  }

  const registration = unseal<ClientRegistration>(PURPOSE.client, clientId);
  if (!registration) {
    return oauthError('invalid_client', 'Unknown client_id. Register at /oauth/register first.');
  }
  if (!registration.redirect_uris.includes(redirectUri)) {
    return oauthError('invalid_request', 'redirect_uri does not match the registration.');
  }
  if ((params.get('response_type') ?? 'code') !== 'code') {
    return oauthError('unsupported_response_type', 'Only the authorization_code flow is supported.');
  }

  const origin = originOf(req);
  const callback = callbackUrl(origin);
  const { verifier, challenge } = pkcePair();

  const handoff: Handoff = {
    clientId,
    clientRedirectUri: redirectUri,
    clientState: params.get('state') ?? undefined,
    clientChallenge: params.get('code_challenge') ?? undefined,
    verifier,
  };

  try {
    const contentfulClient = await contentfulClientId(callback);
    return Response.redirect(
      contentfulAuthorizeUrl({
        clientId: contentfulClient,
        redirectUri: callback,
        challenge,
        state: seal(PURPOSE.handoff, handoff),
      }),
      302
    );
  } catch (error) {
    return oauthError(
      'server_error',
      error instanceof Error ? error.message : 'Could not start the Contentful flow.',
      502
    );
  }
}
