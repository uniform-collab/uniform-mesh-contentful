import React, { FC, useEffect, useMemo, useState } from 'react';
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
import { ARCHETYPES, MIME_TYPES_OPTIONS, SEAERCH_TYPES_OPTIONS } from '../constants';
import { mapResultAssets, mapValidationError } from '../utils/mapper';
import { capitalise, getSearchText, isEqualArrays } from '../utils';
import { InternalEntry, SearchValue } from '../types/common';
import { SelectedItemComponent } from './SelectedItemComponent';
import { AssetsResponse } from '../types/contentfulTypes';
import { LocaleSelector } from './LocaleSelector';
import { useDataResourceLocaleInfo } from '../hooks';

export interface AssetsSelectorProps {
  mimeTypes?: string[];
  searchType?: string;
  selectedItemsIds: string[];
  selectedContentTypeId: string;
  getDataResource: <TExpectedResult>(message: GetDataResourceMessage) => Promise<TExpectedResult>;
  handleSetValue: (mimeTypes: string[], locale: string) => void | Promise<void>;
  searchField?: SearchValue;
  locale: string;
  enableFilterByLocale?: boolean;
}

export const AssetsSelectorTemplate: FC<AssetsSelectorProps> = ({
  mimeTypes = [],
  searchType = SEAERCH_TYPES_OPTIONS[0].value,
  getDataResource,
  handleSetValue,
  selectedItemsIds,
  locale,
  enableFilterByLocale,
}) => {
  const { boundQuery, onSetList, onSelectItem, selectedListItems } =
    useObjectSearchContext<Pick<AssetsSelectorProps, 'locale'>>();
  const [needsReload, setNeedsReload] = useState(false);

  const handleLocaleChange = (newLocale: string) => {
    handleSetValue(selectedItemsIds, newLocale);
  };

  const { metadata } = useMeshLocation<'dataResource'>();

  const { effectiveLocale, boundLocale = '' } = useDataResourceLocaleInfo({
    enableFilterByLocale,
    locale,
    setLocale: handleLocaleChange,
  });

  const [loadedAssets, setLoadedAssets] = useState<InternalEntry[]>([]);

  const mimeTypeOptions = useMemo(() => {
    if (mimeTypes.length) {
      return mimeTypes.map((item) => ({ id: item, label: capitalise(item) }));
    }
    return MIME_TYPES_OPTIONS.map(({ value, label }) => ({ id: value, label }));
  }, [mimeTypes]);

  const [selectedType, setSelectedType] = useState<{ id: string; label: string }>(mimeTypeOptions[0]);

  const findCurrentContentType = (contentType: string) =>
    mimeTypeOptions.find(({ id, label }) => id === contentType || label === contentType);

  const { loading: loadingSearchState, value: searchState = [] } = useAsync(async (): Promise<
    InternalEntry[]
  > => {
    const { keyword = '', contentType = '' } = boundQuery;

    const currentType = findCurrentContentType(contentType || selectedType.id);

    setSelectedType(currentType || { id: contentType, label: contentType });

    const searchText = getSearchText(keyword);
    const response = await getDataResource<AssetsResponse>({
      method: 'GET',
      path: `/assets`,
      archetype: ARCHETYPES.ASSETS,
      dataSourceVariant: metadata.dataSourceVariant,
      parameters: [
        {
          key: `${searchType}[match]`,
          value: searchText,
        },
        { key: 'mimetype_group', value: currentType?.id || contentType },
        // only load original assets without nested references to reduce bandwidth
        { key: 'include', value: '1' },
        {
          key: 'locale',
          // using bound locale here, because parameters do not support dynamic inputs, and getDataResource does not support variables
          value: boundLocale,
          omitIfEmpty: true,
        },
      ],
    });

    setNeedsReload(false);

    return mapResultAssets(response);
  }, [boundQuery, boundLocale, metadata.dataSourceVariant, needsReload]);

  useEffect(
    () => {
      if (!loadingSearchState) {
        onSetList({ items: searchState });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchState, loadingSearchState]
  );

  const { loading: loadingAssets, error: errorLoadingAssets } = useAsync(async (): Promise<void> => {
    const loadedObjectsIds = loadedAssets.map(({ id }) => id);
    const hasNewObject = selectedItemsIds.find((id) => !loadedObjectsIds.includes(id));

    if (hasNewObject || needsReload) {
      const response = await getDataResource<AssetsResponse>({
        method: 'GET',
        path: `/assets`,
        archetype: ARCHETYPES.ASSETS,
        dataSourceVariant: metadata.dataSourceVariant,
        parameters: [
          { key: 'sys.id[in]', value: selectedItemsIds.join(',') },
          {
            key: 'locale',
            // using bound locale here, because parameters do not support dynamic inputs, and getDataResource does not support variables
            value: boundLocale,
            omitIfEmpty: true,
          },
        ],
      });

      setLoadedAssets(mapResultAssets(response));
    } else {
      setLoadedAssets(loadedAssets.filter(({ id }) => selectedItemsIds.includes(id)));
    }

    setNeedsReload(false);
  }, [selectedItemsIds, loadingSearchState, boundLocale, metadata.dataSourceVariant, needsReload]);

  const selectedItems = useMemo(
    () =>
      selectedItemsIds.map(
        (id) =>
          loadedAssets.find((loadedObject) => loadedObject.id === id) || {
            id,
            title: loadingAssets ? `Loading...` : `Record(${id}) not found`,
            contentType: '',
          }
      ),
    [loadedAssets, loadingAssets, selectedItemsIds]
  );

  useEffect(
    () => {
      onSelectItem(selectedItems);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedItems]
  );

  useEffect(
    () => {
      const selectedEntriesIds = selectedListItems.map(({ id }) => id);
      if (!loadingAssets && !isEqualArrays(selectedItemsIds, selectedEntriesIds)) {
        handleSetValue(selectedEntriesIds, effectiveLocale);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedListItems, loadingAssets]
  );

  const onRemoveAllSelectedItems = () => {
    handleSetValue([], effectiveLocale);
  };

  return (
    <ObjectSearchContainer
      searchFilters={
        <>
          <ObjectSearchFilter selectOptions={mimeTypeOptions} requireContentType />
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
      {errorLoadingAssets?.message ? (
        <Callout type="error">{mapValidationError(errorLoadingAssets)}</Callout>
      ) : (
        <ObjectSearchResultList
          whenNothingSelected="Nothing selected yet"
          hideRemoveButton={selectedItemsIds.length <= 1}
          onRemoveAllSelected={onRemoveAllSelectedItems}
          renderResultComponent={(value) => (
            <SelectedItemComponent
              key={value.id}
              selectedItem={value}
              disableDnD={selectedItemsIds.length <= 1}
              reloadEntries={() => setNeedsReload(true)}
            />
          )}
        />
      )}
    </ObjectSearchContainer>
  );
};

export const AssetsSelector = (args: AssetsSelectorProps) => (
  <DataResourceDynamicInputProvider>
    <ObjectSearchProvider isMulti>
      <AssetsSelectorTemplate {...args} />
    </ObjectSearchProvider>
  </DataResourceDynamicInputProvider>
);
