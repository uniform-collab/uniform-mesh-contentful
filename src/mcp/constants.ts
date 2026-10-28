/** Resource URI the `search_content` tool points its view at. */
export const SEARCH_VIEW_URI = 'ui://uniform-contentful/search';

/** MCP Apps marks an HTML resource as a renderable view with this profile. */
export const MCP_APP_MIME_TYPE = 'text/html;profile=mcp-app';

/**
 * The view's CSP starts every directive at 'none', so the image CDN has to be
 * declared explicitly or thumbnails silently fail to load.
 */
export const VIEW_CSP = Object.freeze({
  resourceDomains: ['https://images.ctfassets.net', 'https://assets.ctfassets.net'],
  connectDomains: [] as string[],
});

/** Contentful's hosted MCP server, which this server proxies on the user's behalf. */
export const CONTENTFUL_MCP_URL = 'https://mcp.contentful.com/mcp';

/** Normalised search payload shared by the tool output and the view. */
export interface SearchResultItem {
  id: string;
  kind: 'entry' | 'asset';
  title: string;
  subtitle?: string;
  contentType?: string;
  thumbnailUrl?: string;
  updatedAt?: string;
  spaceId?: string;
  environmentId?: string;
}

export interface SearchResultPayload {
  query: string;
  total: number;
  items: SearchResultItem[];
}

/** Contentful's MCP authorization server issuer. */
export const CONTENTFUL_AUTH_SERVER = 'https://mcp.contentful.com';
