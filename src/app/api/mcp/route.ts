import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import type { AuthInfo } from '@modelcontextprotocol/server';
import * as z from 'zod';
import { MCP_APP_MIME_TYPE, SEARCH_VIEW_URI, VIEW_CSP } from '../../../mcp/constants';
import { SEARCH_VIEW_HTML } from '../../../mcp/searchView';
import { searchContentful, validateContentfulToken } from '../../../mcp/contentfulProxy';
import { AccessEnvelope, PURPOSE } from '../../../mcp/bridge';
import { unseal } from '../../../mcp/sealed';

const handler = createMcpHandler((server) => {
  /**
   * The view itself. Declaring it as a resource is all the discovery the host
   * needs - it reads `_meta.ui` off `tools/list` and then fetches this over its
   * own short-lived connection.
   */
  server.registerResource(
    'search-view',
    SEARCH_VIEW_URI,
    {
      title: 'Contentful search results',
      description: 'Renders Contentful search hits as a thumbnail grid.',
      mimeType: MCP_APP_MIME_TYPE,
      _meta: { ui: { csp: VIEW_CSP } },
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: MCP_APP_MIME_TYPE,
          text: SEARCH_VIEW_HTML,
          _meta: { ui: { csp: VIEW_CSP } },
        },
      ],
    })
  );

  server.registerTool(
    'search_content',
    {
      title: 'Search Contentful',
      description:
        'Search entries or assets in the connected Contentful spaces. Returns the matches as JSON ' +
        'so they can be used directly when creating Uniform content.',
      inputSchema: z.object({
        query: z.string().describe('Free-text search, e.g. "winter campaign imagery".'),
        kind: z.enum(['entry', 'asset']).default('entry').describe('Search entries or assets.'),
        spaceId: z
          .string()
          .optional()
          .describe('Space to search. Defaults to the first space the user authorised.'),
        environmentId: z
          .string()
          .optional()
          .describe('Environment to search. Defaults to the one paired with the space.'),
        limit: z.number().int().min(1).max(50).default(12),
      }),
      _meta: { ui: { resourceUri: SEARCH_VIEW_URI } },
    },
    async ({ query, kind, spaceId, environmentId, limit }, ctx) => {
      // verifyToken put the unsealed Contentful token on the auth info.
      const token = ctx.http?.authInfo?.extra?.contentfulToken;
      if (typeof token !== 'string') throw new Error('Missing Contentful access token.');

      const payload = await searchContentful({ query, kind, spaceId, environmentId, limit }, token);

      /**
       * Emit the JSON as text content rather than relying on `structuredContent`:
       * the host joins MCP text content into a single string before it reaches
       * the view, so text is the only channel both the model and the view see.
       */
      return { content: [{ type: 'text' as const, text: JSON.stringify(payload) }] };
    }
  );
}, {});

/**
 * Tokens are issued by Contentful's own authorization server (see the
 * protected-resource metadata route), so validation means asking Contentful
 * whether the token still works.
 */
const verifyToken = async (_req: Request, bearerToken?: string): Promise<AuthInfo | undefined> => {
  // Returning undefined yields "No authorization provided"; letting
  // validateContentfulToken throw yields "Invalid token" and logs the reason.
  // Keeping the two distinct is what tells a client that omitted the header
  // apart from a token Contentful refused.
  if (!bearerToken) return undefined;

  // The bearer is one of this bridge's sealed envelopes, not a Contentful
  // token: a client's token is minted for this server's audience and would be
  // refused by Contentful. Unseal it to recover the Contentful token inside.
  const envelope = unseal<AccessEnvelope>(PURPOSE.access, bearerToken);
  if (!envelope) throw new Error('Bearer token is not a token issued by this server.');
  if (envelope.expiresAt <= Date.now()) throw new Error('Access token has expired.');

  const session = await validateContentfulToken(envelope.accessToken);

  return {
    token: bearerToken,
    scopes: [],
    clientId: 'contentful',
    extra: { environments: session.environments, contentfulToken: envelope.accessToken },
  };
};

const authHandler = withMcpAuth(handler, verifyToken, {
  required: true,
  resourceMetadataPath: '/.well-known/oauth-protected-resource',
});

export { authHandler as GET, authHandler as POST };
