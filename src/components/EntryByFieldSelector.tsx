import { FC, useEffect, useState } from 'react';
import { useAsync, useDebounce } from 'react-use';
import {
  DataResourceDynamicInputProvider,
  GetDataResourceMessage,
  Input,
  InputVariables,
  LoadingIndicator,
  ObjectSearchProvider,
  useMeshLocation,
  useObjectSearchContext,
} from '@uniformdev/mesh-sdk-react';
import { InternalEntry } from '../types/common';
import { mapResultEntry } from '../utils/mapper';
import { ARCHETYPES } from '../constants';
import { EntriesResponse } from '../types/contentfulTypes';
import { QueryPreviewList } from './QueryPreviewList';
import { capitalize } from '../utils';
import { LocaleSelector } from './LocaleSelector';
import { useDataResourceLocaleInfo } from '../hooks';

interface EntryByFieldProps {
  selectedContentTypeId: string;
  getDataResource: <TExpectedResult>(message: GetDataResourceMessage) => Promise<TExpectedResult>;
  handleSetValue: (value: string, locale: string) => void;
  imagePath?: string;
  slug?: string;
  slugField?: string;
  displayField?: string;
  locale?: string;
  enableFilterByLocale?: boolean;
}

const EntryByFieldTemplate: FC<EntryByFieldProps> = ({
  selectedContentTypeId,
  getDataResource,
  handleSetValue,
  imagePath,
  slug = '',
  slugField,
  displayField,
  locale,
  enableFilterByLocale,
}) => {
  const { boundQuery, onSetQuery } = useObjectSearchContext<{ slug: string; locale: string }>();

  const [searchKeyword, setSearchKeyword] = useState<string>(slug);
  const [debouncedSearchKeyword, setDebouncedSearchKeyword] = useState<string>(slug);

  const { metadata } = useMeshLocation<'dataResource'>();

  const handleLocaleChange = (newValue: string) => {
    handleSetValue(searchKeyword, newValue);
  };

  const { effectiveLocale, boundLocale = '' } = useDataResourceLocaleInfo({
    enableFilterByLocale,
    locale,
    setLocale: handleLocaleChange,
  });

  useDebounce(
    () => {
      setDebouncedSearchKeyword(searchKeyword);
    },
    300,
    [searchKeyword]
  );

  useEffect(() => {
    handleSetValue(debouncedSearchKeyword, effectiveLocale);
    onSetQuery({ slug: debouncedSearchKeyword, locale: effectiveLocale });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchKeyword, selectedContentTypeId, slugField, effectiveLocale]);

  const {
    value: loadedEntries = [],
    loading: loadingEntries,
    error: errorLoadingEntries,
  } = useAsync(async (): Promise<InternalEntry[]> => {
    const { slug = '' } = boundQuery;

    const response = await getDataResource<EntriesResponse>({
      method: 'GET',
      archetype: ARCHETYPES.QUERY,
      dataSourceVariant: metadata.dataSourceVariant,
      path: '/entries',
      parameters: [
        {
          key: 'content_type',
          value: selectedContentTypeId,
        },
        {
          key: `${slugField}[in]`,
          value: `${slug.replaceAll(',', ' ')}`,
        },
        // only load original entries without nested references to reduce bandwidth
        { key: 'include', value: '1' },
        {
          key: 'locale',
          // using bound locale here, because parameters do not support dynamic inputs, and getDataResource does not support variables
          value: boundLocale,
          omitIfEmpty: true,
        },
      ],
    });

    return mapResultEntry(response, {
      displayField,
      imagePath,
      archetype: ARCHETYPES.QUERY,
      slugField,
    });
  }, [boundQuery, imagePath, selectedContentTypeId, slugField, boundLocale, metadata.dataSourceVariant]);

  const fieldDisplayName = slugField?.includes('.')
    ? slugField?.substring(slugField?.lastIndexOf('.') + 1, slugField.length)
    : slugField;

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
        label={capitalize(fieldDisplayName)}
        id="slug"
        value={searchKeyword}
        onChange={(newValue) => setSearchKeyword(newValue ?? '')}
        inputWhenNoVariables={
          <Input
            name="slug"
            label=""
            value={searchKeyword}
            placeholder={`Provide value for ${fieldDisplayName}`}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />
        }
      />
      {loadingEntries ? (
        <LoadingIndicator />
      ) : (
        <QueryPreviewList items={loadedEntries} value={debouncedSearchKeyword} error={errorLoadingEntries} />
      )}
    </div>
  );
};

export const EntryByField: FC<EntryByFieldProps> = (args) => (
  <DataResourceDynamicInputProvider>
    <ObjectSearchProvider>
      <EntryByFieldTemplate {...args} />
    </ObjectSearchProvider>
  </DataResourceDynamicInputProvider>
);
