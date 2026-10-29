import { Client } from '@modelcontextprotocol/client';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { CONTENTFUL_MCP_URL, SearchResultItem, SearchResultPayload } from './constants';

export interface SearchArgs {
  query: string;
  kind: 'entry' | 'asset';
  spaceId?: string;
  environmentId?: string;
  limit: number;
}

/**
 * Opens a short-lived MCP session against Contentful's hosted server, carrying
 * the end user's Contentful access token. One session per tool call keeps the
 * serverless function stateless; Contentful scopes the session to the spaces
 * the user picked during the OAuth consent flow.
 */
async function withContentfulMcp<T>(accessToken: string, run: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ name: 'uniform-contentful', version: '0.0.0' });
  const transport = new StreamableHTTPClientTransport(new URL(CONTENTFUL_MCP_URL), {
    requestInit: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  await client.connect(transport);
  try {
    return await run(client);
  } finally {
    await client.close().catch(() => undefined);
  }
}

/**
 * Tool names, cached per access token. Doubles as a token check: if Contentful
 * accepts `initialize` + `tools/list` the token is live, and the names are then
 * already in hand for the search call.
 */
const TOKEN_TTL_MS = 60_000;
const tokenCache = new Map<string, { expiresAt: number; toolNames: string[] }>();

/**
 * Returns the caller's available Contentful tools, or `undefined` when the
 * token is missing or stale. The route turns `undefined` into a real 401, which
 * is what prompts Uniform to run `credentials.refresh()` - a 200 carrying an
 * error body would skip the refresh and bury the problem in the agent's context.
 */
export async function validateContentfulToken(accessToken: string): Promise<string[] | undefined> {
  const cached = tokenCache.get(accessToken);
  if (cached && cached.expiresAt > Date.now()) return cached.toolNames;

  try {
    const toolNames = await withContentfulMcp(accessToken, async (client) => {
      const { tools } = await client.listTools();
      return tools.map((tool) => tool.name);
    });
    tokenCache.set(accessToken, { expiresAt: Date.now() + TOKEN_TTL_MS, toolNames });
    return toolNames;
  } catch {
    tokenCache.delete(accessToken);
    return undefined;
  }
}

/**
 * Contentful's tool names are not part of a stable contract we can rely on, so
 * pick the search tool off `tools/list` instead of hardcoding a guess.
 */
function pickSearchTool(toolNames: string[], kind: SearchArgs['kind']): string | undefined {
  const subject = kind === 'asset' ? /asset/i : /entr/i;
  const verb = /search|list|query|find/i;

  const scored = toolNames
    .filter((name) => subject.test(name))
    .sort((a, b) => Number(verb.test(b)) - Number(verb.test(a)));

  return scored.find((name) => verb.test(name)) ?? scored[0];
}

/** CMA returns localised fields as `{ 'en-US': value }`; take whatever is there. */
function unwrapLocalised(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const values = Object.values(value as Record<string, unknown>);
  return values.length === 1 ? values[0] : value;
}

function asString(value: unknown): string | undefined {
  const unwrapped = unwrapLocalised(value);
  return typeof unwrapped === 'string' ? unwrapped : undefined;
}

function normaliseItem(raw: unknown, kind: SearchArgs['kind']): SearchResultItem | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const item = raw as Record<string, any>;
  const sys = (item.sys ?? {}) as Record<string, any>;
  const id = typeof sys.id === 'string' ? sys.id : typeof item.id === 'string' ? item.id : undefined;
  if (!id) return undefined;

  const fields = (item.fields ?? {}) as Record<string, unknown>;
  const file = unwrapLocalised(fields.file) as Record<string, any> | undefined;
  const fileUrl = typeof file?.url === 'string' ? file.url : undefined;

  return {
    id,
    kind,
    title:
      asString(fields.title) ??
      asString(fields.name) ??
      asString(fields.internalName) ??
      asString(item.title) ??
      id,
    subtitle:
      asString(fields.description) ?? (typeof file?.fileName === 'string' ? file.fileName : undefined),
    contentType: typeof sys.contentType?.sys?.id === 'string' ? sys.contentType.sys.id : kind,
    thumbnailUrl: fileUrl && /^(https?:)?\/\//.test(fileUrl) ? fileUrl : undefined,
    updatedAt: typeof sys.updatedAt === 'string' ? sys.updatedAt : undefined,
    spaceId: typeof sys.space?.sys?.id === 'string' ? sys.space.sys.id : undefined,
    environmentId: typeof sys.environment?.sys?.id === 'string' ? sys.environment.sys.id : undefined,
  };
}

/**
 * Contentful's tools answer with their JSON as text content, so unwrap the text
 * and look for whichever array of records it carries.
 */
function extractItems(result: unknown): unknown[] {
  const content = (result as any)?.content;
  const structured = (result as any)?.structuredContent;

  const candidates: unknown[] = [];
  if (structured) candidates.push(structured);

  if (Array.isArray(content)) {
    for (const part of content) {
      if (part?.type === 'text' && typeof part.text === 'string') {
        try {
          candidates.push(JSON.parse(part.text));
        } catch {
          // Not every text block is JSON; skip it.
        }
      }
    }
  }

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
    const items = (candidate as any)?.items ?? (candidate as any)?.results ?? (candidate as any)?.entries;
    if (Array.isArray(items)) return items;
  }
  return [];
}

export async function searchContentful(args: SearchArgs, accessToken: string): Promise<SearchResultPayload> {
  const cachedNames = tokenCache.get(accessToken)?.toolNames;

  return withContentfulMcp(accessToken, async (client) => {
    const toolNames = cachedNames ?? (await client.listTools()).tools.map((tool) => tool.name);
    const toolName = pickSearchTool(toolNames, args.kind);

    if (!toolName) {
      throw new Error(
        `Contentful's MCP server exposes no ${args.kind} search tool for this user. ` +
          'Check the tool categories enabled for this space and environment in the Contentful MCP app.'
      );
    }

    const result = await client.callTool({
      name: toolName,
      arguments: {
        query: args.query,
        ...(args.spaceId ? { spaceId: args.spaceId } : {}),
        ...(args.environmentId ? { environmentId: args.environmentId } : {}),
        limit: args.limit,
      },
    });

    if ((result as any)?.isError) {
      const detail = extractItems(result).length ? '' : ` (${toolName})`;
      throw new Error(`Contentful rejected the search${detail}.`);
    }

    const items = extractItems(result)
      .map((item) => normaliseItem(item, args.kind))
      .filter((item): item is SearchResultItem => Boolean(item));

    return { query: args.query, total: items.length, items: items.slice(0, args.limit) };
  });
}
