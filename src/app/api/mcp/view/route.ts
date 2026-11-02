import { SEARCH_VIEW_HTML } from '../../../../mcp/searchView';

/**
 * Serves the MCP App view as plain HTML so it can be previewed without a
 * dashboard. Development only - in production the view is delivered through
 * `resources/read` on the MCP endpoint, not over plain HTTP.
 */
export function GET() {
  if (process.env.NODE_ENV === 'production') {
    return new Response('Not found', { status: 404 });
  }
  return new Response(SEARCH_VIEW_HTML, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
