import {
  MergedDataType,
  DataResourceFetchContext,
  RequestEdgehancerContext,
} from '@uniformdev/mesh-edgehancer-sdk';

/** Sets up a fetch interceptor on a specific origin and path to return a provided JSON response */
export function setupFetchInterceptor(
  origin: string,
  path: string,
  response: unknown,
  statusCode = 200,
  times = 1
) {
  // custom edgehancers run on Cloudflare so we can use miniflare's vitest mocking toolkit
  // see https://miniflare.dev/testing
  const fetchMock = getMiniflareFetchMock();

  // prevent actual network requests
  fetchMock.disableNetConnect();

  // mock the response from the provided URL
  const interceptor = fetchMock.get(origin).intercept({ path });

  if (response instanceof Error) {
    interceptor.replyWithError(response).times(times);
  } else if (typeof response === 'string') {
    interceptor.reply(statusCode, response).times(times);
  } else {
    interceptor.reply(statusCode, JSON.stringify(response)).times(times);
  }
}

/** Mocks out a request hook input context */
export function setupTestRequestHookContext({
  batchPartials,
  fetchContext,
  dataSourceVariant,
}: {
  batchPartials: Array<Partial<MergedDataType>>;
  fetchContext?: DataResourceFetchContext;
  dataSourceVariant?: RequestEdgehancerContext['dataSourceVariant'];
}): RequestEdgehancerContext {
  return {
    dataResources: batchPartials.map((partial) => ({
      dataResource: setupTestDataResourceDefinition(partial),
    })),
    fetchContext: fetchContext ?? 'normal',
    dataSourceVariant: dataSourceVariant,
  };
}

/** Mocks out a test data resource definition */
export function setupTestDataResourceDefinition(partial?: Partial<MergedDataType>): MergedDataType {
  return {
    connectorType: 'test',
    method: 'GET',
    archetype: 'default',
    url: 'https://cdn.contentful.com/spaces/sf6fwhgksoe0/entries',
    displayName: 'Test Data Resource',
    id: 'test-data-resource',
    ...partial,
  };
}
