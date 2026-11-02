import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { CONTENTFUL_MCP_URL, SearchResultItem, SearchResultPayload } from './constants';
import { parseAssets, parseEntries, readTotal } from './contentfulPayload';

export interface SearchArgs {
  query: string;
  kind: 'entry' | 'asset';
  spaceId?: string;
  environmentId?: string;
  limit: number;
}

/** `list_assets` returns at most three items per call, so a grid needs paging. */
const ASSET_PAGE_SIZE = 3;
const MAX_ASSET_PAGES = 6;

export class ContentfulTokenRejected extends Error {
  constructor(public readonly detail: string) {
    super(`Contentful rejected the access token: ${detail}`);
    this.name = 'ContentfulTokenRejected';
  }
}

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

/** Joins a tool result's text content; Contentful answers in text, never JSON. */
function resultText(result: unknown): string {
  const content = (result as { content?: unknown }).content;
  if (!Array.isArray(content)) return '';
  return content
    .filter(
      (part): part is { type: 'text'; text: string } => part?.type === 'text' && typeof part.text === 'string'
    )
    .map((part) => part.text)
    .join('');
}

function assertOk(result: unknown, toolName: string): string {
  const text = resultText(result);
  if ((result as { isError?: boolean }).isError) {
    throw new Error(`Contentful's ${toolName} failed: ${text.slice(0, 300)}`);
  }
  return text;
}

export interface ContentfulSession {
  /** `space:environment` pairs the user authorised for this session. */
  environments: { spaceId: string; environmentId: string }[];
}

/**
 * Calls `get_initial_context`, which Contentful's server requires before any
 * other tool ("This tool must be called before using any other tools"). Its
 * prose also names the authorised `space:environment` pairs, which lets the
 * search default sensibly when the agent did not name one.
 */
async function openSession(client: Client): Promise<ContentfulSession> {
  const text = assertOk(
    await client.callTool({ name: 'get_initial_context', arguments: {} }),
    'get_initial_context'
  );

  const environments = [...text.matchAll(/^\s*-\s*([A-Za-z0-9_-]+):([A-Za-z0-9_.-]+)\s*$/gm)].map((m) => ({
    spaceId: m[1],
    environmentId: m[2],
  }));

  return { environments };
}

/**
 * Validates the token and reports the authorised environments.
 *
 * Throwing rather than returning `undefined` matters for diagnosis: the auth
 * wrapper reports a token it never received and a token Contentful refused with
 * the same "No authorization provided" message. A throw surfaces as "Invalid
 * token" instead, and the underlying reason is logged.
 */
const TOKEN_TTL_MS = 60_000;
const tokenCache = new Map<string, { expiresAt: number; session: ContentfulSession }>();

export async function validateContentfulToken(accessToken: string): Promise<ContentfulSession> {
  const cached = tokenCache.get(accessToken);
  if (cached && cached.expiresAt > Date.now()) return cached.session;

  try {
    const session = await withContentfulMcp(accessToken, openSession);
    tokenCache.set(accessToken, { expiresAt: Date.now() + TOKEN_TTL_MS, session });
    return session;
  } catch (error) {
    tokenCache.delete(accessToken);
    throw new ContentfulTokenRejected(error instanceof Error ? error.message : String(error));
  }
}

function resolveTarget(session: ContentfulSession, args: SearchArgs) {
  const fallback = session.environments[0];
  const spaceId = args.spaceId ?? fallback?.spaceId;
  const environmentId = args.environmentId ?? fallback?.environmentId ?? 'master';

  if (!spaceId) {
    throw new Error(
      'No Contentful space is available for this user. Pass spaceId explicitly, or check which ' +
        'spaces were authorised when the Contentful MCP server was connected.'
    );
  }
  return { spaceId, environmentId };
}

/**
 * Contentful exposes no asset *search* tool - only `list_assets`, which takes no
 * query - so asset search is a bounded paged listing filtered here.
 */
async function searchAssets(
  client: Client,
  target: { spaceId: string; environmentId: string },
  args: SearchArgs
): Promise<{ items: SearchResultItem[]; total?: number }> {
  const needle = args.query.trim().toLowerCase();
  const matches: SearchResultItem[] = [];
  let total: number | undefined;
  let skip = 0;

  for (let page = 0; page < MAX_ASSET_PAGES && matches.length < args.limit; page++) {
    const text = assertOk(
      await client.callTool({
        name: 'list_assets',
        arguments: { ...target, limit: ASSET_PAGE_SIZE, skip },
      }),
      'list_assets'
    );

    const batch = parseAssets(text);
    total ??= readTotal(text);
    if (!batch.length) break;

    for (const item of batch) {
      const haystack = `${item.title} ${item.subtitle ?? ''}`.toLowerCase();
      if (!needle || haystack.includes(needle)) matches.push(item);
    }

    skip += ASSET_PAGE_SIZE;
    if (total !== undefined && skip >= total) break;
  }

  return { items: matches.slice(0, args.limit), total };
}

async function searchEntries(
  client: Client,
  target: { spaceId: string; environmentId: string },
  args: SearchArgs
): Promise<{ items: SearchResultItem[]; total?: number }> {
  const text = assertOk(
    await client.callTool({
      name: 'search_entries',
      arguments: {
        ...target,
        // Free text goes in the nested `query.query` key, mirroring the CDA.
        query: { ...(args.query.trim() ? { query: args.query.trim() } : {}), limit: args.limit },
      },
    }),
    'search_entries'
  );

  return { items: parseEntries(text).slice(0, args.limit), total: readTotal(text) };
}

export async function searchContentful(args: SearchArgs, accessToken: string): Promise<SearchResultPayload> {
  return withContentfulMcp(accessToken, async (client) => {
    const session = await openSession(client);
    const target = resolveTarget(session, args);

    const { items, total } =
      args.kind === 'asset'
        ? await searchAssets(client, target, args)
        : await searchEntries(client, target, args);

    return {
      query: args.query,
      total: total ?? items.length,
      items: items.map((item) => ({ ...item, ...target })),
    };
  });
}
