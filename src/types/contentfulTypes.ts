export interface ContentTypesResponse {
  sys: {
    type: 'Array';
  };
  total: number;
  skip: number;
  limit: number;
  items: ContentTypeResponse[];
}

export interface ContentTypeResponse {
  sys: SysType;
  displayField: string;
  name: string;
  description: string;
  fields: ContentTypeFieldResponse[];
}

export interface ContentTypeFieldResponse {
  id: string;
  name: string;
  type: ContentfulType;
  localized: boolean;
  required: boolean;
  disabled: boolean;
  omitted: boolean;
  linkType?: string;
  items?: {
    type: string;
    linkType: string;
    validations: string[];
  };
}

export interface SysType extends ContentManagementVersioning {
  createdAt: Date;
  environment: {
    sys: {
      id: string;
      linkType: 'Environment';
      type: 'Link';
    };
  };
  id: string;
  locale: string;
  revision: number;
  space: {
    sys: {
      id: string;
      linkType: 'Space';
      type: 'Link';
    };
  };
  type: string;
  updatedAt: Date;
  contentType: {
    sys: {
      type: 'Link';
      linkType: 'ContentType';
      id: string;
    };
  };
}

export interface ContentManagementVersioning {
  publishedVersion?: number;
  version?: number;
  archivedVersion?: number;
}

export interface EntriesResponse {
  includes: {
    [key: string]: {
      fields: {
        description: string;
        file: {
          contentType: string;
          details: {
            size: number;
            image: {
              height: number;
              width: number;
            };
          };
          filename: string;
          url: string;
        };
        title: string;
      };
      metadata: {
        tags: [];
      };
      sys: SysType;
    }[];
  };
  items: EntryResponse[];
  limit: number;
  skip: number;
  sys: {
    type: 'Array';
  };
  total: number;
}

export interface EntryResponse {
  fields: ContentfulEntry;
  metadata: {
    tags: [];
  };
  sys: SysType;
}

export type ContentfulType =
  | 'Symbol'
  | 'Date'
  | 'Link'
  | 'Text'
  | 'RichText'
  | 'Boolean'
  | 'Integer'
  | 'Number'
  | 'Location'
  | 'Object'
  | 'Array'
  | 'Media';

export interface ContentfulEntry {
  [key: string]: string | number | AssetType | unknown;
}

export interface AssetType {
  sys: {
    id: string;
    linkType: string;
    type: ContentfulType;
  };
}

export interface AssetsResponse extends Omit<ContentTypeResponse, 'items'> {
  items: AssetTypeResponce[];
}
export interface AssetTypeResponce extends Omit<EntryResponse, 'fields'> {
  fields: {
    title: string;
    file?: {
      url: string;
      details: {
        size: number;
      };
      fileName: string;
      contentType: string;
    };
  };
}

export interface ContentfulLocale {
  name: string;
  code: string;
  default: boolean;
}

export interface LocalesResponse {
  items?: ContentfulLocale[];
}
