import { describe, test, expect, vi, beforeEach } from 'vitest';
import onSingleArchetypeRequestHandler from '../requestSingle';

import { setupFetchInterceptor } from './_testUtils';
import { ContentfulEntity, SINGLE_ENTRY_BATCH_SIZE, SYS_ID_IN_PARAM } from '../lib';
import { setupTestRequestHookContext } from './_testUtils';
import { ARCHETYPES } from '../../constants';
import { getEmptyItems, getMultipleEntriesWithLinks, getSingleEntryWithLinks } from './mocks';

// eslint-disable @typescript-eslint/no-explicit-any

describe('onSingleArchetypeRequestHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('returns error for data resources if not exact one ID', async () => {
    const context = setupTestRequestHookContext({
      batchPartials: [
        {
          archetype: ARCHETYPES.SINGLE,
          parameters: [{ key: SYS_ID_IN_PARAM, value: 'id_1,id_2,id_3' }],
        },
        {
          archetype: ARCHETYPES.SINGLE,
          parameters: [{ key: SYS_ID_IN_PARAM, value: 'id_1,id_2' }],
        },
        {
          archetype: ARCHETYPES.SINGLE,
          parameters: [],
        },
      ],
    });

    const { results } = await onSingleArchetypeRequestHandler(context);

    expect(results[0].errors?.length).toBe(1);
    expect(results[0].errors?.[0]).toStrictEqual({
      message: 'Contentful single entry resolver requires exactly one ID',
    });
    expect(results[0].result).toBeUndefined();

    expect(results[1].errors?.length).toBe(1);
    expect(results[1].errors?.[0]).toStrictEqual({
      message: 'Contentful single entry resolver requires exactly one ID',
    });
    expect(results[1].result).toBeUndefined();

    expect(results[2].errors?.length).toBe(1);
    expect(results[2].errors?.[0]).toStrictEqual({
      message: 'Contentful single entry resolver requires exactly one ID',
    });
    expect(results[2].result).toBeUndefined();
  });

  test('batches requests by IDs if other parameters are the same', async () => {
    const context = setupTestRequestHookContext({
      batchPartials: [
        {
          archetype: ARCHETYPES.SINGLE,
          url: 'https://test.xyz/path',
          parameters: [{ key: SYS_ID_IN_PARAM, value: 'id_1' }],
        },
        {
          archetype: ARCHETYPES.SINGLE,
          url: 'https://test.xyz/path',
          parameters: [{ key: SYS_ID_IN_PARAM, value: 'id_2' }],
        },
        {
          archetype: ARCHETYPES.SINGLE,
          url: 'https://test.xyz/path',
          parameters: [
            { key: 'include', value: '1' },
            { key: SYS_ID_IN_PARAM, value: 'id_1' },
          ],
        },
        {
          archetype: ARCHETYPES.SINGLE,
          url: 'https://test.xyz/path',
          parameters: [
            { key: 'include', value: '1' },
            { key: SYS_ID_IN_PARAM, value: 'id_2' },
          ],
        },
        {
          archetype: ARCHETYPES.SINGLE,
          url: 'https://test-preview.xyz/path',
          parameters: [
            { key: 'include', value: '1' },
            { key: SYS_ID_IN_PARAM, value: 'id_1' },
          ],
        },
      ],
    });

    setupFetchInterceptor(
      'https://test.xyz',
      `/path?${SYS_ID_IN_PARAM}=id_1,id_2`,
      getEmptyItems(['id_1', 'id_2'])
    );
    setupFetchInterceptor(
      'https://test.xyz',
      `/path?include=1&${SYS_ID_IN_PARAM}=id_1,id_2`,
      getEmptyItems(['id_1', 'id_2'])
    );
    setupFetchInterceptor(
      'https://test-preview.xyz',
      `/path?include=1&${SYS_ID_IN_PARAM}=id_1`,
      getEmptyItems(['id_1'])
    );

    const { results } = await onSingleArchetypeRequestHandler(context);

    expect(results[0].result).toBeDefined();
    expect((results[0].result as ContentfulEntity).sys.id).toBe('id_1');
    expect(results[0].errors?.length).toBeFalsy();

    expect(results[1].result).toBeDefined();
    expect((results[1].result as ContentfulEntity).sys.id).toBe('id_2');
    expect(results[1].errors?.length).toBeFalsy();

    expect(results[2].result).toBeDefined();
    expect((results[2].result as ContentfulEntity).sys.id).toBe('id_1');
    expect(results[2].errors?.length).toBeFalsy();

    expect(results[3].result).toBeDefined();
    expect((results[3].result as ContentfulEntity).sys.id).toBe('id_2');
    expect(results[3].errors?.length).toBeFalsy();

    expect(results[4].result).toBeDefined();
    expect((results[4].result as ContentfulEntity).sys.id).toBe('id_1');
    expect(results[4].errors?.length).toBeFalsy();
  });

  test(`batches up to ${SINGLE_ENTRY_BATCH_SIZE} items per batch`, async () => {
    const context = setupTestRequestHookContext({
      batchPartials: Array.from(Array(SINGLE_ENTRY_BATCH_SIZE + 1).keys()).map((i) => ({
        archetype: ARCHETYPES.SINGLE,
        url: 'https://test.xyz/path',
        parameters: [{ key: SYS_ID_IN_PARAM, value: `id_${i}` }],
      })),
    });

    setupFetchInterceptor(
      'https://test.xyz',
      `/path?${SYS_ID_IN_PARAM}=${Array.from(Array(SINGLE_ENTRY_BATCH_SIZE).keys())
        .map((i) => `id_${i}`)
        .sort()
        .join(',')}`,
      getEmptyItems(Array.from(Array(SINGLE_ENTRY_BATCH_SIZE).keys()).map((i) => `id_${i}`))
    );

    setupFetchInterceptor(
      'https://test.xyz',
      `/path?${SYS_ID_IN_PARAM}=id_${SINGLE_ENTRY_BATCH_SIZE}`,
      getEmptyItems([`id_${SINGLE_ENTRY_BATCH_SIZE}`])
    );

    const { results } = await onSingleArchetypeRequestHandler(context);

    for (let i = 0; i < SINGLE_ENTRY_BATCH_SIZE + 1; i++) {
      expect(results[i].result).toBeDefined();
      expect(results[i].errors?.length).toBeFalsy();
      expect((results[i].result as ContentfulEntity).sys.id).toBe(`id_${i}`);
    }
  });

  test('returns shared error if batched request fails', async () => {
    const context = setupTestRequestHookContext({
      batchPartials: [
        {
          archetype: ARCHETYPES.SINGLE,
          url: 'https://test.xyz/path',
          parameters: [{ key: SYS_ID_IN_PARAM, value: 'id_1' }],
        },
        {
          archetype: ARCHETYPES.SINGLE,
          url: 'https://test.xyz/path',
          parameters: [{ key: SYS_ID_IN_PARAM, value: 'id_2' }],
        },
        {
          archetype: ARCHETYPES.SINGLE,
          url: 'https://test.xyz/path',
          parameters: [
            { key: 'include', value: '1' },
            { key: SYS_ID_IN_PARAM, value: 'id_1' },
          ],
        },
        {
          archetype: ARCHETYPES.SINGLE,
          url: 'https://test.xyz/path',
          parameters: [
            { key: 'include', value: '1' },
            { key: SYS_ID_IN_PARAM, value: 'id_2' },
          ],
        },
      ],
    });

    setupFetchInterceptor(
      'https://test.xyz',
      `/path?${SYS_ID_IN_PARAM}=id_1,id_2`,
      new Error('Fetch failed')
    );
    setupFetchInterceptor(
      'https://test.xyz',
      `/path?include=1&${SYS_ID_IN_PARAM}=id_1,id_2`,
      new Error('Fetch failed')
    );

    const { results } = await onSingleArchetypeRequestHandler(context);

    expect(results[0].result).toBeUndefined();
    expect(results[0].errors?.length).toBe(1);
    expect((results[0].errors?.[0] as any).message).toContain(
      'https://test.xyz/path?sys.id%5Bin%5D=id_1%2Cid_2'
    );

    expect(results[1].result).toBeUndefined();
    expect(results[1].errors?.length).toBe(1);
    expect((results[1].errors?.[0] as any).message).toContain(
      'https://test.xyz/path?sys.id%5Bin%5D=id_1%2Cid_2'
    );

    expect(results[2].result).toBeUndefined();
    expect(results[2].errors?.length).toBe(1);
    expect((results[2].errors?.[0] as any).message).toContain(
      'https://test.xyz/path?include=1&sys.id%5Bin%5D=id_1%2Cid_2'
    );

    expect(results[3].result).toBeUndefined();
    expect(results[3].errors?.length).toBe(1);
    expect((results[3].errors?.[0] as any).message).toContain(
      'https://test.xyz/path?include=1&sys.id%5Bin%5D=id_1%2Cid_2'
    );
  });

  test('returns results for all batches even if some batched request fails', async () => {
    const context = setupTestRequestHookContext({
      batchPartials: [
        {
          archetype: ARCHETYPES.SINGLE,
          url: 'https://test.xyz/path',
          parameters: [{ key: SYS_ID_IN_PARAM, value: 'id_1' }],
        },
        {
          archetype: ARCHETYPES.SINGLE,
          url: 'https://test.xyz/path',
          parameters: [
            { key: 'include', value: '1' },
            { key: SYS_ID_IN_PARAM, value: 'id_1' },
          ],
        },
        {
          archetype: ARCHETYPES.SINGLE,
          url: 'https://test.xyz/path',
          parameters: [
            { key: 'include', value: '1' },
            { key: SYS_ID_IN_PARAM, value: 'id_2' },
          ],
        },
      ],
    });

    setupFetchInterceptor('https://test.xyz', `/path?${SYS_ID_IN_PARAM}=id_1`, new Error('Fetch failed'));
    setupFetchInterceptor(
      'https://test.xyz',
      `/path?include=1&${SYS_ID_IN_PARAM}=id_1`,
      getEmptyItems(['id_1']).items[0]
    );

    const { results } = await onSingleArchetypeRequestHandler(context);

    expect(results[0].result).toBeUndefined();
    expect(results[0].errors?.length).toBe(1);
    expect((results[0].errors?.[0] as any).message).toContain('https://test.xyz/path?sys.id%5Bin%5D=id_1');

    expect(results[1].result).toBeUndefined();
    expect(results[1].errors?.length).toBe(1);
    expect((results[1].errors?.[0] as any).message).toContain(
      'https://test.xyz/path?include=1&sys.id%5Bin%5D=id_1'
    );
  });

  test('returns error if items was not found in batched response', async () => {
    const context = setupTestRequestHookContext({
      batchPartials: [
        {
          archetype: ARCHETYPES.SINGLE,
          url: 'https://test.xyz/path',
          parameters: [{ key: SYS_ID_IN_PARAM, value: 'id_1' }],
        },
        {
          archetype: ARCHETYPES.SINGLE,
          url: 'https://test.xyz/path',
          parameters: [{ key: SYS_ID_IN_PARAM, value: 'id_2' }],
        },
      ],
    });

    setupFetchInterceptor('https://test.xyz', `/path?${SYS_ID_IN_PARAM}=id_1,id_2`, getEmptyItems(['id_1']));

    const { results } = await onSingleArchetypeRequestHandler(context);

    expect(results[0].result).toBeDefined();
    expect((results[0].result as ContentfulEntity).sys.id).toBe(`id_1`);
    expect(results[0].errors?.length).toBeFalsy();

    expect(results[1].result).toBeUndefined();
    expect(results[1].errors?.length).toBe(1);
  });

  test('collects surrogate keys', async () => {
    const context = setupTestRequestHookContext({
      batchPartials: [
        {
          archetype: ARCHETYPES.SINGLE,
          url: 'https://test.xyz/path',
          parameters: [{ key: SYS_ID_IN_PARAM, value: 'id_1' }],
        },
        {
          archetype: ARCHETYPES.SINGLE,
          url: 'https://test.xyz/path',
          parameters: [{ key: SYS_ID_IN_PARAM, value: 'id_2' }],
        },
      ],
    });

    setupFetchInterceptor(
      'https://test.xyz',
      `/path?${SYS_ID_IN_PARAM}=id_1,id_2`,
      getMultipleEntriesWithLinks(['id_1', 'id_2'])
    );

    const { results } = await onSingleArchetypeRequestHandler(context);

    expect(results[0].surrogateKeys).toEqual([
      'Asset:2HquYLn9LDf6yqxmQ2525o',
      'Entry:cyclic-entry',
      'Entry:id_1',
      'Entry:linked-entry',
    ]);
    expect(results[1].surrogateKeys).toEqual([
      'Asset:2HquYLn9LDf6yqxmQ2525o',
      'Entry:cyclic-entry',
      'Entry:id_1',
      'Entry:id_2',
      'Entry:linked-entry',
    ]);
  });

  test('resolves unpublished content warnings', async () => {
    const context = setupTestRequestHookContext({
      batchPartials: [
        {
          archetype: ARCHETYPES.SINGLE,
          url: 'https://preview.contentful.com/entries',
          parameters: [{ key: SYS_ID_IN_PARAM, value: 'id_1' }],
          enableUnpublishedMode: true,
          custom: {
            contentManagementToken: 'token',
            spaceId: 'spaceId',
          },
        },
        {
          archetype: ARCHETYPES.SINGLE,
          url: 'https://preview.contentful.com/entries',
          parameters: [{ key: SYS_ID_IN_PARAM, value: 'id_2' }],
          enableUnpublishedMode: true,
          custom: {
            contentManagementToken: 'token',
            spaceId: 'spaceId',
          },
        },
        {
          archetype: ARCHETYPES.SINGLE,
          url: 'https://preview.contentful.com/entries',
          parameters: [{ key: SYS_ID_IN_PARAM, value: 'id_3' }],
          enableUnpublishedMode: true,
          custom: {
            contentManagementToken: 'token',
            spaceId: 'spaceId',
          },
        },
      ],
      dataSourceVariant: 'unpublished',
    });

    setupFetchInterceptor(
      'https://preview.contentful.com',
      `/entries?${SYS_ID_IN_PARAM}=id_1,id_2,id_3`,
      getEmptyItems(['id_1', 'id_2', 'id_3'])
    );

    // https://www.contentful.com/developers/docs/tutorials/general/determine-entry-asset-state/
    setupFetchInterceptor(
      'https://api.contentful.com',
      `/entries?select=sys&${SYS_ID_IN_PARAM}=id_1,id_2,id_3`,
      {
        sys: {
          type: 'Array',
        },
        items: [
          // draft
          {
            sys: {
              type: 'Entry',
              id: 'id_1',
            },
          },
          // changed
          {
            sys: {
              type: 'Entry',
              id: 'id_2',
              publishedVersion: 1,
              version: 3,
            },
          },
          // published
          {
            sys: {
              type: 'Entry',
              id: 'id_3',
              publishedVersion: 1,
            },
          },
        ],
      }
    );

    const { results } = await onSingleArchetypeRequestHandler(context);

    expect(results[0].warnings).toEqual([
      {
        message: 'Entry "id_1" is not published',
        deepLink: 'https://app.contentful.com/spaces/spaceId/entries/id_1',
        issueReference: 'id_1',
        subType: 'unpublishedData',
      },
    ]);
    expect(results[1].warnings).toEqual([
      {
        message: 'Entry "id_2" has unpublished changes',
        deepLink: 'https://app.contentful.com/spaces/spaceId/entries/id_2',
        issueReference: 'id_2',
        subType: 'unpublishedData',
      },
    ]);
    expect(results[2].warnings?.length).toBeFalsy();
  });

  test('registers global unpublished content error to each batched result', async () => {
    const context = setupTestRequestHookContext({
      batchPartials: [
        {
          archetype: ARCHETYPES.SINGLE,
          url: 'https://preview.contentful.com/entries',
          parameters: [{ key: SYS_ID_IN_PARAM, value: 'id_1' }],
          enableUnpublishedMode: true,
          custom: {
            contentManagementToken: 'token',
            spaceId: 'spaceId',
          },
        },
        {
          archetype: ARCHETYPES.SINGLE,
          url: 'https://preview.contentful.com/entries',
          parameters: [{ key: SYS_ID_IN_PARAM, value: 'id_2' }],
          enableUnpublishedMode: true,
          custom: {
            contentManagementToken: 'token',
            spaceId: 'spaceId',
          },
        },
        {
          archetype: ARCHETYPES.SINGLE,
          url: 'https://preview.contentful.com/entries',
          parameters: [
            { key: 'include', value: '0' },
            { key: SYS_ID_IN_PARAM, value: 'id_3' },
          ],
          enableUnpublishedMode: true,
          custom: {
            contentManagementToken: 'token',
            spaceId: 'spaceId',
          },
        },
      ],
      dataSourceVariant: 'unpublished',
    });

    setupFetchInterceptor(
      'https://preview.contentful.com',
      `/entries?${SYS_ID_IN_PARAM}=id_1,id_2`,
      getEmptyItems(['id_1', 'id_2'])
    );
    setupFetchInterceptor(
      'https://preview.contentful.com',
      `/entries?include=0&${SYS_ID_IN_PARAM}=id_3`,
      getEmptyItems(['id_3'])
    );

    // https://www.contentful.com/developers/docs/tutorials/general/determine-entry-asset-state/
    setupFetchInterceptor(
      'https://api.contentful.com',
      `/entries?${SYS_ID_IN_PARAM}=id_1,id_2,id_3`,
      new Error('Failed to fetch entries')
    );

    const { results } = await onSingleArchetypeRequestHandler(context);

    const message =
      'Could not fetch batched CMA response: \nGET https://api.contentful.com/entries?select=sys&sys.id%5Bin%5D=id_1%2Cid_2%2Cid_3 \nReturned error: fetch failed';

    expect(results[0].errors).toEqual([
      {
        message,
      },
    ]);
    expect(results[1].errors).toEqual([
      {
        message,
      },
    ]);
    expect(results[2].errors).toEqual([
      {
        message,
      },
    ]);
  });

  test('guard - has expected response', async () => {
    const context = setupTestRequestHookContext({
      batchPartials: [
        {
          archetype: ARCHETYPES.SINGLE,
          url: 'https://test.xyz/path',
          parameters: [{ key: SYS_ID_IN_PARAM, value: 'id_1' }],
        },
      ],
    });

    setupFetchInterceptor(
      'https://test.xyz',
      `/path?${SYS_ID_IN_PARAM}=id_1`,
      getSingleEntryWithLinks('id_1')
    );

    const { results } = await onSingleArchetypeRequestHandler(context);
    expect(results).toMatchSnapshot();
  });
});
