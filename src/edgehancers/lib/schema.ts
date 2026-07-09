export type ContentfulEntity = {
  sys: {
    id: string;
    type: 'Entry' | 'Asset';
    publishedVersion?: number;
    version?: number;
  };
  fields?: Record<string, unknown>;
};

export type ContentfulResponse = {
  sys: { type: 'Array' };
  items: ContentfulEntity[];
  includes?: {
    Entry?: ContentfulEntity[];
    Asset?: ContentfulEntity[];
  };
  total?: number;
  skip?: number;
  limit?: number;
};

export type ContentfulObject = {
  sys: {
    id: string;
    type: 'Entry' | 'Asset';
  };
  fields?: unknown;
};

export function parseContentfulResponse(input: unknown): ContentfulResponse | undefined {
  // Why not `zod`:
  // - `zod` increase edgehancer bundle size by ~2 times.
  // - We have pretty simple schema, so let's use custom implementation instead.
  if (typeof input !== 'object' || input === null) {
    return undefined;
  }

  const typed = input as ContentfulResponse;

  if (typed.sys?.type !== 'Array') {
    return undefined;
  }

  if (!isContentfulEntityArray(typed.items)) {
    return undefined;
  }

  if (typed.includes) {
    if (typeof typed.includes !== 'object') {
      return undefined;
    }

    if (typed.includes.Entry && !isContentfulEntityArray(typed.includes.Entry)) {
      return undefined;
    }

    if (typed.includes.Asset && !isContentfulEntityArray(typed.includes.Asset)) {
      return undefined;
    }
  }

  if (typed.total !== undefined && typeof typed.total !== 'number') {
    return undefined;
  }

  if (typed.skip !== undefined && typeof typed.skip !== 'number') {
    return undefined;
  }

  if (typed.limit !== undefined && typeof typed.limit !== 'number') {
    return undefined;
  }

  return input as ContentfulResponse;
}

function isContentfulEntity(input: unknown): input is ContentfulEntity {
  if (typeof input !== 'object' || input === null) {
    return false;
  }

  const { sys, fields } = input as ContentfulEntity;

  if (typeof sys !== 'object' || sys === null) {
    return false;
  }

  if (typeof sys.id !== 'string' || sys.id.length === 0) {
    return false;
  }

  if (sys.type !== 'Entry' && sys.type !== 'Asset') {
    return false;
  }

  if (sys.publishedVersion !== undefined && typeof sys.publishedVersion !== 'number') {
    return false;
  }

  if (sys.version !== undefined && typeof sys.version !== 'number') {
    return false;
  }

  if (fields && typeof fields !== 'object') {
    return false;
  }

  return true;
}

function isContentfulEntityArray(input: unknown): input is ContentfulEntity[] {
  return Array.isArray(input) && input.every(isContentfulEntity);
}

export function isContentfulObject(input: unknown): input is ContentfulObject {
  // it's performance critical function, since we use it a lot when walk through Contentful items
  // let's use custom implementation instead of zod to avoid any overheads on parsing/copying
  if (input === null || typeof input !== 'object') {
    return false;
  }

  const typed = input as ContentfulObject;

  if (typeof typed.sys !== 'object' || typed.sys === null) {
    return false;
  }

  if (typeof typed.sys.id !== 'string') {
    return false;
  }

  if (typed.sys.type !== 'Entry' && typed.sys.type !== 'Asset') {
    return false;
  }

  return true;
}
