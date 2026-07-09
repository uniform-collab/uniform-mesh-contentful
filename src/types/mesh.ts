import { SearchValue } from './common';

export interface ConfigParams {
  spaceId: string;
  environmentId: string;
  deliveryToken: string;
  previewToken?: string;
  contentManagementToken?: string;
  previewEnvironmentId?: string;
}

export interface TypeEditorConfigs {
  include?: number;
  imagePath?: string;
  allowContentTypeIds?: string[];
  searchField?: SearchValue;
  customQuery?: string;
  contentTypeId?: string;
  slugField?: string;
  displayField?: string;
  enableFilterByLocale?: boolean;
  enableAdvancedFilters?: boolean;
  includeFields?: string[];
}

export interface AssetTypeEditorConfigs {
  mimeTypes?: string[];
  searchType?: string;
  enableFilterByLocale?: boolean;
}

export interface SelectorDataEditor {
  entryIds: string[];
  locale?: string;
}
