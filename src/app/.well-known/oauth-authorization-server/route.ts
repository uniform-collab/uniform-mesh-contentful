import { corsPreflight, json, originOf } from '../../../mcp/bridge';

/**
 * This server is its own authorization server rather than delegating to
 * Contentful. It has to be: a client always requests a token whose audience is
 * the MCP server it is talking to, Contentful binds that audience permanently,
 * and `mcp.contentful.com` rejects anything not minted for itself. So the
 * bridge issues its own tokens and holds the Contentful ones inside them.
 */
export function GET(req: Request) {
  const origin = originOf(req);
  return json({
    issuer: origin,
    authorization_endpoint: `${origin}/oauth/authorize`,
    token_endpoint: `${origin}/oauth/token`,
    registration_endpoint: `${origin}/oauth/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
    scopes_supported: [],
  });
}

export const OPTIONS = corsPreflight;
