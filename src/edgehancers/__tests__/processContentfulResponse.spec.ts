import { describe, test, expect, vi, beforeEach } from 'vitest';

import { ContentfulEntity, processContentfulResponse, SYS_ID_IN_PARAM } from '../lib';
import { setupTestRequestHookContext } from './_testUtils';
import { ARCHETYPES } from '../../constants';
import {
  getEmptyItems,
  getMultipleEntriesWithSameLinks,
  getSingleEntryWithInclude4,
  getSingleEntryWithLinks,
  getSingleEntryWithRichText,
} from './mocks';

// eslint-disable @typescript-eslint/no-explicit-any
// eslint-disable @typescript-eslint/no-empty-function

describe('processContentfulResponse', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('reorders items in Contentful response based on requested ids', async () => {
    const context = setupTestRequestHookContext({
      batchPartials: [
        {
          archetype: ARCHETYPES.MULTIPLE,
          url: 'https://test.xyz/path',
          parameters: [{ key: SYS_ID_IN_PARAM, value: 'id_2,id_3,id_1' }],
        },
      ],
    });
    const response = getEmptyItems(['id_1', 'id_2', 'id_3']);

    const result = await processContentfulResponse({
      dataResource: context.dataResources[0].dataResource,
      requestedIds: ['id_2', 'id_3', 'id_1'],
      response,
    });

    expect(result.items[0].sys.id).toBe('id_2');
    expect(result.items[1].sys.id).toBe('id_3');
    expect(result.items[2].sys.id).toBe('id_1');
  });

  test('resolves links in Contentful response', async () => {
    const context = setupTestRequestHookContext({
      batchPartials: [
        {
          archetype: ARCHETYPES.SINGLE,
          url: 'https://test.xyz/path',
          parameters: [{ key: SYS_ID_IN_PARAM, value: 'id_1' }],
        },
      ],
    });
    const response = getSingleEntryWithLinks('id_1');

    const result = await processContentfulResponse({
      dataResource: context.dataResources[0].dataResource,
      requestedIds: [],
      response,
    });

    const item = result.items[0];
    expect(item.sys.id).toBe('id_1');
    expect((item.fields?.image as any)?.sys?.id).toBeDefined();
    expect((item.fields?.link as any)?.sys?.id).toBeDefined();
  });

  test('handles circular references', async () => {
    const context = setupTestRequestHookContext({
      batchPartials: [
        {
          archetype: ARCHETYPES.SINGLE,
          url: 'https://test.xyz/path',
          parameters: [{ key: SYS_ID_IN_PARAM, value: 'id_1' }],
        },
      ],
    });
    const response = getSingleEntryWithLinks('id_1');

    const result = await processContentfulResponse({
      dataResource: context.dataResources[0].dataResource,
      requestedIds: [],
      response,
    });

    expect((result.items[0].fields?.cycle as any)?.fields.cycle.sys.circular).toBe(true);
  });

  test('removing of circular references should not affect other items', async () => {
    const context = setupTestRequestHookContext({
      batchPartials: [
        {
          archetype: ARCHETYPES.MULTIPLE,
          url: 'https://test.xyz/path',
          parameters: [{ key: SYS_ID_IN_PARAM, value: 'id_1,id_2' }],
        },
      ],
    });
    const response = getMultipleEntriesWithSameLinks(['id_1', 'id_2']);

    const result = await processContentfulResponse({
      dataResource: context.dataResources[0].dataResource,
      requestedIds: [],
      response,
    });

    expect((result.items[0] as any).sys.id).toBe('id_1');
    expect((result.items[0] as any).fields.link.fields.sameLink.sys.id).toBe('id_1');
    expect((result.items[0] as any).fields.link.fields.sameLink.sys.circular).toBe(true);

    expect((result.items[1] as any).sys.id).toBe('id_2');
    expect((result.items[1] as any).fields.link.fields.sameLink.sys.id).toBe('id_1');
    expect((result.items[1] as any).fields.link.fields.sameLink.sys.circular).toBeUndefined();

    expect(result).toMatchSnapshot();
  });

  test('resolves rich text fields', async () => {
    const context = setupTestRequestHookContext({
      batchPartials: [
        {
          archetype: ARCHETYPES.SINGLE,
          url: 'https://test.xyz/path',
          parameters: [{ key: SYS_ID_IN_PARAM, value: 'id_1' }],
        },
      ],
    });
    const response = getSingleEntryWithRichText('id_1');

    const result = await processContentfulResponse({
      dataResource: context.dataResources[0].dataResource,
      requestedIds: [],
      response,
    });

    expect(result.items[0]?.fields?.rich).toMatchSnapshot();
  });

  describe('respects depth with `include` parameter', () => {
    test('include=0', async () => {
      const context = setupTestRequestHookContext({
        batchPartials: [
          {
            archetype: ARCHETYPES.SINGLE,
            url: 'https://test.xyz/path',
            parameters: [
              { key: 'include', value: '0' },
              { key: SYS_ID_IN_PARAM, value: 'id_1' },
            ],
          },
        ],
      });
      const response = getSingleEntryWithInclude4('id_1');

      const result = await processContentfulResponse({
        dataResource: context.dataResources[0].dataResource,
        requestedIds: [],
        response,
      });

      const item = result.items[0];

      // This one is exactly level of include, but we have to consider that +1 for backwards compatibility
      const level1Field = item.fields?.linkfield as ContentfulEntity;
      expect(level1Field.sys.type).toBe('Link');
      expect(level1Field.fields).toBeUndefined();

      expect(item).toMatchSnapshot();
    });

    test('include=1', async () => {
      const context = setupTestRequestHookContext({
        batchPartials: [
          {
            archetype: ARCHETYPES.SINGLE,
            url: 'https://test.xyz/path',
            parameters: [
              { key: 'include', value: '1' },
              { key: SYS_ID_IN_PARAM, value: 'id_1' },
            ],
          },
        ],
      });
      const response = getSingleEntryWithInclude4('id_1');

      const result = await processContentfulResponse({
        dataResource: context.dataResources[0].dataResource,
        requestedIds: [],
        response,
      });

      const item = result.items[0];

      // This one is exactly level of include, but we have to consider that +1 for backwards compatibility
      const level1Field = item.fields?.linkfield as ContentfulEntity;
      expect(level1Field.sys.type).toBe('Entry');

      const level2Field = level1Field.fields?.linkfield as ContentfulEntity;
      expect(level2Field.sys.type).toBe('Entry');

      const level3Field = level2Field.fields?.linkfield as ContentfulEntity;
      expect(level3Field.sys.type).toBe('Link');
      expect(level3Field.fields).toBeUndefined();

      expect(item).toMatchSnapshot();
    });

    test('include=2', async () => {
      const context = setupTestRequestHookContext({
        batchPartials: [
          {
            archetype: ARCHETYPES.SINGLE,
            url: 'https://test.xyz/path',
            parameters: [
              { key: 'include', value: '2' },
              { key: SYS_ID_IN_PARAM, value: 'id_1' },
            ],
          },
        ],
      });
      const response = getSingleEntryWithInclude4('id_1');

      const result = await processContentfulResponse({
        dataResource: context.dataResources[0].dataResource,
        requestedIds: [],
        response,
      });

      const item = result.items[0];

      const level1Field = item.fields?.linkfield as ContentfulEntity;
      expect(level1Field.sys.type).toBe('Entry');

      const level2Field = level1Field.fields?.linkfield as ContentfulEntity;
      expect(level2Field.sys.type).toBe('Entry');

      const level3Field = level2Field.fields?.linkfield as ContentfulEntity;
      expect(level3Field.sys.type).toBe('Link');
      expect(level3Field.fields).toBeUndefined();

      expect(item).toMatchSnapshot();
    });

    test('include=3', async () => {
      const context = setupTestRequestHookContext({
        batchPartials: [
          {
            archetype: ARCHETYPES.SINGLE,
            url: 'https://test.xyz/path',
            parameters: [
              { key: 'include', value: '3' },
              { key: SYS_ID_IN_PARAM, value: 'id_1' },
            ],
          },
        ],
      });
      const response = getSingleEntryWithInclude4('id_1');

      const result = await processContentfulResponse({
        dataResource: context.dataResources[0].dataResource,
        requestedIds: [],
        response,
      });

      const item = result.items[0];

      const level1Field = item.fields?.linkfield as ContentfulEntity;
      expect(level1Field.sys.type).toBe('Entry');

      const level2Field = level1Field.fields?.linkfield as ContentfulEntity;
      expect(level2Field.sys.type).toBe('Entry');

      const level3Field = level2Field.fields?.linkfield as ContentfulEntity;
      expect(level3Field.sys.type).toBe('Entry');

      const level4Field = level3Field.fields?.linkfield as ContentfulEntity;
      expect(level4Field.sys.type).toBe('Link');
      expect(level4Field.fields).toBeUndefined();

      expect(item).toMatchSnapshot();
    });

    test('include=4', async () => {
      const context = setupTestRequestHookContext({
        batchPartials: [
          {
            archetype: ARCHETYPES.SINGLE,
            url: 'https://test.xyz/path',
            parameters: [
              { key: 'include', value: '4' },
              { key: SYS_ID_IN_PARAM, value: 'id_1' },
            ],
          },
        ],
      });
      const response = getSingleEntryWithInclude4('id_1');

      const result = await processContentfulResponse({
        dataResource: context.dataResources[0].dataResource,
        requestedIds: [],
        response,
      });

      const item = result.items[0];

      const level1Field = item.fields?.linkfield as ContentfulEntity;
      expect(level1Field.sys.type).toBe('Entry');

      const level2Field = level1Field.fields?.linkfield as ContentfulEntity;
      expect(level2Field.sys.type).toBe('Entry');

      const level3Field = level2Field.fields?.linkfield as ContentfulEntity;
      expect(level3Field.sys.type).toBe('Entry');

      const level4Field = level3Field.fields?.linkfield as ContentfulEntity;
      expect(level4Field.sys.type).toBe('Entry');

      const level5Field = level4Field.fields?.linkfield as ContentfulEntity;
      // level 5 is not resolved, because we delete unresolved ref fields
      // via calling `contentfulResolveResponse` with `removeUnresolved: true`
      expect(level5Field).toBeUndefined();

      expect(item).toMatchSnapshot();
    });
  });
});
