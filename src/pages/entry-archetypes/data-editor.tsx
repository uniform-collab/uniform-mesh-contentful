import { FC, useMemo } from 'react';
import { useAsync } from 'react-use';
import { Callout, LoadingOverlay, useMeshLocation } from '@uniformdev/mesh-sdk-react';
import { EntrySelector } from '../../components';
import { SelectorDataEditor, TypeEditorConfigs } from '../../types/mesh';
import { ARCHETYPES, CONTENT_TYPES_FETCH_LIMIT } from '../../constants';
import { ContentTypesResponse } from '../../types/contentfulTypes';
import { mapContentType } from '../../utils/mapper';
import { dynamicInputsReplacer } from '../../utils';

const EntryDataEditor: FC = () => {
  const {
    value: meshLocationValue,
    setValue: setMeshLocationValue,
    metadata,
    getDataResource,
  } = useMeshLocation<'dataResource'>();

  const {
    allowContentTypeIds = [],
    imagePath,
    searchField,
    customQuery,
    enableFilterByLocale,
    includeFields = [],
  } = (metadata.dataType.custom as TypeEditorConfigs) || {};

  const { archetype, dynamicInputs } = metadata;

  const isMulti = archetype === ARCHETYPES.MULTIPLE;

  const {
    value: contentTypes = [],
    error: errorContentTypes,
    loading: loadingContentTypes,
  } = useAsync(async () => {
    const response = await getDataResource<ContentTypesResponse>({
      method: 'GET',
      path: '/content_types',
      parameters: [{ key: 'limit', value: CONTENT_TYPES_FETCH_LIMIT }],
    });

    return mapContentType(response);
  }, []);

  const allowContentTypes = useMemo(
    () =>
      allowContentTypeIds.length
        ? contentTypes.filter(({ id }) => allowContentTypeIds.includes(id))
        : contentTypes,
    [allowContentTypeIds, contentTypes]
  );

  const handleSetValue = (newValue: SelectorDataEditor) => {
    const { entryIds = [], locale = '' } = newValue || {};
    setMeshLocationValue(() => ({
      newValue: {
        entryIds: entryIds.join(','),
        // ensure we don't set locale if filtering by locale is disabled
        locale: enableFilterByLocale ? locale : '',
      },
    }));
  };

  if (errorContentTypes) {
    return (
      <Callout type="error">
        <span>Something seems to have gone wrong. Maybe the previously saved data is out of date.</span>
      </Callout>
    );
  }

  const { entryIds, locale } = meshLocationValue;

  if (loadingContentTypes) {
    return (
      <div className="loading-container">
        <LoadingOverlay isActive />
      </div>
    );
  }

  return (
    <div className="entry-search-wrapper" data-testid="select-entry">
      <EntrySelector
        contentTypes={allowContentTypes}
        getDataResource={getDataResource}
        entryIds={entryIds}
        handleSetValue={handleSetValue}
        imagePath={imagePath}
        multiSelect={isMulti}
        searchField={searchField}
        customQuery={allowContentTypeIds ? customQuery : ''}
        dynamicInputsValue={dynamicInputsReplacer(entryIds, dynamicInputs)}
        locale={locale}
        enableFilterByLocale={enableFilterByLocale}
        allowContentTypeIds={allowContentTypeIds}
        includeFields={includeFields}
      />
    </div>
  );
};

export default EntryDataEditor;
