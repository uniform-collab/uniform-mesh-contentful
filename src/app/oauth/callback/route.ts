import { AuthorizationCode, Handoff, PURPOSE, callbackUrl, oauthError, originOf } from '../../../mcp/bridge';
import { seal, unseal } from '../../../mcp/sealed';
import { contentfulClientId, exchangeContentfulCode } from '../../../mcp/contentfulOAuth';

/**
 * Contentful returns here. We finish our half of the flow immediately - trading
 * their code for Contentful tokens - then seal those tokens into the
 * authorization code we hand the original client, and send them home.
 */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;

  const handoff = unseal<Handoff>(PURPOSE.handoff, params.get('state') ?? '');
  if (!handoff) {
    return oauthError('invalid_request', 'Missing or unrecognised state. Start the flow again.');
  }

  const back = new URL(handoff.clientRedirectUri);
  if (handoff.clientState) back.searchParams.set('state', handoff.clientState);

  const denied = params.get('error');
  if (denied) {
    back.searchParams.set('error', denied);
    back.searchParams.set(
      'error_description',
      params.get('error_description') ?? 'Contentful denied the request.'
    );
    return Response.redirect(back.toString(), 302);
  }

  const code = params.get('code');
  if (!code) {
    back.searchParams.set('error', 'invalid_request');
    back.searchParams.set('error_description', 'Contentful returned no authorization code.');
    return Response.redirect(back.toString(), 302);
  }

  const callback = callbackUrl(originOf(req));

  try {
    const tokens = await exchangeContentfulCode({
      clientId: await contentfulClientId(callback),
      code,
      verifier: handoff.verifier,
      redirectUri: callback,
    });

    const authorizationCode: AuthorizationCode = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + (tokens.expires_in ?? 3600) * 1000,
      clientChallenge: handoff.clientChallenge,
      clientRedirectUri: handoff.clientRedirectUri,
    };

    back.searchParams.set('code', seal(PURPOSE.code, authorizationCode));
    return Response.redirect(back.toString(), 302);
  } catch (error) {
    back.searchParams.set('error', 'server_error');
    back.searchParams.set(
      'error_description',
      error instanceof Error ? error.message.slice(0, 200) : 'Contentful token exchange failed.'
    );
    return Response.redirect(back.toString(), 302);
  }
}
