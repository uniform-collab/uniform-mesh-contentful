import React, { ChangeEvent, FC, useEffect, useMemo, useState } from 'react';
import { useAsync } from 'react-use';
import {
  Callout,
  DataResourceDynamicInputProvider,
  GetDataResourceMessage,
  Input,
  InputSelect,
  InputVariables,
  Label,
  LoadingIndicator,
  ObjectSearchProvider,
  useMeshLocation,
  useObjectSearchContext,
} from '@uniformdev/mesh-sdk-react';
import {
  ContentType,
  EntryQueryOutputParams,
  InternalEntry,
  SearchParameter,
  SearchValue,
} from '../types/common';
import { EntriesResponse } from '../types/contentfulTypes';
import {
  ALL_CONTENT_TYPES_LABEL,
  ANY_CONTENT_TYPES,
  ARCHETYPES,
  DEFAULT_COUNT_FOR_QUERY,
  SEARCH_OPERATOR,
  SORT_FIELD_AVAILABLE_TYPES,
  SORT_TYPE,
  SYSTEM_FILTER_FIELDS_OPTION,
} from '../constants';
import { QueryPreviewList } from '../components';
import { getSearchText } from '../utils';
import { mapCustomQuery, mapResultEntry } from '../utils/mapper';
import { searchQuery } from '../utils/common';
import AdvancedFiltering from './AdvancedFiltering';
import { LocaleSelector } from './LocaleSelector';
import { useDataResourceLocaleInfo } from '../hooks';

const DEFAULT_SORT_OPTIONS = [
  { label: 'Select a sort', value: '' },
  { label: 'ID', value: 'sys.id' },
  { label: 'CreatedAt', value: 'sys.createdAt' },
  { label: 'UpdatedAt', value: 'sys.updatedAt' },
];
const SORT_ORDER = [
  { label: 'Ascending', value: SORT_TYPE.ASC },
  { label: 'Descending', value: SORT_TYPE.DESC },
];

// need check the doc
const MAX_FETCH_LIMIT = 100;

export interface EntryQueryProps {
  allowContentTypes?: ContentType[];
  selectedContentTypeId: string;
  keyword?: string;
  count?: string;
  skip?: string;
  sortFieldId?: string;
  sortOrder?: SORT_TYPE;
  getDataResource: <TExpectedResult>(message: GetDataResourceMessage) => Promise<TExpectedResult>;
  handleSetValue: (value: EntryQueryOutputParams) => void | Promise<void>;
  searchField?: SearchValue;
  imagePath?: string;
  displayName?: string;
  customQuery?: string;
  advancedFilters?: SearchParameter[];
  locale?: string;
  enableFilterByLocale?: boolean;
  enableAdvancedFilters?: boolean;
  allowContentTypeIds: string[];
}

const EntryQueryTemplate: FC<EntryQueryProps> = ({
  allowContentTypes = [],
  selectedContentTypeId = '',
  keyword = '',
  count = DEFAULT_COUNT_FOR_QUERY,
  skip = '',
  sortFieldId = DEFAULT_SORT_OPTIONS[0].value,
  sortOrder = SORT_ORDER[0].value,
  getDataResource,
  handleSetValue,
  imagePath,
  searchField,
  customQuery,
  advancedFilters = [],
  locale,
  enableFilterByLocale,
  enableAdvancedFilters,
  allowContentTypeIds = [],
}) => {
  const { boundQuery, onSetQuery } = useObjectSearchContext<EntryQueryOutputParams>();

  const selectedContentType = useMemo(() => {
    const defaultType = !allowContentTypeIds.length
      ? { id: ANY_CONTENT_TYPES, displayField: 'title', fields: [], name: '' }
      : allowContentTypes[0];
    return allowContentTypes.find(({ id }) => selectedContentTypeId === id) || defaultType;
  }, [allowContentTypeIds.length, allowContentTypes, selectedContentTypeId]);

  const { metadata } = useMeshLocation<'dataResource'>();

  const handleLocaleChange = (newValue: string) => {
    handleSetValue({ ...queryProps, locale: newValue });
  };

  const { boundLocale = '', effectiveLocale } = useDataResourceLocaleInfo({
    enableFilterByLocale,
    locale,
    setLocale: handleLocaleChange,
  });

  const [queryProps, setQueryProps] = useState<EntryQueryOutputParams>(() => ({
    contentTypeId: selectedContentTypeId,
    keyword,
    count,
    countFieldValue: String(count),
    skip,
    skipFieldValue: String(skip),
    sortFieldId,
    sortOrder,
    advancedFilters,
    locale: boundLocale,
  }));

  const isDynamicInputs = useMemo(
    () => JSON.stringify(boundQuery) !== JSON.stringify(queryProps),
    [boundQuery, queryProps]
  );

  useEffect(() => {
    setQueryProps({ ...queryProps, contentTypeId: selectedContentType.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedContentType.id]);

  useEffect(() => {
    handleSetValue({ ...queryProps, locale: effectiveLocale });
    onSetQuery({ ...queryProps, locale: effectiveLocale });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryProps, effectiveLocale]);

  const handleQueryPropsChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setQueryProps((prevState) => ({ ...prevState, [name]: value }));
  };

  const handleDynamicQueryPropsChange = (newValue: string, name: string) => {
    setQueryProps((prevState) => ({ ...prevState, [name]: newValue }));
  };

  const handleSetFilters = (filtersValue: SearchParameter[]) => {
    setQueryProps((prevState) => ({ ...prevState, advancedFilters: filtersValue }));
  };

  const handleCountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { valueAsNumber, value: valueAsString } = e.target;

    const count = isNaN(valueAsNumber)
      ? queryProps.count
      : Math.min(MAX_FETCH_LIMIT, Math.abs(valueAsNumber));
    const countFieldValue = isNaN(valueAsNumber) ? valueAsString : String(count);
    setQueryProps((prevState) => ({
      ...prevState,
      count,
      countFieldValue,
    }));
  };

  const handleSkipChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { valueAsNumber, value: valueAsString } = e.target;

    const skip = isNaN(valueAsNumber) ? 0 : Math.abs(valueAsNumber);
    const skipFieldValue = isNaN(valueAsNumber) ? valueAsString : String(skip);
    setQueryProps((prevState) => ({
      ...prevState,
      skip,
      skipFieldValue,
    }));
  };

  const {
    value: loadedEntries = [],
    loading: loadingEntries,
    error: errorLoadingEntries,
  } = useAsync(async (): Promise<InternalEntry[]> => {
    const { contentTypeId, keyword, count, skip, sortFieldId, sortOrder, advancedFilters } = boundQuery;

    const currentContentType = contentTypeId || selectedContentType.id;

    const customSearchQuery = mapCustomQuery(customQuery);

    const sameSearchField = customSearchQuery?.find(
      ({ key }) => key === `${searchField?.id}${SEARCH_OPERATOR}`
    );

    const searchText =
      sameSearchField && keyword ? `${keyword},${sameSearchField.value}` : getSearchText(keyword);

    const allowCustomSearchQuery =
      sameSearchField && keyword
        ? customSearchQuery?.filter(({ key }) => key !== sameSearchField.key)
        : customSearchQuery;

    const currentCount = count ? count : DEFAULT_COUNT_FOR_QUERY;

    const advancedFiltersQuery = advancedFilters?.length
      ? advancedFilters.map(({ key, value, operator }) => ({
          key: `${key}${operator}`,
          value,
        }))
      : [];

    const isSingleContentTypeFilter = selectedContentType.id !== ANY_CONTENT_TYPES;
    const titleFieldId = isSingleContentTypeFilter ? `fields.${selectedContentType.displayField}` : '';

    const validatedSearchField = (() => {
      if (!isSingleContentTypeFilter || !searchField) {
        return undefined;
      }

      // We support only 2 types of filter: by system properties (sys.id, sys.revision, etc) and by fields (fields.title. fields.file.url, etc)
      const fieldId = searchField.id.startsWith('sys.') ? searchField.id : searchField.id.substring(7);

      return selectedContentType.fields?.find(({ id }) => id === fieldId) ||
        SYSTEM_FILTER_FIELDS_OPTION.find(({ id }) => id === fieldId)
        ? searchField
        : undefined;
    })();

    const thumbnailFieldId =
      isSingleContentTypeFilter && imagePath && selectedContentType.fields?.find(({ id }) => id === imagePath)
        ? `fields.${imagePath}`
        : '';

    const response = await getDataResource<EntriesResponse>({
      method: 'GET',
      path: '/entries',
      archetype: ARCHETYPES.QUERY,
      dataSourceVariant: metadata.dataSourceVariant,
      parameters: [
        ...searchQuery(validatedSearchField, searchText),
        ...(isSingleContentTypeFilter
          ? [
              {
                key: 'content_type',
                value: currentContentType,
              },
            ]
          : []),
        {
          key: 'locale',
          // using bound locale here, because parameters do not support dynamic inputs, and getDataResource does not support variables
          value: boundLocale,
          omitIfEmpty: true,
        },
        {
          key: 'order',
          value: sortFieldId ? `${sortOrder === SORT_TYPE.DESC ? '-' : ''}${sortFieldId}` : '',
          omitIfEmpty: true,
        },
        {
          key: 'limit',
          value: String(currentCount),
        },
        // only load original entries without nested references to reduce bandwidth
        {
          key: 'include',
          // We need to load assets only if imagePath is set. Include 0 will not load even assets.
          value: thumbnailFieldId ? '1' : '0',
        },
        {
          key: 'skip',
          value: Number(skip) > 0 ? String(skip) : '',
          omitIfEmpty: true,
        },
        ...(isSingleContentTypeFilter
          ? [
              {
                key: 'select',
                // For particular content type we know exactly which fields we need.
                value: ['sys', titleFieldId, thumbnailFieldId].filter(Boolean).join(','),
              },
            ]
          : []),
        ...advancedFiltersQuery,
        ...(allowCustomSearchQuery ?? []),
        // filtering dublicates, prioritizing parameters Custom Query.
      ].filter(({ key }, index, arr) => arr.findLastIndex(({ key: k }) => k === key) === index),
    });

    return mapResultEntry(
      response,
      {
        displayField: selectedContentType?.displayField,
        imagePath,
        archetype: ARCHETYPES.QUERY,
      },
      allowContentTypes
    );
  }, [boundQuery, customQuery, selectedContentType, boundLocale, metadata.dataSourceVariant]);

  const sortOptions = useMemo(() => {
    const fields = allowContentTypes?.find(({ id }) => id === queryProps.contentTypeId)?.fields || [];
    const availableFieldsForSort = fields
      .filter(({ type }) => SORT_FIELD_AVAILABLE_TYPES.includes(type))
      .map(({ name: label, id: value }) => ({
        label,
        value: `fields.${value}`,
      }));

    return [...DEFAULT_SORT_OPTIONS, ...availableFieldsForSort];
  }, [allowContentTypes, queryProps.contentTypeId]);

  useEffect(() => {
    const isThereSuchOption = sortOptions.some(({ value }) => value === queryProps.sortFieldId);

    if (!isThereSuchOption && !isDynamicInputs) {
      setQueryProps((prevState) => ({ ...prevState, sortFieldId: '' }));
    }
  }, [sortOptions, queryProps.sortFieldId, isDynamicInputs]);

  const allowContentTypesOptions = allowContentTypes.map(({ name: label, id: value }) => ({ label, value }));

  const isWrongNumberOfResult =
    !loadingEntries &&
    Boolean(loadedEntries.length) &&
    Boolean(count) &&
    !isNaN(Number(count)) &&
    loadedEntries.length !== Number(count);

  return (
    <div className="data-type-editor">
      {enableFilterByLocale && (
        <LocaleSelector
          effectiveLocale={effectiveLocale}
          boundLocale={boundLocale}
          handleLocaleChange={handleLocaleChange}
        />
      )}

      <InputVariables
        label="Search by"
        id="keyword"
        value={queryProps?.keyword}
        onChange={(newValue = '') => handleDynamicQueryPropsChange(newValue, 'keyword')}
        disableInlineMenu={true}
        inputWhenNoVariables={
          <Input
            name="keyword"
            label=""
            value={queryProps.keyword}
            placeholder="Enter keyword"
            onChange={handleQueryPropsChange}
          />
        }
      />
      <InputVariables
        label="Filter by Content Type"
        id="contentTypeId"
        value={queryProps?.contentTypeId}
        onChange={(newValue = '') =>
          handleDynamicQueryPropsChange(newValue || allowContentTypesOptions[0]?.value, 'contentTypeId')
        }
        disableInlineMenu={true}
        inputWhenNoVariables={
          <InputSelect
            id="contentTypeId"
            options={
              allowContentTypeIds.length
                ? allowContentTypesOptions
                : [{ label: ALL_CONTENT_TYPES_LABEL, value: ANY_CONTENT_TYPES }, ...allowContentTypesOptions]
            }
            disabled={allowContentTypesOptions.length < 2}
            name="contentTypeId"
            label=""
            value={queryProps.contentTypeId}
            onChange={handleQueryPropsChange}
          />
        }
      />
      <div className="count-sort-order" data-testid="count-sort-order">
        <InputVariables
          label="Count"
          id="count"
          value={queryProps?.count.toString()}
          onChange={(newValue = '') => handleDynamicQueryPropsChange(newValue, 'count')}
          disableInlineMenu={true}
          inputWhenNoVariables={
            <Input
              name="count"
              type="number"
              min="1"
              step="1"
              max={MAX_FETCH_LIMIT}
              label=""
              value={queryProps.countFieldValue}
              onChange={handleCountChange}
            />
          }
        />
        <InputVariables
          label="Skip"
          id="skip"
          value={queryProps?.skip?.toString()}
          onChange={(newValue = '') => handleDynamicQueryPropsChange(newValue, 'skip')}
          disableInlineMenu={true}
          inputWhenNoVariables={
            <Input
              name="skip"
              type="number"
              min="0"
              step="1"
              label=""
              value={queryProps.skipFieldValue}
              onChange={handleSkipChange}
            />
          }
        />
        <InputVariables
          label="Sort"
          id="sortFieldId"
          value={queryProps?.sortFieldId}
          onChange={(newValue = '') =>
            handleDynamicQueryPropsChange(newValue || sortOptions[0]?.value, 'sortFieldId')
          }
          disableInlineMenu={true}
          inputWhenNoVariables={
            <InputSelect
              options={sortOptions}
              name="sortFieldId"
              label=""
              value={queryProps.sortFieldId}
              onChange={handleQueryPropsChange}
              css={{ whiteSpace: 'nowrap' }}
            />
          }
        />
        <InputVariables
          label="Sort Order"
          id="sortOrder"
          value={queryProps?.sortOrder}
          disableVariables={!queryProps.sortFieldId}
          onChange={(newValue) =>
            handleDynamicQueryPropsChange(newValue || SORT_ORDER[0]?.value, 'sortOrder')
          }
          disableInlineMenu={true}
          inputWhenNoVariables={
            <InputSelect
              options={SORT_ORDER}
              disabled={!queryProps.sortFieldId}
              name="sortOrder"
              label=""
              value={queryProps.sortOrder}
              onChange={handleQueryPropsChange}
            />
          }
        />
      </div>
      {enableAdvancedFilters && selectedContentType.id !== ANY_CONTENT_TYPES && (
        <AdvancedFiltering
          contentType={selectedContentType}
          setSearchParamsValue={handleSetFilters}
          customFiltersValue={queryProps.advancedFilters}
        />
      )}
      <div>
        <div className="entries-heading">
          <Label>Entries matching the query</Label>
          {loadingEntries && <LoadingIndicator />}
        </div>
        <QueryPreviewList
          items={loadedEntries}
          contentTypeLabel={selectedContentType.name}
          archetype={ARCHETYPES.QUERY}
          error={errorLoadingEntries}
        />
      </div>
      {isWrongNumberOfResult && (
        <Callout type="info">
          <span>The number of returned items doesn&apos;t match the count limit in the query.</span>
        </Callout>
      )}
    </div>
  );
};

export const EntryQuery = (args: EntryQueryProps) => {
  return (
    <DataResourceDynamicInputProvider>
      <ObjectSearchProvider>
        <EntryQueryTemplate {...args} />
      </ObjectSearchProvider>
    </DataResourceDynamicInputProvider>
  );
};
