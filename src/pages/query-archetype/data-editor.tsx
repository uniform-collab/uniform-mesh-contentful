import { FC } from 'react';
import { useAsync } from 'react-use';
import { Callout, LoadingOverlay, useMeshLocation } from '@uniformdev/mesh-sdk-react';
import { TypeEditorConfigs } from '../../types/mesh';
import { ANY_CONTENT_TYPES, CONTENT_TYPES_FETCH_LIMIT, SEARCH_OPERATOR, SORT_TYPE } from '../../constants';
import { ContentTypesResponse } from '../../types/contentfulTypes';
import { mapContentType, mapCustomQuery } from '../../utils/mapper';
import { EntryQueryOutputParams } from '../../types/common';
import { EntryQuery } from '../../components';

const QueryDataEditor: FC = () => {
  const {
    value: meshLocationValue,
    setValue: setMeshLocationValue,
    metadata,
    getDataResource,
  } = useMeshLocation<'dataResource'>();

  const {
    contentTypeId,
    keyword,
    searchValue,
    limit,
    skip,
    sortFieldId,
    sortOrder,
    advancedFilters,
    locale,
  } = meshLocationValue || {};

  const {
    allowContentTypeIds = [],
    imagePath,
    searchField,
    customQuery,
    enableFilterByLocale,
    enableAdvancedFilters,
  } = (metadata.dataType.custom as TypeEditorConfigs) || {};

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

  const allowContentTypes = allowContentTypeIds.length
    ? contentTypes.filter(({ id }) => allowContentTypeIds.includes(id))
    : contentTypes;

  const handleSetValue = ({
    contentTypeId,
    keyword,
    count,
    skip,
    sortFieldId,
    sortOrder,
    advancedFilters,
    locale,
  }: EntryQueryOutputParams) => {
    const customSearchQuery = mapCustomQuery(customQuery);

    const sameSearchField = customSearchQuery?.find(
      ({ key }) => key === `${searchField?.id}${SEARCH_OPERATOR}`
    );

    const filters =
      contentTypeId === ANY_CONTENT_TYPES
        ? ''
        : advancedFilters.map(({ key, value, operator }) => `${key}${operator}=${value}`).join('&');

    let contentTypeQuery = '';
    // if content type id is not empty and not ANY - add it to the query
    if (contentTypeId && contentTypeId !== ANY_CONTENT_TYPES) {
      contentTypeQuery = `${filters ? '&' : ''}content_type=${contentTypeId}`;
    }

    setMeshLocationValue(() => ({
      newValue: {
        keyword: [keyword, sameSearchField?.value].filter((i) => i).join(','),
        searchValue: keyword,
        order: sortFieldId && `${sortOrder === SORT_TYPE.DESC ? '-' : ''}${sortFieldId}`,
        limit: String(count),
        contentTypeId: contentTypeId === ANY_CONTENT_TYPES ? '' : contentTypeId,
        sortFieldId,
        sortOrder,
        advancedFilters: JSON.stringify(advancedFilters),
        contentTypeQuery,
        filters: filters,
        locale: enableFilterByLocale ? locale : '',
        skip: String(skip),
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

  if (loadingContentTypes) {
    return (
      <div className="loading-container">
        <LoadingOverlay isActive />
      </div>
    );
  }

  return (
    <div className="entry-search-wrapper">
      <EntryQuery
        allowContentTypes={allowContentTypes}
        selectedContentTypeId={contentTypeId}
        keyword={searchValue ?? keyword}
        count={limit}
        skip={skip}
        sortFieldId={sortFieldId}
        sortOrder={sortOrder as SORT_TYPE}
        getDataResource={getDataResource}
        handleSetValue={handleSetValue}
        imagePath={imagePath}
        searchField={searchField}
        customQuery={allowContentTypeIds ? customQuery : ''}
        advancedFilters={advancedFilters && JSON.parse(advancedFilters)}
        locale={locale}
        enableFilterByLocale={enableFilterByLocale}
        enableAdvancedFilters={enableAdvancedFilters}
        allowContentTypeIds={allowContentTypeIds}
      />
    </div>
  );
};

export default QueryDataEditor;
