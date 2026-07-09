import { FC, useMemo } from 'react';
import { Callout, LoadingOverlay, useMeshLocation } from '@uniformdev/mesh-sdk-react';
import { TypeEditorConfigs } from '../../types/mesh';
import { mapContentType } from '../../utils/mapper';
import { EntryByField } from '../../components';
import { useAsync } from 'react-use';
import { ContentTypesResponse } from '../../types/contentfulTypes';
import { CONTENT_TYPES_FETCH_LIMIT, ERROR_MESSAGE } from '../../constants';
const EntryDataEditor: FC = () => {
  const {
    value: meshLocationValue,
    setValue: setMeshLocationValue,
    metadata,
    getDataResource,
  } = useMeshLocation<'dataResource'>();

  const { imagePath, contentTypeId, slugField, displayField, enableFilterByLocale } =
    (metadata.dataType.custom as TypeEditorConfigs) || {};

  const { slug, locale } = meshLocationValue;

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

  const currentContentType = useMemo(
    () => contentTypes.find(({ id }) => id === contentTypeId) || contentTypes[0],
    [contentTypeId, contentTypes]
  );

  const currentSlugField = useMemo(
    () =>
      currentContentType?.fields.find(({ id }) => `fields.${id}` === slugField) ||
      currentContentType?.fields[0],
    [currentContentType?.fields, slugField]
  );

  const handleSetValue = (newSlug?: string, locale?: string) => {
    setMeshLocationValue(() => ({
      newValue: {
        slug: newSlug || '',
        slugField: currentSlugField?.id ? `fields.${currentSlugField?.id}[in]` : '',
        contentType: currentContentType?.id,
        // ensure we don't set locale if filtering by locale is disabled
        locale: enableFilterByLocale ? (locale ?? '') : '',
      },
    }));
  };

  if (errorContentTypes) {
    return <Callout type="error">{ERROR_MESSAGE}</Callout>;
  }

  if (loadingContentTypes) {
    return (
      <div className="loading-container">
        <LoadingOverlay isActive />
      </div>
    );
  }

  return (
    <div className="entry-search-wrapper">
      <EntryByField
        slugField={currentSlugField?.id ? `fields.${currentSlugField?.id}` : ''}
        slug={slug}
        getDataResource={getDataResource}
        handleSetValue={handleSetValue}
        imagePath={imagePath}
        selectedContentTypeId={currentContentType?.id}
        displayField={displayField}
        locale={locale}
        enableFilterByLocale={enableFilterByLocale}
      />
    </div>
  );
};

export default EntryDataEditor;
