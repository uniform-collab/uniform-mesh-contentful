import { SelectedItemProps } from '@uniformdev/mesh-sdk-react';
import { SORT_TYPE } from '../constants';
import { ContentfulEntry, ContentfulType } from './contentfulTypes';

export interface ContentType {
  id: string;
  name: string;
  displayField: string;
  fields: ContentTypeField[];
}

export interface ContentTypeField {
  id: string;
  name: string;
  linkType?: string;
  type: ContentfulType;
}

export interface Option {
  label: string;
  value: string;
  fieldType?: string;
}

export interface SearchValue {
  type: ContentfulType;
  id: string;
}

export interface SearchOption extends Option {
  searchFieldValue?: SearchValue;
}

export interface InternalEntry extends SelectedItemProps {
  data?: ContentfulEntry;
  hideRemoveButton?: boolean;
  fileName?: string;
  [p: string]: unknown;
}

export interface EntryQueryOutputParams {
  contentTypeId: string;
  keyword: string;
  count: string | number;
  skip?: string | number;
  countFieldValue: string;
  skipFieldValue: string;
  sortFieldId: string;
  sortOrder: SORT_TYPE;
  advancedFilters: SearchParameter[];
  locale: string;
}

export interface InternalContentType {
  id: string;
  name?: string;
  label: string;
}

export interface SearchParameter {
  key: string;
  operator: string;
  value: string;
  id: string;
}

export interface QueryParameter {
  key: string;
  value: string;
}

export interface SearchConfig {
  searchFields: ContentTypeField[];
  searchOptions: Option[];
}
