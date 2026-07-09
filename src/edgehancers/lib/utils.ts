import {
  MergedDataType,
  RequestEdgehancerDataResourceResolutionResult,
} from '@uniformdev/mesh-edgehancer-sdk';

import { ContentfulEntity, ContentfulResponse, isContentfulObject, parseContentfulResponse } from './schema';
import { SYS_ID_IN_PARAM } from './constants';

async function backoff(attempt: number) {
  const base = Math.pow(2, attempt) * 100;
  const delay = base + Math.round(Math.random() * (base / 2)) * (Math.random() > 0.5 ? 1 : -1);

  await new Promise((resolve) => setTimeout(resolve, delay));
}

export async function fetchContentful(
  request: Request,
  maxAttempts = 3
): Promise<{ response: ContentfulResponse; error?: undefined } | { response?: undefined; error: string }> {
  // retry in case of rate limit errors
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // fetch the data resource
      const response = await fetch(new Request(request));

      // parse the response as text (nicer for error handling)
      const responseText = await response.text();

      // on the last attempt, we don't want to backoff and should fail instead on `!response.ok`
      if (response.status === 429 && attempt < maxAttempts) {
        await backoff(attempt);
        continue;
      }

      // catch and return a HTTP error status code
      if (!response.ok) {
        if (response.status === 429) {
          return {
            error: `${request.method} ${request.url} \nFailed with status ${response.status} after ${attempt} attempts`,
          };
        } else {
          return {
            error: `${request.method} ${request.url} \nFailed with status ${response.status}\n Response: ${responseText}`,
          };
        }
      }

      let json: unknown;
      try {
        json = JSON.parse(responseText);
      } catch {
        return {
          error: `${request.method} ${request.url} \nInvalid JSON: ${responseText}`,
        };
      }

      const parsedResponse = parseContentfulResponse(json);
      if (!parsedResponse) {
        return {
          error: `${request.method} ${request.url} \nResponse is not an expected Contentful response.\n Response: ${responseText}`,
        };
      }

      return {
        response: parsedResponse,
      };
    } catch (err) {
      return {
        error: `${request.method} ${request.url} \nReturned error: ${err.message ?? 'unknown error'}`,
      };
    }
  }

  // for TS, we should never reach this point
  return {
    error: `${request.method} ${request.url} \nFailed after ${maxAttempts} attempts`,
  };
}

export function extractRequestedIds(dataResourceUrl: string): string[] {
  const value = new URL(dataResourceUrl).searchParams.get(SYS_ID_IN_PARAM) ?? '';
  if (!value) {
    return [];
  }

  const ids = new Set<string>();

  for (const id of value.split(',')) {
    const cleanId = id.trim();
    if (cleanId) {
      ids.add(cleanId);
    }
  }

  return Array.from(ids);
}

export function collectSurrogateKeys(items: ContentfulResponse['items']): string[] {
  if (!items?.length) {
    return [];
  }

  const keys = new Set<string>();

  items.forEach(collect);

  function collect(input: unknown): void {
    if (isContentfulObject(input)) {
      keys.add(`${input.sys.type}:${input.sys.id}`);

      collect(input.fields);
      return;
    }

    if (input === null || typeof input !== 'object') {
      return;
    }

    for (const key of Object.keys(input)) {
      collect(input[key as keyof typeof input]);
    }
  }

  return Array.from(keys).sort();
}

export function toChunks<T>(array: T[], size: number) {
  if (size <= 0) {
    throw new Error('size must be greater than 0');
  }

  if (array.length === 0) {
    return [];
  } else if (array.length <= size) {
    return [array];
  }

  return array.reduce<T[][]>((acc, _, i) => {
    if (i % size === 0) acc.push(array.slice(i, i + size));
    return acc;
  }, []);
}

export function groupBy<T>(array: T[], keySelector: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {};

  for (const item of array) {
    const key = keySelector(item);
    if (key) {
      result[key] ??= [];
      result[key].push(item);
    }
  }

  return result;
}

export function catchMissplacedQueryParams(
  dataResource: MergedDataType,
  result: RequestEdgehancerDataResourceResolutionResult
): boolean {
  if (dataResource.url.includes('?')) {
    result.errors ??= [];
    result.errors.push({
      message:
        'Data Resource should not have query params in the `dataResource.url`. Parameters should be stored in `dataResource.parameters`.',
    });
    return true;
  }

  return false;
}

/**
 * Remove cycles from a Contentful entity.
 *
 * We may have circular dependencies because of Contentful references resolution.
 * `maxDepth` is used to limit the depth references even if item exists in `includes`.
 */
export function removeCyclesFromItem(item: ContentfulEntity, maxDepth: number): ContentfulEntity {
  const seenObjects = new WeakSet();

  return removeCycles(item, 0) as ContentfulEntity;

  function removeCycles(input: unknown, currentDepth: number): unknown {
    if (input === null || typeof input !== 'object') {
      return input;
    }

    if (seenObjects.has(input)) {
      return isContentfulObject(input)
        ? {
            sys: {
              type: 'Link',
              linkType: 'Entry', // Always Entry, Assets can't reference so no cycles possible.
              id: input.sys.id,
              circular: true,
            },
          }
        : '[Circular]';
    } else if (currentDepth > maxDepth && isContentfulObject(input)) {
      if (input.sys.type === 'Entry' && !!input.fields) {
        return {
          sys: {
            type: 'Link',
            linkType: 'Entry',
            id: input.sys.id,
          },
        };
      } else if (input.sys.type === 'Asset') {
        // Assets can't reference so no cycles possible.
        return input;
      }
    }

    seenObjects.add(input);

    // re-create object to avoid sharing of circular references replacement
    // between different items that refer to the same item from `includes`
    const rewritten = Array.isArray(input) ? [] : {};
    for (const key of Object.keys(input)) {
      const value = input[key as keyof typeof input];

      // increase depth only for Contentful objects
      const depth = isContentfulObject(value) ? currentDepth + 1 : currentDepth;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (rewritten as any)[key] = removeCycles(value, depth);
    }

    seenObjects.delete(input);

    return rewritten;
  }
}
