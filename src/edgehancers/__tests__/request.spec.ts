import { describe, test, expect, vi, beforeEach } from 'vitest';
import onRequestHandler from '../request';

import { setupFetchInterceptor } from './_testUtils';
import { SYS_ID_IN_PARAM } from '../lib';
import { setupTestRequestHookContext } from './_testUtils';
import { ARCHETYPES } from '../../constants';
import { getEmptyItems, getMultipleEntriesWithLinks } from './mocks';

// eslint-disable @typescript-eslint/no-explicit-any

describe('onRequestHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('collects surrogate keys', async () => {
    const context = setupTestRequestHookContext({
      batchPartials: [
        {
          archetype: ARCHETYPES.MULTIPLE,
          url: 'https://test.xyz/path',
          parameters: [{ key: SYS_ID_IN_PARAM, value: 'id_1,id_2' }],
        },
      ],
    });

    setupFetchInterceptor(
      'https://test.xyz',
      `/path?${SYS_ID_IN_PARAM}=id_1,id_2`,
      getMultipleEntriesWithLinks(['id_1', 'id_2'])
    );

    const { results } = await onRequestHandler(context);

    expect(results[0].surrogateKeys).toEqual([
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
          archetype: ARCHETYPES.MULTIPLE,
          url: 'https://preview.contentful.com/entries',
          parameters: [{ key: SYS_ID_IN_PARAM, value: 'id_1,id_2,id_3' }],
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

    const { results } = await onRequestHandler(context);

    expect(results[0].warnings).toEqual([
      {
        message: 'Entry "id_1" is not published',
        deepLink: 'https://app.contentful.com/spaces/spaceId/entries/id_1',
        issueReference: 'id_1',
        subType: 'unpublishedData',
      },
      {
        message: 'Entry "id_2" has unpublished changes',
        deepLink: 'https://app.contentful.com/spaces/spaceId/entries/id_2',
        issueReference: 'id_2',
        subType: 'unpublishedData',
      },
    ]);
  });

  test('registers global unpublished content error without duplicates', async () => {
    const context = setupTestRequestHookContext({
      batchPartials: [
        {
          archetype: ARCHETYPES.MULTIPLE,
          url: 'https://preview.contentful.com/entries',
          parameters: [{ key: SYS_ID_IN_PARAM, value: 'id_1,id_2,id_3' }],
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
      `/entries?${SYS_ID_IN_PARAM}=id_1,id_2,id_3`,
      new Error('Failed to fetch entries')
    );

    const { results } = await onRequestHandler(context);

    expect(results[0].errors).toEqual([
      {
        message:
          'Could not fetch batched CMA response: \nGET https://api.contentful.com/entries?select=sys&sys.id%5Bin%5D=id_1%2Cid_2%2Cid_3 \nReturned error: fetch failed',
      },
    ]);
  });

  test('guard - has expected response', async () => {
    const context = setupTestRequestHookContext({
      batchPartials: [
        {
          archetype: ARCHETYPES.MULTIPLE,
          url: 'https://test.xyz/path',
          parameters: [{ key: SYS_ID_IN_PARAM, value: 'id_1,id_2' }],
        },
      ],
    });

    setupFetchInterceptor(
      'https://test.xyz',
      `/path?${SYS_ID_IN_PARAM}=id_1,id_2`,
      getMultipleEntriesWithLinks(['id_1', 'id_2'])
    );

    const { results } = await onRequestHandler(context);
    expect(results).toMatchSnapshot();
  });
});
