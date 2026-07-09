import contentfulResolveResponse from 'contentful-resolve-response';

import { MergedDataType } from '@uniformdev/mesh-edgehancer-sdk';

import { ContentfulResponse } from './schema';
import { removeCyclesFromItem } from './utils';

export async function processContentfulResponse({
  dataResource,
  requestedIds,
  response,
}: {
  dataResource: MergedDataType;
  requestedIds: string[];
  response: ContentfulResponse;
}): Promise<ContentfulResponse> {
  const processedResponse = resolveLinkedContent(dataResource, response);

  processedResponse.items = reorderItems(processedResponse.items, requestedIds);

  return processedResponse;
}

function reorderItems(
  items: ContentfulResponse['items'],
  requestedIds: string[]
): ContentfulResponse['items'] {
  // The contentful API uses "order" parameter to specify the order of results for sys.id[in] queries,
  // but we want results to be returned in the same order as the IDs we pass in the query,
  // so we must re-order the results after we get them to match the input IDs order.
  if (requestedIds.length > 1) {
    return requestedIds.map((id) => items.find((item) => item.sys.id === id)).filter((item) => !!item);
  }

  return items;
}

const resolveLinkedContent = (
  dataResource: MergedDataType,
  response: ContentfulResponse
): ContentfulResponse => {
  // resolveResponse will mutate includes replacing links with resolved entities.
  // This makes the response bigger; we only want to resolve links in the items array.
  // The final response will include original includes and resolved items.
  const includes = structuredClone(response.includes ?? {});

  const processedItems = contentfulResolveResponse(response, {
    removeUnresolved: true,
    itemEntryPoints: ['fields'],
  });

  const serializableItems = removeCycles(dataResource, processedItems);

  return {
    ...response,
    includes,
    items: serializableItems,
  };
};

function removeCycles(
  dataResource: MergedDataType,
  items: ContentfulResponse['items']
): ContentfulResponse['items'] {
  const includeStr = dataResource.parameters?.find((param) => param.key === 'include')?.value;

  // On top of circular references we also need to handle "include" parameter depth.
  // it is possible to hit circular references but in depth greater than 1, even when we fetch list of entries
  // which reference each other with "include=1" parameter. They will still be resolved into a tree
  // that can be very deep depending on the number of references and how fast circular stopper is hit.
  // Potentially expcliding json size dozens of times.
  // We default to 1, as it is default value in Contentful Delivery API.
  const include = parseInt(includeStr || '1');

  // We are adding +1 to avoid breaking change (at least for now) with cases
  // where people have binded some values which should not be resolved at the first place.
  // But only for default value of 1, leaving other values like 3 or 0
  const maxDepth = include === 1 ? include + 1 : include;

  return items.map((item) => removeCyclesFromItem(item, maxDepth));
}
