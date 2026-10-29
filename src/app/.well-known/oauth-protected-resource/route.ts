import { metadataCorsOptionsRequestHandler, protectedResourceHandler } from 'mcp-handler';
import { CONTENTFUL_AUTH_SERVER } from '../../../mcp/constants';

/**
 * This server delegates authorization to Contentful's own MCP authorization
 * server, which supports authorization_code + PKCE, refresh tokens and dynamic
 * client registration. Uniform's OAuth provider discovers it from here, so each
 * user connects their own Contentful account and searches run with their
 * permissions.
 *
 * POC caveat: the resulting token's audience is Contentful, and this server
 * forwards it there unchanged. That is coherent as a transparent proxy, but a
 * production version should either run its own authorization server or perform
 * a token exchange rather than accepting a token minted for someone else.
 */
const handler = protectedResourceHandler({ authServerUrls: [CONTENTFUL_AUTH_SERVER] });

const corsHandler = metadataCorsOptionsRequestHandler();

export { handler as GET, corsHandler as OPTIONS };
