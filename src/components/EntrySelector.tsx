import React, { FC, useEffect, useMemo, useRef, useState } from 'react';
import { useAsync } from 'react-use';
import {
  Callout,
  ObjectSearchContainer,
  ObjectSearchFilter,
  ObjectSearchResultList,
  GetDataResourceMessage,
  useObjectSearchContext,
  DataResourceDynamicInputProvider,
  ObjectSearchProvider,
  useMeshLocation,
} from '@uniformdev/mesh-sdk-react';
import {
  ANY_CONTENT_TYPES,
  ARCHETYPES,
  DEFAULT_SEARCH_LIMIT,
  SEARCH_OPERATOR,
  SYSTEM_FILTER_FIELDS_OPTION,
} from '../constants';
import { EntriesResponse } from '../types/contentfulTypes';
import { mapCustomQuery, mapResultEntry, mapValidationError } from '../utils/mapper';
import { getSearchText, isEqualArrays } from '../utils';
import { ContentType, InternalEntry, SearchValue } from '../types/common';
import { searchQuery } from '../utils/common';
import { SelectedItemComponent } from './SelectedItemComponent';
import { SelectorDataEditor } from '../types/mesh';
import { LocaleSelector } from './LocaleSelector';
import { useDataResourceLocaleInfo } from '../hooks';

export interface EntrySelectorProps {
  contentTypes?: ContentType[];
  getDataResource: <TExpectedResult>(message: GetDataResourceMessage) => Promise<TExpectedResult>;
  handleSetValue: (newValue: SelectorDataEditor) => void;
  entryIds?: string;
  multiSelect?: boolean;
  imagePath?: string;
  searchField?: SearchValue;
  customQuery?: string;
  dynamicInputsValue?: string;
  locale?: string;
  enableFilterByLocale?: boolean;
  allowContentTypeIds: string[];
  includeFields: string[];
}

const EntrySelectorTemplate: FC<EntrySelectorProps> = ({
  contentTypes = [],
  getDataResource,
  handleSetValue,
  entryIds,
  multiSelect = false,
  imagePath,
  searchField,
  customQuery,
  dynamicInputsValue,
  locale,
  enableFilterByLocale,
  allowContentTypeIds = [],
}) => {
  const { boundQuery, query, onSetList, onSelectItem, selectedListItems } = useObjectSearchContext<
    Pick<EntrySelectorProps, 'locale'>,
    InternalEntry
  >();
  const currentDataSourceVariant = useRef<'unpublished' | undefined>();
  const [loadedEntries, setLoadedEntries] = useState<InternalEntry[]>([]);

  const selectedContentType = useMemo(() => {
    const defaultType: ContentType = !allowContentTypeIds.length
      ? { id: ANY_CONTENT_TYPES, name: 'title', displayField: 'title', fields: [] }
      : contentTypes[0];

    return (
      contentTypes.find(({ id, name }) => id === query.contentType || name === query.contentType) ||
      defaultType
    );
  }, [allowContentTypeIds.length, contentTypes, query.contentType]);

  const handleLocaleChange = (newValue: string) => {
    handleSetValue({
      entryIds: selectedItemsIds,
      locale: newValue,
    });
  };

  const { metadata } = useMeshLocation<'dataResource'>();

  const { effectiveLocale, boundLocale = '' } = useDataResourceLocaleInfo({
    enableFilterByLocale,
    locale,
    setLocale: handleLocaleChange,
  });

  const selectedItemsIds = useMemo(() => (entryIds ? entryIds.split(',') : []), [entryIds]);

  const itemsIds = useMemo(
    () => (dynamicInputsValue ? [dynamicInputsValue] : selectedItemsIds),
    [dynamicInputsValue, selectedItemsIds]
  );

  const { loading: loadingSearchState, value: searchState } = useAsync(async (): Promise<InternalEntry[]> => {
    const { keyword = '' } = boundQuery;

    const customSearchQuery = mapCustomQuery(customQuery) || [];

    const sameSearchField = customSearchQuery.find(
      ({ key }) => key === `${searchField?.id}${SEARCH_OPERATOR}`
    );

    const searchText =
      sameSearchField && keyword ? `${keyword},${sameSearchField.value}` : getSearchText(keyword);

    const allowCustomSearchQuery =
      sameSearchField && keyword
        ? customSearchQuery.filter(({ key }) => key !== sameSearchField.key)
        : customSearchQuery;

    const isSingleContentTypeFilter = selectedContentType.id !== ANY_CONTENT_TYPES;
    const titleFieldId = isSingleContentTypeFilter ? `fields.${selectedContentType.displayField}` : '';

    const validatedSearchField = (() => {
      if (searchField?.id.startsWith('sys.')) {
        return SYSTEM_FILTER_FIELDS_OPTION.find(({ id }) => id === searchField?.id) ? searchField : undefined;
      }

      if (!isSingleContentTypeFilter || !searchField) {
        return undefined;
      }

      // We support only 2 types of filter: by system properties (sys.id, sys.revision, etc) and by fields (fields.title. fields.file.url, etc)
      const fieldId = searchField.id.substring(7);

      return selectedContentType.fields?.find(({ id }) => id === fieldId) ? searchField : undefined;
    })();

    const thumbnailFieldId =
      isSingleContentTypeFilter && imagePath && selectedContentType.fields?.find(({ id }) => id === imagePath)
        ? `fields.${imagePath}`
        : '';

    const response = await getDataResource<EntriesResponse>({
      method: 'GET',
      path: `/entries`,
      archetype: ARCHETYPES.MULTIPLE,
      dataSourceVariant: metadata.dataSourceVariant,
      parameters: [
        ...(isSingleContentTypeFilter
          ? [
              {
                key: 'content_type',
                value: selectedContentType.id,
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
          key: 'limit',
          value: DEFAULT_SEARCH_LIMIT,
        },
        // only load original entries without nested references to reduce bandwidth
        {
          key: 'include',
          // We need to load assets only if imagePath is set. Include 0 will not load even assets.
          value: thumbnailFieldId ? '1' : '0',
        },
        ...searchQuery(validatedSearchField, searchText),
        ...(titleFieldId
          ? [
              {
                key: 'select',
                value: ['sys', titleFieldId, thumbnailFieldId].filter(Boolean).join(','),
              },
            ]
          : []),
        ...allowCustomSearchQuery,
        // filtering dublicates, prioritizing parameters Custom Query.
      ].filter(({ key }, index, arr) => arr.findLastIndex(({ key: k }) => k === key) === index),
    });

    return mapResultEntry(
      response,
      {
        displayField: selectedContentType.name,
        imagePath,
        archetype: multiSelect ? ARCHETYPES.MULTIPLE : ARCHETYPES.SINGLE,
      },
      contentTypes
    );
  }, [boundQuery, selectedContentType, boundLocale, customQuery, imagePath, metadata.dataSourceVariant]);

  useEffect(
    () => {
      if (!loadingSearchState) {
        onSetList({ items: searchState });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchState, loadingSearchState]
  );

  const { loading: loadingEntries, error: errorLoadingEntries } = useAsync(async (): Promise<void> => {
    const loadedObjectsIds = loadedEntries.map(({ id }) => id);
    const hasNewObject =
      itemsIds.find((id) => !loadedObjectsIds.includes(id)) ||
      currentDataSourceVariant.current !== metadata.dataSourceVariant;
    currentDataSourceVariant.current = metadata.dataSourceVariant;

    if (hasNewObject) {
      const isSingleContentTypeFilter = selectedContentType.id !== ANY_CONTENT_TYPES;
      const titleFieldId = isSingleContentTypeFilter ? `fields.${selectedContentType.displayField}` : '';
      const thumbnailFieldId =
        isSingleContentTypeFilter &&
        imagePath &&
        selectedContentType.fields?.find(({ id }) => id === imagePath)
          ? `fields.${imagePath}`
          : '';

      const response = await getDataResource<EntriesResponse>({
        method: 'GET',
        path: `/entries`,
        archetype: ARCHETYPES.MULTIPLE,
        dataSourceVariant: metadata.dataSourceVariant,
        parameters: [
          { key: 'sys.id[in]', value: itemsIds.join(',') },
          // only load original entries without nested references to reduce bandwidth
          { key: 'include', value: '1' },
          {
            key: 'locale',
            value: boundLocale,
            omitIfEmpty: true,
          },
          // Multiple entries archetype can be used to select different entries from different content types.
          // So this limitation is only safe for single content type archetype.
          ...(titleFieldId && metadata.archetype === ARCHETYPES.SINGLE
            ? [
                // we need to add content type parameter here, otherwise contentful does now allow selecting particular fields
                {
                  key: 'content_type',
                  value: selectedContentType.id,
                },
                {
                  key: 'select',
                  // For particular content type we know exactly which fields we need.
                  value: ['sys', titleFieldId, thumbnailFieldId].filter(Boolean).join(','),
                },
              ]
            : []),
        ],
      });

      setLoadedEntries(
        mapResultEntry(
          response,
          {
            displayField: selectedContentType.name,
            imagePath,
            archetype: multiSelect ? ARCHETYPES.MULTIPLE : ARCHETYPES.SINGLE,
          },
          contentTypes
        )
      );
    } else {
      setLoadedEntries(loadedEntries.filter(({ id }) => itemsIds.includes(id)));
    }
  }, [itemsIds, loadingSearchState, boundLocale, metadata.dataSourceVariant]);

  const selectedItems = useMemo(
    () =>
      itemsIds.map(
        (id) =>
          loadedEntries.find((loadedObject) => loadedObject.id === id) || {
            id,
            title: loadingEntries ? `Loading...` : `Record(${id}) not found`,
            contentType: '',
          }
      ),
    [itemsIds, loadedEntries, loadingEntries]
  );

  useEffect(
    () => {
      if (!entryIds) {
        return;
      }
      if (dynamicInputsValue) {
        onSelectItem(selectedItems.map((item) => ({ ...item, id: entryIds })));
      } else {
        onSelectItem(selectedItems);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedItems]
  );

  useEffect(
    () => {
      const selectedEntriesIds = selectedListItems.map(({ id }) => id);

      if (!isEqualArrays(selectedEntriesIds, selectedItemsIds)) {
        handleSetValue({
          entryIds: selectedEntriesIds,
          locale: effectiveLocale,
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedListItems]
  );

  const contentTypesOptions = useMemo(
    () => contentTypes.map(({ id, name }) => ({ id, label: name })),
    [contentTypes]
  );

  const onRemoveAllSelectedItems = () => {
    handleSetValue({ entryIds: [] });
  };

  return (
    <ObjectSearchContainer
      label="Select Entry"
      enableDynamicInputToResultId
      searchFilters={
        <>
          <ObjectSearchFilter
            selectOptions={contentTypesOptions}
            requireContentType={!!allowContentTypeIds.length}
          />
          {enableFilterByLocale && (
            <LocaleSelector
              effectiveLocale={effectiveLocale}
              boundLocale={boundLocale}
              handleLocaleChange={handleLocaleChange}
            />
          )}
        </>
      }
    >
      {errorLoadingEntries?.message ? (
        <Callout type="error">{mapValidationError(errorLoadingEntries)}</Callout>
      ) : (
        <ObjectSearchResultList<InternalEntry>
          hideRemoveButton={selectedItemsIds.length <= 1}
          onRemoveAllSelected={onRemoveAllSelectedItems}
          whenNothingSelected="Nothing selected yet"
          renderResultComponent={(value) => (
            <SelectedItemComponent
              key={value.id}
              selectedItem={value}
              disableDnD={selectedItemsIds.length <= 1}
            />
          )}
        />
      )}
    </ObjectSearchContainer>
  );
};

export const EntrySelector = (args: EntrySelectorProps) => {
  return (
    <DataResourceDynamicInputProvider>
      <ObjectSearchProvider isMulti={args.multiSelect}>
        <EntrySelectorTemplate {...args} />
      </ObjectSearchProvider>
    </DataResourceDynamicInputProvider>
  );
};
