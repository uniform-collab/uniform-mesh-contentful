import { RequestEdgehancerDataResourceResolutionResult } from '@uniformdev/mesh-edgehancer-sdk';

type UpdateResult = (result: RequestEdgehancerDataResourceResolutionResult) => void;

export type ResultsCollector = {
  addGlobalResult: (itemIds: string[], update: UpdateResult) => void;
  addItemResult: (itemId: string, update: UpdateResult) => void;
};

export function createSingleEntryResultsCollector(
  results: RequestEdgehancerDataResourceResolutionResult[],
  mapping: Array<{ id: string; originalIndex: number }>
): ResultsCollector {
  // for Single Entry we know that each item id maps to exactly one result
  const idToOriginalIndexMap = new Map(mapping.map(({ id, originalIndex }) => [id, originalIndex]));

  const registerResultById = (id: string, update: UpdateResult) => {
    const originalIndex = idToOriginalIndexMap.get(id) ?? -1;
    if (originalIndex >= 0) {
      results[originalIndex] ??= {};
      update(results[originalIndex]);
    }
  };

  return {
    addGlobalResult: (itemIds, update) => {
      for (const itemId of itemIds) {
        registerResultById(itemId, update);
      }
    },
    addItemResult: (itemId, update) => {
      registerResultById(itemId, update);
    },
  };
}

export function createDefaultResultsCollector(
  results: RequestEdgehancerDataResourceResolutionResult[],
  mapping: Array<{ id: string; originalIndex: number }>
): ResultsCollector {
  const lookupById = mapping.reduce(
    (result, current) => {
      result[current.id] ??= [];
      result[current.id].push(current.originalIndex);
      return result;
    },
    {} as Record<string, number[]>
  );

  const processedIdx = new Set<number>();

  return {
    addGlobalResult: (itemIds, update) => {
      for (const itemId of itemIds) {
        for (const originalIndex of lookupById[itemId] ?? []) {
          // we don't want to have few global updates for the same Data Resource
          if (!processedIdx.has(originalIndex)) {
            results[originalIndex] ??= {};
            update(results[originalIndex]);

            processedIdx.add(originalIndex);
          }
        }

        // remove processed original indexes from the list to avoid duplicate updates for the same Data Resource
        lookupById[itemId] = [];
      }
    },
    addItemResult: (itemId, update) => {
      for (const originalIndex of lookupById[itemId] ?? []) {
        results[originalIndex] ??= {};
        update(results[originalIndex]);
      }

      // remove processed original indexes from the list to avoid duplicate updates for the same Data Resource
      lookupById[itemId] = [];
    },
  };
}
