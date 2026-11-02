import { SearchResultItem } from './constants';

/**
 * Contentful's MCP tools answer with a prose preamble followed by an XML-ish
 * rendering of the API response - not JSON, and not well-formed XML either
 * (entry `sys.fieldStatus` uses `<*>` as an element name, which no conforming
 * parser accepts). So the payload is scanned rather than parsed.
 */

/** Splits the top-level `<items>...</items>` blocks out of a response body. */
export function splitItemBlocks(payload: string): string[] {
  const blocks: string[] = [];
  const open = /<items>/g;
  let match: RegExpExecArray | null;

  while ((match = open.exec(payload))) {
    const start = match.index + match[0].length;
    // `<items>` blocks are siblings, never nested, so the next close wins.
    const end = payload.indexOf('</items>', start);
    if (end === -1) break;
    blocks.push(payload.slice(start, end));
    open.lastIndex = end;
  }
  return blocks;
}

const unescapeXml = (value: string) =>
  value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');

/**
 * Reads the first `<tag>` directly inside `block`, ignoring self-closing empty
 * tags such as `<description/>`.
 */
export function readTag(block: string, tag: string): string | undefined {
  const match = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(block);
  if (!match) return undefined;
  const value = unescapeXml(match[1]).trim();
  return value.length ? value : undefined;
}

/**
 * Entry fields are locale-keyed (`<title><de>..</de><en-US>..</en-US></title>`).
 * Takes the preferred locale when present, otherwise the first one listed.
 */
export function readLocalisedField(
  block: string,
  field: string,
  preferredLocale?: string
): string | undefined {
  const container = new RegExp(`<${field}>([\\s\\S]*?)</${field}>`).exec(block);
  if (!container) return undefined;
  const inner = container[1];

  if (preferredLocale) {
    const exact = readTag(inner, preferredLocale.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    if (exact) return exact;
  }
  const first = /<([A-Za-z0-9-]+)>([\s\S]*?)<\/\1>/.exec(inner);
  return first ? unescapeXml(first[2]).trim() || undefined : undefined;
}

/** `list_assets` items are flat, with a protocol-relative `url`. */
export function parseAssets(payload: string): SearchResultItem[] {
  return splitItemBlocks(payload)
    .map<SearchResultItem | undefined>((block) => {
      const id = readTag(block, 'id');
      if (!id) return undefined;
      const url = readTag(block, 'url');
      return {
        id,
        kind: 'asset',
        title: readTag(block, 'title') ?? readTag(block, 'fileName') ?? id,
        subtitle: readTag(block, 'description') ?? readTag(block, 'fileName'),
        contentType: readTag(block, 'contentType') ?? 'asset',
        thumbnailUrl: url ? (url.startsWith('//') ? `https:${url}` : url) : undefined,
        updatedAt: readTag(block, 'updatedAt'),
      };
    })
    .filter((item): item is SearchResultItem => Boolean(item));
}

/** `search_entries` items are the CMA entry shape rendered as XML. */
export function parseEntries(payload: string, preferredLocale?: string): SearchResultItem[] {
  return splitItemBlocks(payload)
    .map<SearchResultItem | undefined>((block) => {
      const sys = /<sys>([\s\S]*?)<\/sys>\s*<fields>/.exec(block)?.[1] ?? block;
      const fields = /<fields>([\s\S]*?)<\/fields>/.exec(block)?.[1] ?? '';

      // `sys.id` sits alongside nested `<space><sys><id>` blocks, so read the
      // id that is not inside a link wrapper.
      const id = /<id>([^<]+)<\/id>\s*<type>Entry<\/type>/.exec(sys)?.[1] ?? readTag(sys, 'id');
      if (!id) return undefined;

      const contentType = /<contentType>[\s\S]*?<id>([^<]+)<\/id>[\s\S]*?<\/contentType>/.exec(sys)?.[1];

      return {
        id,
        kind: 'entry',
        title:
          readLocalisedField(fields, 'title', preferredLocale) ??
          readLocalisedField(fields, 'name', preferredLocale) ??
          readLocalisedField(fields, 'internalName', preferredLocale) ??
          id,
        subtitle: readLocalisedField(fields, 'description', preferredLocale)
          ?.replace(/\s+/g, ' ')
          .slice(0, 120),
        contentType: contentType ?? 'entry',
        updatedAt: readTag(sys, 'updatedAt'),
      };
    })
    .filter((item): item is SearchResultItem => Boolean(item));
}

/** The reported collection size, which exceeds the returned page. */
export function readTotal(payload: string): number | undefined {
  const total = /<total>(\d+)<\/total>/.exec(payload)?.[1];
  return total ? Number(total) : undefined;
}
