import { describe, test, expect, vi, beforeEach } from 'vitest';
import { RequestEdgehancerDataResourceResolutionResult } from '@uniformdev/mesh-edgehancer-sdk';

import { createPublishingStatusResolver, SYS_ID_IN_PARAM } from '../lib';
import { setupFetchInterceptor, setupTestRequestHookContext } from './_testUtils';
import { ARCHETYPES } from '../../constants';
import { getEmptyItems } from './mocks';

describe('createPublishingStatusResolver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('returns null when when not supported data resource configuration', () => {
    const context = setupTestRequestHookContext({
      batchPartials: [
        {
          archetype: ARCHETYPES.SINGLE,
          url: 'https://preview.contentful.com/entries',
          parameters: [{ key: SYS_ID_IN_PARAM, value: 'id_1' }],
          enableUnpublishedMode: false,
          custom: {
            contentManagementToken: 'token',
            spaceId: 'spaceId',
          },
        },
        {
          archetype: ARCHETYPES.SINGLE,
          url: 'https://preview.contentful.com/entries',
          parameters: [{ key: SYS_ID_IN_PARAM, value: 'id_1' }],
          enableUnpublishedMode: true,
          custom: {
            spaceId: 'spaceId',
          },
        },
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
      ],
    });

    expect(
      createPublishingStatusResolver({
        dataResource: context.dataResources[0].dataResource,
        dataSourceVariant: 'unpublished',
      })
    ).toBeNull();

    expect(
      createPublishingStatusResolver({
        dataResource: context.dataResources[1].dataResource,
        dataSourceVariant: 'unpublished',
      })
    ).toBeNull();

    expect(
      createPublishingStatusResolver({
        dataResource: context.dataResources[2].dataResource,
        dataSourceVariant: undefined,
      })
    ).toBeNull();
  });

  test('returns resolver when all required settings are present', () => {
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
      ],
    });

    expect(
      createPublishingStatusResolver({
        dataResource: context.dataResources[0].dataResource,
        dataSourceVariant: 'unpublished',
      })
    ).toBeDefined();
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
    });

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
    const response = getEmptyItems(['id_1', 'id_2', 'id_3']);

    const results: RequestEdgehancerDataResourceResolutionResult[] = [];

    const resolver = createPublishingStatusResolver({
      dataResource: context.dataResources[0].dataResource,
      dataSourceVariant: 'unpublished',
    });

    response.items.forEach((item) => {
      resolver?.collectItem(item, 0);
    });

    await resolver?.resolve(results);

    expect(resolver).toBeDefined();
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
});
