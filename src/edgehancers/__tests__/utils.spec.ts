import { expect, test, describe } from 'vitest';
import { RequestEdgehancerDataResourceResolutionResult } from '@uniformdev/mesh-edgehancer-sdk';

import {
  catchMissplacedQueryParams,
  collectSurrogateKeys,
  ContentfulEntity,
  ContentfulResponse,
  extractRequestedIds,
  fetchContentful,
  groupBy,
  removeCyclesFromItem,
  toChunks,
} from '../lib';
import { setupFetchInterceptor, setupTestRequestHookContext } from './_testUtils';
import { getSingleEntryWithLinks } from './mocks';
import { ARCHETYPES } from '../../constants';

// eslint-disable @typescript-eslint/no-explicit-any

describe('toChunks', () => {
  test('returns empty array if input array is empty', () => {
    const result = toChunks([], 30);
    expect(result).toEqual([]);
  });

  test('returns array of chunks', () => {
    const result = toChunks([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3);
    expect(result).toEqual([[1, 2, 3], [4, 5, 6], [7, 8, 9], [10]]);
  });

  test('handles chunk size equal to array length', () => {
    const result = toChunks([1, 2, 3], 3);
    expect(result).toEqual([[1, 2, 3]]);
  });

  test('handles chunk size larger than array length', () => {
    const result = toChunks([1, 2], 5);
    expect(result).toEqual([[1, 2]]);
  });

  test('preserves original array elements', () => {
    const input = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
    const result = toChunks(input, 2);
    expect(result).toEqual([
      [{ id: 1 }, { id: 2 }],
      [{ id: 3 }, { id: 4 }],
    ]);
  });

  test('throws an error if size is less than 1', () => {
    expect(() => toChunks([1, 2, 3], 0)).toThrow();
  });
});

describe('extractRequestedIds', () => {
  test('extracts ids from URL search params', () => {
    const url = 'https://api.contentful.com/spaces/123/entries?sys.id[in]=abc,def';
    const result = extractRequestedIds(url);
    expect(result).toEqual(['abc', 'def']);
  });

  test('handles empty sys.id[in] parameter', () => {
    const url = 'https://api.contentful.com/spaces/123/entries?sys.id[in]=';
    const result = extractRequestedIds(url);
    expect(result).toEqual([]);
  });

  test('handles missing sys.id[in] parameter', () => {
    const url = 'https://api.contentful.com/spaces/123/entries';
    const result = extractRequestedIds(url);
    expect(result).toEqual([]);
  });

  test('deduplicates ids', () => {
    const url = 'https://api.contentful.com/spaces/123/entries?sys.id[in]=abc,abc,def';
    const result = extractRequestedIds(url);
    expect(result).toEqual(['abc', 'def']);
  });

  test('trims whitespace from ids', () => {
    const url = 'https://api.contentful.com/spaces/123/entries?sys.id[in]=abc, def , ghi';
    const result = extractRequestedIds(url);
    expect(result).toEqual(['abc', 'def', 'ghi']);
  });

  test('filters out empty ids', () => {
    const url = 'https://api.contentful.com/spaces/123/entries?sys.id[in]=abc,,def,,,ghi';
    const result = extractRequestedIds(url);
    expect(result).toEqual(['abc', 'def', 'ghi']);
  });
});

describe('collectSurrogateKeys', () => {
  test('returns empty array for empty input', () => {
    expect(collectSurrogateKeys([])).toEqual([]);
  });

  test('collects surrogate keys from contentful objects', () => {
    const items = [
      {
        sys: {
          type: 'Entry',
          id: 'entry-1',
        },
      },
      {
        sys: {
          type: 'Asset',
          id: 'asset-1',
        },
      },
    ] satisfies ContentfulResponse['items'];

    expect(collectSurrogateKeys(items)).toEqual(['Asset:asset-1', 'Entry:entry-1']);
  });

  test('collects nested surrogate keys', () => {
    const items = [
      {
        sys: {
          type: 'Entry',
          id: 'parent',
        },
        fields: {
          reference: {
            sys: {
              type: 'Entry',
              id: 'child',
            },
          },
        },
      },
    ] satisfies ContentfulResponse['items'];

    expect(collectSurrogateKeys(items)).toEqual(['Entry:child', 'Entry:parent']);
  });

  test('ignores non-contentful objects', () => {
    const items = [
      {
        sys: {
          type: 'Entry',
          id: 'entry-1',
        },
        fields: {
          fake: { type: 'Entry', id: 'fake-1' },
        },
      },
    ] satisfies ContentfulResponse['items'];

    expect(collectSurrogateKeys(items)).toEqual(['Entry:entry-1']);
  });

  test('sorts keys alphabetically', () => {
    const items = [
      {
        sys: {
          type: 'Entry',
          id: 'zzz',
        },
      },
      {
        sys: {
          type: 'Asset',
          id: 'aaa',
        },
      },
    ] satisfies ContentfulResponse['items'];

    expect(collectSurrogateKeys(items)).toEqual(['Asset:aaa', 'Entry:zzz']);
  });

  test('returns unique surrogate keys', () => {
    const items = [
      {
        sys: {
          type: 'Entry',
          id: 'entry-1',
        },
      },
      {
        sys: {
          type: 'Entry',
          id: 'entry-1',
        },
      },
      {
        sys: {
          type: 'Asset',
          id: 'asset-1',
        },
      },
      {
        sys: {
          type: 'Asset',
          id: 'asset-1',
        },
      },
    ] satisfies ContentfulResponse['items'];

    expect(collectSurrogateKeys(items)).toEqual(['Asset:asset-1', 'Entry:entry-1']);
  });
});

describe('fetchContentful', () => {
  test('returns error if response is not ok', async () => {
    setupFetchInterceptor('https://test.com', `/path`, 'Not Found', 404);

    const request = new Request('https://test.com/path');
    const result = await fetchContentful(request);

    expect(result.error).toBeDefined();
    expect(result.response).toBeUndefined();
  });

  test('returns error if response is not json', async () => {
    setupFetchInterceptor('https://test.com', `/path`, 'Not JSON', 200);

    const request = new Request('https://test.com/path');
    const result = await fetchContentful(request);

    expect(result.error).toBeDefined();
    expect(result.response).toBeUndefined();
  });

  test('handles network errors', async () => {
    setupFetchInterceptor('https://test.com', `/path`, new Error('Network error'), 500);

    const request = new Request('https://test.com/path');
    const result = await fetchContentful(request);

    expect(result.error).toBeDefined();
    expect(result.response).toBeUndefined();
  });

  test('returns error if response is not valid Contentful response', async () => {
    const mockResponse = { data: 'test' };
    setupFetchInterceptor('https://test.com', `/path`, mockResponse, 200);

    const request = new Request('https://test.com/path');
    const result = await fetchContentful(request);

    expect(result.error).toBeDefined();
    expect(result.response).toBeUndefined();
  });

  test('retries on rate limit error', async () => {
    const maxAttempts = 2;
    setupFetchInterceptor('https://test.com', `/path`, 'Rate limit', 429, maxAttempts);

    const request = new Request('https://test.com/path');
    const result = await fetchContentful(request, maxAttempts);

    expect(result.error).toEqual(
      `GET https://test.com/path \nFailed with status 429 after ${maxAttempts} attempts`
    );
    expect(result.response).toBeUndefined();
  });

  test('returns parsed Contentful response', async () => {
    const mockResponse = getSingleEntryWithLinks('id_1');
    setupFetchInterceptor('https://test.com', `/path`, mockResponse, 200);

    const request = new Request('https://test.com/path');
    const result = await fetchContentful(request);

    expect(result.response).toStrictEqual(mockResponse);
    expect(result.error).toBeUndefined();
  });
});

describe('groupBy', () => {
  test('groups array items by key', () => {
    const input = [
      { id: 'a', value: 1 },
      { id: 'b', value: 2 },
      { id: 'a', value: 3 },
      { id: 'c', value: 4 },
    ];

    const result = groupBy(input, (item) => item.id);

    expect(result).toStrictEqual({
      a: [
        { id: 'a', value: 1 },
        { id: 'a', value: 3 },
      ],
      b: [{ id: 'b', value: 2 }],
      c: [{ id: 'c', value: 4 }],
    });
  });

  test('handles empty array', () => {
    const result = groupBy([], (item) => String(item));
    expect(result).toEqual({});
  });

  test('handles undefined key', () => {
    const result = groupBy(
      [
        { id: 'a', value: 1 },
        { id: 'b', value: 2 },
      ],
      () => ''
    );
    expect(result).toEqual({});
  });
});

describe('removeCyclesFromItem', () => {
  test('replaces circular references with link objects', () => {
    const circular: ContentfulEntity = {
      sys: { type: 'Entry', id: 'test1' },
      fields: {
        self: {},
      },
    };
    circular.fields!.self = circular;

    const result = removeCyclesFromItem(circular, 3);

    expect(result.fields?.self).toEqual({
      sys: {
        type: 'Link',
        linkType: 'Entry',
        id: 'test1',
        circular: true,
      },
    });
  });

  test('truncates nested entries beyond maxDepth', () => {
    const deep: ContentfulEntity = {
      sys: { type: 'Entry', id: 'test1' },
      fields: {
        ref: {
          sys: { type: 'Entry', id: 'test2' },
          fields: {
            ref: {
              sys: { type: 'Entry', id: 'test3' },
              fields: {
                value: 'test',
              },
            },
          },
        },
      },
    };

    const result = removeCyclesFromItem(deep, 1);

    const entry = result.fields?.ref as ContentfulEntity;
    expect(entry.sys.type).toBe('Entry');
    expect(entry.sys.id).toBe('test2');

    expect(entry.fields?.ref).toEqual({
      sys: {
        type: 'Link',
        linkType: 'Entry',
        id: 'test3',
      },
    });
  });

  test('handles non-contentful circular references', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    const item: ContentfulEntity = {
      sys: { type: 'Entry', id: 'test1' },
      fields: { circular },
    };

    const result = removeCyclesFromItem(item, 3);

    expect((result.fields?.circular as any).self).toBe('[Circular]');
  });

  test('preserves non-circular nested objects', () => {
    const input: ContentfulEntity = {
      sys: { type: 'Entry', id: 'test1' },
      fields: {
        nested: {
          foo: 'bar',
          baz: {
            qux: 123,
          },
        },
      },
    };

    const result = removeCyclesFromItem(input, 3);

    expect(result).toEqual(input);
  });
});

describe('catchMissplacedQueryParams', () => {
  test('returns true and adds error if URL contains query params', () => {
    const context = setupTestRequestHookContext({
      batchPartials: [
        {
          archetype: ARCHETYPES.MULTIPLE,
          url: 'https://test.xyz/path?foo=bar',
        },
      ],
    });
    const result: RequestEdgehancerDataResourceResolutionResult = { result: {} };

    const hasError = catchMissplacedQueryParams(context.dataResources[0].dataResource, result);

    expect(hasError).toBe(true);
    expect(result.errors).toBeDefined();
    expect(result.errors?.length).toBe(1);
  });

  test('returns false if URL has no query params', () => {
    const context = setupTestRequestHookContext({
      batchPartials: [
        {
          archetype: ARCHETYPES.MULTIPLE,
          url: 'https://test.xyz/path',
        },
      ],
    });
    const result: RequestEdgehancerDataResourceResolutionResult = { result: {} };

    const hasError = catchMissplacedQueryParams(context.dataResources[0].dataResource, result);

    expect(hasError).toBe(false);
    expect(result.errors).toBeUndefined();
  });
});
