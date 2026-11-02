import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { parseAssets, parseEntries, readTotal, splitItemBlocks } from '../contentfulPayload';

const fixture = (name: string) => readFileSync(join(__dirname, 'fixtures', name), 'utf8');

const assets = fixture('assets.txt');
const entries = fixture('entries.txt');

describe('parseAssets', () => {
  it('reads every asset in the page', () => {
    expect(parseAssets(assets)).toHaveLength(3);
  });

  it('maps the flat asset shape', () => {
    const [first] = parseAssets(assets);
    expect(first).toMatchObject({
      id: '4kiqMmS4OUGc6rF5qWW3No',
      kind: 'asset',
      title: 'Midsummer collection upd',
      subtitle: 'en description',
      contentType: 'image/avif',
      updatedAt: '2026-07-22T12:28:35.804Z',
    });
  });

  it('absolutises the protocol-relative CDN url', () => {
    expect(parseAssets(assets)[0].thumbnailUrl).toBe(
      'https://images.ctfassets.net/o6go8mb2jj2p/4kiqMmS4OUGc6rF5qWW3No/e3a5fd7682f51873d101dc1dc033e716/pas-boiz-2.avif'
    );
  });

  it('leaves a draft asset with no file without a thumbnail', () => {
    const draft = parseAssets(assets).find((a) => a.id === '2fEfWDFONFpZ05vTJIOm0D');
    expect(draft?.thumbnailUrl).toBeUndefined();
    expect(draft?.title).toBe('test draft asset');
  });
});

describe('parseEntries', () => {
  it('reads every entry in the page', () => {
    expect(parseEntries(entries)).toHaveLength(3);
  });

  it('takes sys.id rather than the linked space id', () => {
    expect(parseEntries(entries)[0].id).toBe('3J3cmQLwUyfFhs8JOlhwVM');
  });

  it('resolves the content type from the sys link', () => {
    expect(parseEntries(entries)[0].contentType).toBe('hero');
  });

  it('unwraps locale-keyed fields, preferring the requested locale', () => {
    expect(parseEntries(entries, 'en-US')[0].title).toBe('Single entry Content #7');
    expect(parseEntries(entries, 'de')[0].title).toBe('Single entry Content #7');
  });

  it('survives the non-conforming <*> element in sys.fieldStatus', () => {
    // A conforming XML parser rejects `<*>` outright, which is why the payload
    // is scanned instead of parsed.
    expect(entries).toContain('<*>');
    expect(parseEntries(entries).every((e) => e.id && e.title)).toBe(true);
  });
});

describe('splitItemBlocks / readTotal', () => {
  it('reports the collection total, not just the page size', () => {
    expect(readTotal(assets)).toBe(22);
    expect(readTotal(entries)).toBe(45);
    expect(splitItemBlocks(assets)).toHaveLength(3);
  });

  it('returns nothing for an empty payload', () => {
    expect(splitItemBlocks('no items here')).toEqual([]);
    expect(parseAssets('')).toEqual([]);
  });
});
