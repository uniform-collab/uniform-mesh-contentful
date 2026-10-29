import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import type { AuthInfo } from '@modelcontextprotocol/server';
import * as z from 'zod';
import { MCP_APP_MIME_TYPE, SEARCH_VIEW_URI, VIEW_CSP } from '../../../mcp/constants';
import { SEARCH_VIEW_HTML } from '../../../mcp/searchView';
import { searchContentful, validateContentfulToken } from '../../../mcp/contentfulProxy';

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
        spaceId: z.string().optional().describe('Restrict to a single space.'),
        environmentId: z.string().optional().describe('Restrict to a single environment.'),
        limit: z.number().int().min(1).max(50).default(12),
      }),
      _meta: { ui: { resourceUri: SEARCH_VIEW_URI } },
    },
    async ({ query, kind, spaceId, environmentId, limit }, ctx) => {
      const token = ctx.http?.authInfo?.token;
      if (!token) throw new Error('Missing Contentful access token.');

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
  if (!bearerToken) return undefined;

  const toolNames = await validateContentfulToken(bearerToken);
  if (!toolNames) return undefined;

  return {
    token: bearerToken,
    scopes: [],
    clientId: 'contentful',
    extra: { toolNames },
  };
};

const authHandler = withMcpAuth(handler, verifyToken, {
  required: true,
  resourceMetadataPath: '/.well-known/oauth-protected-resource',
});

export { authHandler as GET, authHandler as POST };
