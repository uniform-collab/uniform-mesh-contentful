import {
  getDataResourceAsRequest,
  MergedDataType,
  RequestEdgehancerContext,
  RequestEdgehancerDataResourceResolutionResult,
} from '@uniformdev/mesh-edgehancer-sdk';

import { ContentfulEntity } from './schema';
import { ARCHETYPES, PREVIEW_BASE_URL } from '../../constants';
import { fetchContentful, toChunks } from './utils';
import { CMA_BATCH_SIZE, SYS_ID_IN_PARAM } from './constants';
import {
  createDefaultResultsCollector,
  createSingleEntryResultsCollector,
  ResultsCollector,
} from './resultsCollector';

export type PublishingStatusResolver = {
  collectItem(item: ContentfulEntity, originalIndex: number): void;
  resolve(results: RequestEdgehancerDataResourceResolutionResult[]): Promise<void>;
};

export const createPublishingStatusResolver = ({
  dataResource,
  dataSourceVariant,
}: {
  dataResource: MergedDataType;
  dataSourceVariant: RequestEdgehancerContext['dataSourceVariant'];
}): PublishingStatusResolver | null => {
  if (!isPublishingStatusSupported(dataResource, dataSourceVariant)) {
    return null;
  }

  const items = new Array<ContentfulEntity>();
  const mapping = new Array<{ id: string; originalIndex: number }>();

  return { collectItem, resolve };

  function collectItem(item: ContentfulEntity, originalIndex: number) {
    items.push(item);
    mapping.push({ id: item.sys.id, originalIndex });
  }

  async function resolve(results: RequestEdgehancerDataResourceResolutionResult[]) {
    const resultsCollector =
      dataResource.archetype === ARCHETYPES.SINGLE
        ? createSingleEntryResultsCollector(results, mapping)
        : createDefaultResultsCollector(results, mapping);

    const ids = items.map((item) => item.sys.id);

    const unpublishedItems = await fetchItemsFromCMA({
      dataResource,
      ids,
      resultsCollector,
    });

    const environmentPathname = dataResource.customPublic?.previewEnvironmentId
      ? `/environments/${dataResource.customPublic.previewEnvironmentId}`
      : '';

    items.forEach((item) => {
      const cmaItem = unpublishedItems.get(item.sys.id);

      item.sys = {
        ...item.sys,
        ...cmaItem?.sys,
      };

      if (!cmaItem?.sys.publishedVersion) {
        resultsCollector.addItemResult(item.sys.id, (result) => {
          result.warnings ??= [];
          result.warnings.push({
            message: `Entry "${getNaiveItemTitle(item)}" is not published`,
            subType: 'unpublishedData',
            issueReference: item.sys.id,
            deepLink: `https://app.contentful.com/spaces/${dataResource.custom?.spaceId}${environmentPathname}/entries/${item.sys.id}`,
          });
        });
      } else if (
        !!cmaItem.sys.publishedVersion &&
        (cmaItem.sys.version ?? 1) >= cmaItem.sys.publishedVersion + 2
      ) {
        resultsCollector.addItemResult(item.sys.id, (result) => {
          result.warnings ??= [];
          result.warnings.push({
            message: `Entry "${getNaiveItemTitle(item)}" has unpublished changes`,
            subType: 'unpublishedData',
            issueReference: item.sys.id,
            deepLink: `https://app.contentful.com/spaces/${dataResource.custom?.spaceId}${environmentPathname}/entries/${item.sys.id}`,
          });
        });
      }
    });
  }
};

const isPublishingStatusSupported = (
  dataResource: MergedDataType,
  dataSourceVariant: RequestEdgehancerContext['dataSourceVariant']
): boolean => {
  // ensure unpublished mode is enabled
  if (!dataResource.enableUnpublishedMode || dataSourceVariant !== 'unpublished') {
    return false;
  }
  // we may have unpublished variant connected to Delivery API, but another Contentful environment
  // ensure preview endpoint is used, otherwise we should not include unpublished data
  if (!dataResource.url.startsWith(PREVIEW_BASE_URL)) {
    return false;
  }
  // missing credentials
  if (!dataResource.custom?.contentManagementToken) {
    return false;
  }

  return true;
};

const fetchItemsFromCMA = async ({
  dataResource,
  ids,
  resultsCollector,
}: {
  dataResource: MergedDataType;
  ids: string[];
  resultsCollector: ResultsCollector;
}): Promise<Map<string, ContentfulEntity | undefined>> => {
  const result = new Map<string, ContentfulEntity | undefined>();

  const originalPathname = new URL(dataResource.url).pathname;
  const uniqueIds = Array.from(new Set(ids));

  // no parallelization here, it's intentional.
  // Let's minimize the chance of hitting the CMA Rate Limit
  // Default CMA Rate Limit: 7 req/sec for free plan and 10 req/sec for paid plans
  // https://www.contentful.com/developers/docs/references/content-management-api/#/introduction/api-rate-limits
  for (const currentIds of toChunks(uniqueIds, CMA_BATCH_SIZE)) {
    const cmaResource: MergedDataType = {
      ...dataResource,
      method: 'GET',
      // prevent custom query params from being added to the URL
      url: `https://api.contentful.com${originalPathname}`,
      headers: [
        {
          key: 'Authorization',
          value: `Bearer ${dataResource.custom?.contentManagementToken}`,
        },
      ],
      parameters: [
        // we need only metadata, so let's avoid huge response size
        { key: 'select', value: 'sys' },
        { key: SYS_ID_IN_PARAM, value: currentIds.join(',') },
      ],
    };

    const request = getDataResourceAsRequest(cmaResource);
    const { response: cmaResponse, error } = await fetchContentful(request);

    if (cmaResponse) {
      for (const item of cmaResponse.items) {
        result.set(item.sys.id, item);
      }
    } else {
      resultsCollector.addGlobalResult(currentIds, (result) => {
        result.errors ??= [];
        result.errors.push({
          message: `Could not fetch batched CMA response: \n${error}`,
        });
      });
    }
  }

  return result;
};

const titleFieldNamesCandidates = [
  'title',
  'name',
  'heading',
  'label',
  'caption',
  'displayName',
  'description',
  'text',
  'slug',
];

/*
 * We do not know the content type of the entity and don't want to make an extra call, so we try to find a field that could be used as a title.
 */
const getNaiveItemTitle = (item: ContentfulEntity) => {
  if (item.fields) {
    for (const fieldName of titleFieldNamesCandidates) {
      const title = item.fields[fieldName];
      if (title) {
        return title;
      }
    }
  }

  return `(no title) with id: ${item.sys.id}`;
};
