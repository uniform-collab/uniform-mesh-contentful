import { ContentTypeField } from './types/common';

export const BASE_URL = 'https://cdn.contentful.com';
export const PREVIEW_BASE_URL = 'https://preview.contentful.com';

export const UNKNOWN = 'unknown';

export const LOADING_INDICATOR_DELAY = 250;

export const TRUE_VALIDATION_RESULT = Object.freeze({ isValid: true });

export const DEFAULT_COUNT_FOR_QUERY = 5;

export const DEFAULT_SEARCH_LIMIT = '20';

export enum VALIDATION_MESSAGES {
  SPACE_ID_REQUIRED = 'The Space Id must be specified.',
  DELIVERY_TOKEN_REQUIRED = 'The CDA Access Token must be specified.',
  UNPUBLISHED_CONFIGURATION_REQUIRED = 'The Preview Delivery Access Token or Preview Environment Id must be specified.',
  PREVIEW_ENV_NOT_EQUAL = 'The Preview Environment Id should not be the same as Standard environment Id.',
  CONTENT_TYPE_REQUIRED = 'At least one Content Type must be selected.',
}

export enum SORT_TYPE {
  ASC = 'asc',
  DESC = 'desc',
}

export const DEFAULT_LABEL = { label: 'Select...', value: '' };

export const DEFAULT_ENVIRONMENT = 'master';

export const ERROR_MESSAGE =
  'Something seems to have gone wrong. Maybe the previously saved data is out of date.';

export const NUMBER_TYPES = ['Integer', 'Number'];
export const SEARCH_FIELDS_TYPES = ['Symbol', 'Array', ...NUMBER_TYPES];
export const SORT_FIELD_AVAILABLE_TYPES = ['Symbol', 'Boolean', 'Date', 'Location', ...NUMBER_TYPES];

export const MIME_TYPES_OPTIONS = [
  {
    label: 'Attachment',
    value: 'attachment',
  },
  {
    label: 'PlainText',
    value: 'plaintext',
  },
  {
    label: 'Image',
    value: 'image',
  },
  {
    label: 'Audio',
    value: 'audio',
  },
  {
    label: 'Video',
    value: 'video',
  },
  {
    label: 'RichText',
    value: 'richtext',
  },
  {
    label: 'Presentation',
    value: 'presentation',
  },
  {
    label: 'Spreadsheet',
    value: 'spreadsheet',
  },
  {
    label: 'PDFdocument',
    value: 'pdfdocument',
  },
  {
    label: 'Archive',
    value: 'archive',
  },
  {
    label: 'Code',
    value: 'code',
  },
  {
    label: 'Markup',
    value: 'markup',
  },
];

export const SEAERCH_TYPES_OPTIONS = [
  {
    label: 'Title',
    value: 'fields.title',
  },
  {
    label: 'Description',
    value: 'fields.description',
  },
  {
    label: 'File Name',
    value: 'fields.file.fileName',
  },
];

export enum ARCHETYPES {
  SINGLE = 'singleEntry',
  MULTIPLE = 'multipleEntry',
  QUERY = 'queryEntry',
  ASSETS = 'assets',
  ENTRIES_BY_FIELD = 'entryByField',
}

export const DEFAULT_INCLUDE = 1;

export enum STATUS_TYPES {
  Published = 'published',
  Modified = 'modified',
  Draft = 'draft',
  Unpublished = 'unpublished',
}

export const CUSTOM_QUERY_FORMAT = '[{"key": "fields.title[in]", "value": "text"}]';

export const FALSE_VALIDATION_CREDENTIALS_MESSAGE =
  'Field "Custom Search Parameters" not valid for selected content types.';

export const INVALID_SEARCH_FORMAT = 'Invalid search parameters format.';

export const SEARCH_OPERATOR = '[match]';

export const ANY_CONTENT_TYPES = 'any';
export const ALL_CONTENT_TYPES_LABEL = 'All content types';

export enum FIELD_TYPES {
  Symbol = 'Short Text',
  Text = 'Long Text',
  Location = 'Location',
  RichText = 'Rich Text',
  Boolean = 'Boolean',
  Integer = 'Integer',
  Number = 'Decimal Number',
  Date = 'Date & Time',
  Object = 'Json Object',
  Link = 'Link',
  Array = 'Array',
  Media = 'Media',
  Reference = 'Reference',
}

export const SYSTEM_FILTER_FIELDS_OPTION: ContentTypeField[] = [
  { name: 'Updated At', id: 'sys.updatedAt', type: 'Date' },
  { name: 'Created At', id: 'sys.createdAt', type: 'Date' },
  { name: 'Published At', id: 'sys.publishedAt', type: 'Date' },
  { name: 'First Published At', id: 'sys.firstPublishedAt', type: 'Date' },
  { name: 'Revision', id: 'sys.revision', type: 'Number' },
  { name: 'ID', id: 'sys.id', type: 'Symbol' },
  { name: 'Tags', id: 'metadata.tags', type: 'Array' },
];

export const FULL_TEXT_TYPES = ['Text', 'RichText'];
export const OBJECT_TYPES = ['Link', 'Media', 'Object', 'Array'];

export enum SEARCH_OPERATORS {
  Number = 'is,in,nin,lte,lt,gte,gt',
  Date = 'is,lte,lt,gte,gt',
  Text = 'is,in,nin,match',
  Object = 'in,nin,all',
  Location = 'within',
  FullText = 'is,match',
}

export const IMAGES_FIELDS_TYPES = [FIELD_TYPES.Symbol, FIELD_TYPES.Media];

export const GET_DYNAMIC_INPUT_REGEX = /\$\{([^}]+)\}/g;
export const REPLACE_DYNAMIC_INPUT_REGEX = /^\$\{(.+?)\}$/;

export const CONTENT_TYPES_FETCH_LIMIT = '1000';
