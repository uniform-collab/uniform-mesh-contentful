import {
  getDataResourceAsRequest,
  getDataResourceUrl,
  type RequestEdgehancerDataResourceResolutionResult,
  type RequestHookFn,
} from '@uniformdev/mesh-edgehancer-sdk';
import {
  collectSurrogateKeys,
  createPublishingStatusResolver,
  extractRequestedIds,
  fetchContentful,
  processContentfulResponse,
} from './lib';

const onRequestHandler: RequestHookFn = async ({ dataResources, dataSourceVariant }) => {
  const publishingStatusResolver = createPublishingStatusResolver({
    dataResource: dataResources[0].dataResource,
    dataSourceVariant,
  });

  const promises = dataResources.map<Promise<RequestEdgehancerDataResourceResolutionResult>>(
    async ({ dataResource }, originalIndex) => {
      const result: RequestEdgehancerDataResourceResolutionResult = {};

      const url = getDataResourceUrl(dataResource);
      const requestedIds = extractRequestedIds(url);

      // looks like outdated code, but let's keep it for backward compatibility
      dataResource.parameters = dataResource.parameters?.filter(({ key, value }) => {
        // Special value to indicate we want any content type.
        // Contentful's API expects no "content_type" parameter in this case.
        const shouldDrop = key === 'content_type' && value === '__any__';

        return !shouldDrop;
      });

      const request = getDataResourceAsRequest(dataResource);

      const { response, error } = await fetchContentful(request);
      if (!response) {
        result.errors ??= [];
        result.errors.push({ message: error });
        return result;
      }

      const processedResponse = await processContentfulResponse({
        dataResource,
        requestedIds,
        response,
      });

      result.result = processedResponse;
      result.surrogateKeys = collectSurrogateKeys(processedResponse.items);

      // do not resolve publishing status in place, we can hit CMA Rate Limit
      // Default CMA Rate Limit: 7 req/sec for free plan and 10 req/sec for paid plans. Let's reduce the number of requests
      // https://www.contentful.com/developers/docs/references/content-management-api/#/introduction/api-rate-limits
      // collect items to resolve publishing status in batch
      if (publishingStatusResolver) {
        for (const item of processedResponse.items) {
          publishingStatusResolver.collectItem(item, originalIndex);
        }
      }

      return result;
    }
  );

  const results = await Promise.all(promises);

  // resolve publishing status for all collected items with batching
  await publishingStatusResolver?.resolve(results);

  return {
    results,
  };
};

export default onRequestHandler;
