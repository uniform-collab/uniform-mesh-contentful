import { corsPreflight, json, originOf } from '../../../mcp/bridge';

/**
 * The resource identifier must be this server's own origin: the MCP client SDK
 * throws if the advertised `resource` does not match the server it fetched this
 * from, which is why pointing it at Contentful is not an option.
 */
export function GET(req: Request) {
  const origin = originOf(req);
  return json({
    resource: origin,
    authorization_servers: [origin],
    bearer_methods_supported: ['header'],
  });
}

export const OPTIONS = corsPreflight;
