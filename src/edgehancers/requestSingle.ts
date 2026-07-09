import {
  getDataResourceAsRequest,
  getDataResourceUrl,
  type MergedDataType,
  type RequestEdgehancerDataResourceResolutionResult,
  type RequestHookFn,
} from '@uniformdev/mesh-edgehancer-sdk';
import {
  catchMissplacedQueryParams,
  collectSurrogateKeys,
  extractRequestedIds,
  fetchContentful,
  groupBy,
  SINGLE_ENTRY_BATCH_SIZE,
  processContentfulResponse,
  SYS_ID_IN_PARAM,
  toChunks,
  createPublishingStatusResolver,
} from './lib';

type DataResourceEntry = {
  dataResource: MergedDataType;
  id: string;
  originalIndex: number;
  groupKey: string;
  result?: RequestEdgehancerDataResourceResolutionResult;
};

const onSingleArchetypeRequestHandler: RequestHookFn = async ({ dataResources, dataSourceVariant }) => {
  const results = new Array<RequestEdgehancerDataResourceResolutionResult>(dataResources.length);

  const dataResourcesToProcess: Array<DataResourceEntry> = [];

  // validate data resources and prepare them for processing
  dataResources.forEach(({ dataResource }, index) => {
    results[index] = {};

    // DEV GUARD
    if (catchMissplacedQueryParams(dataResource, results[index])) {
      return;
    }

    const dataResourceUrl = getDataResourceUrl(dataResource);
    const requestedIds = extractRequestedIds(dataResourceUrl);

    // data resource should have exactly one ID
    if (requestedIds.length !== 1) {
      results[index] = {
        errors: [
          {
            message: 'Contentful single entry resolver requires exactly one ID',
          },
        ],
      };
      return;
    }

    dataResourcesToProcess.push({
      dataResource,
      id: requestedIds[0],
      originalIndex: index,
      // we can use the result of `getUrlWithoutIds(dataResourceUrl)` as a group key
      // since it includes preview/published endpoint and all parameters except IDs
      // so we can handle even different data types of the single entry archetype in the same batch
      groupKey: getUrlWithoutIds(dataResourceUrl),
    });
  });

  const publishingStatusResolver = createPublishingStatusResolver({
    dataResource: dataResources[0].dataResource,
    dataSourceVariant,
  });

  await Promise.all(
    getBatches(dataResourcesToProcess).map<Promise<void>>(async (batch) => {
      const batchDataResource = resolveBatchDataResource(batch);

      const request = getDataResourceAsRequest(batchDataResource);

      const { response, error } = await fetchContentful(request);
      if (!response) {
        for (const { originalIndex } of batch) {
          results[originalIndex].errors = [
            { message: `Could not fetch batched Contentful response. \nError: ${error}` },
          ];
        }
        return;
      }

      const processedResponse = await processContentfulResponse({
        dataResource: batchDataResource,
        // we don't need reordering or filtering for batched request
        requestedIds: [],
        response,
      });

      // collect results from response
      for (const { id, originalIndex } of batch) {
        const item = processedResponse.items.find((item) => item.sys.id === id);
        if (item) {
          // result schema should be the same as Contentful `/entries/{id}` response
          results[originalIndex].result = item;
          results[originalIndex].surrogateKeys = collectSurrogateKeys([item]);

          // collect items to resolve publishing status in batch
          publishingStatusResolver?.collectItem(item, originalIndex);
        } else {
          results[originalIndex].errors = [{ message: `Could not find Contentful entry with ID ${id}` }];
        }
      }
    })
  );

  // resolve publishing status for all collected items with batching
  await publishingStatusResolver?.resolve(results);

  return {
    results,
  };
};

export default onSingleArchetypeRequestHandler;

function getUrlWithoutIds(url: string): string {
  const urlObj = new URL(url);
  urlObj.searchParams.delete(SYS_ID_IN_PARAM);
  urlObj.searchParams.sort();

  return urlObj.toString();
}

function getBatches(array: DataResourceEntry[]): DataResourceEntry[][] {
  if (array.length === 1) {
    return [array];
  }

  const result: DataResourceEntry[][] = [];

  // group by groupKey to ensure that we are not mixing data resources with different context in the same batch.
  for (const batch of Object.values(groupBy(array, (item) => item.groupKey))) {
    // limit the number of items per request
    for (const chunk of toChunks(batch, SINGLE_ENTRY_BATCH_SIZE)) {
      result.push(chunk);
    }
  }

  return result;
}

function resolveBatchDataResource(batch: DataResourceEntry[]): MergedDataType {
  // we can reuse the data resource if there is only one in the batch
  if (batch.length === 1) {
    return batch[0].dataResource;
  }

  const dataResource = batch[0].dataResource;
  const ids = batch.map(({ id }) => id);

  // replace `sys.id[in]` parameter with the batch IDs
  const parameters = (dataResource.parameters ?? []).filter(({ key }) => key !== SYS_ID_IN_PARAM);

  // sort and deduplicate IDs to ensure consistent parameter value
  parameters.push({ key: SYS_ID_IN_PARAM, value: Array.from(new Set(ids)).sort().join(',') });

  return {
    ...dataResource,
    parameters,
  };
}
