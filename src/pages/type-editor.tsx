import { ChangeEvent, FC, useCallback, useEffect, useMemo, useState } from 'react';
import { useAsync } from 'react-use';
import {
  Callout,
  DataTypeLocationValue,
  GetDataResourceMessage,
  Input,
  LoadingOverlay,
  useMeshLocation,
  ValidationResult,
} from '@uniformdev/mesh-sdk-react';
import { Details, Switch } from '@uniformdev/design-system';
import { TypeEditorConfigs } from '../types/mesh';
import {
  ARCHETYPES,
  CONTENT_TYPES_FETCH_LIMIT,
  CUSTOM_QUERY_FORMAT,
  DEFAULT_COUNT_FOR_QUERY,
  DEFAULT_INCLUDE,
  ERROR_MESSAGE,
  FALSE_VALIDATION_CREDENTIALS_MESSAGE,
  INVALID_SEARCH_FORMAT,
  SEARCH_OPERATOR,
} from '../constants';
import { mapContentType, mapCustomQuery, mapValidationError } from '../utils/mapper';
import { ContentTypesResponse, EntriesResponse } from '../types/contentfulTypes';
import { ContentTypesSelector, ImageFieldDropdown, FilterFieldDropdown, Include } from '../components';
import { searchQuery } from '../utils/common';
import { ContentTypeFieldsSelector } from '../components/ContentTypeFieldsSelector';
import { ContentType } from '../types/common';
import { getAllIncludedField } from '../utils';

const EntryTypeEditor: FC = () => {
  const {
    value: meshLocationValue,
    setValue: setMeshLocationValue,
    getDataResource,
    metadata,
  } = useMeshLocation<'dataType', TypeEditorConfigs>();

  const { archetype } = metadata || {};
  const isSingle = archetype === ARCHETYPES.SINGLE;
  const isMulti = archetype === ARCHETYPES.MULTIPLE;
  const isQuery = archetype === ARCHETYPES.QUERY;

  const {
    allowContentTypeIds = [],
    imagePath,
    include = DEFAULT_INCLUDE,
    searchField,
    customQuery,
    enableFilterByLocale = false,
    enableAdvancedFilters = false,
    includeFields = [],
  } = (meshLocationValue.custom as TypeEditorConfigs) || {};

  const [configs, setConfigs] = useState<TypeEditorConfigs>(() => ({
    allowContentTypeIds,
    imagePath,
    include,
    searchField,
    customQuery,
    enableFilterByLocale,
    enableAdvancedFilters,
    includeFields,
  }));

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

  async function customQueryValidate({
    getDataResource,
    customQuery,
    contentTypes,
    includeFields,
  }: {
    getDataResource: <TExpectedResult>(message: GetDataResourceMessage) => Promise<TExpectedResult>;
    customQuery: string;
    contentTypes: string[];
    includeFields: string[];
  }): Promise<ValidationResult> {
    const currentCustomQuery = mapCustomQuery(customQuery);
    if (currentCustomQuery) {
      try {
        await Promise.all(
          contentTypes.map((id) =>
            getDataResource<EntriesResponse>({
              method: 'GET',
              path: `/entries`,
              headers: [{ key: 'content-type', value: 'application/json' }],
              parameters: [
                ...currentCustomQuery,
                {
                  key: 'limit',
                  value: '1',
                },
                {
                  key: 'content_type',
                  value: id,
                },
                {
                  key: 'select',
                  value: getAllIncludedField(includeFields),
                },
              ],
            })
          )
        );
        return { isValid: true };
      } catch (e) {
        return {
          isValid: false,
          validationMessage: `${FALSE_VALIDATION_CREDENTIALS_MESSAGE} ${mapValidationError(e)}`,
        };
      }
    }
    return {
      isValid: false,
      validationMessage: `${FALSE_VALIDATION_CREDENTIALS_MESSAGE} ${INVALID_SEARCH_FORMAT}`,
    };
  }

  const selectedContentTypes = allowContentTypeIds.length
    ? contentTypes.filter(({ id }) => allowContentTypeIds.includes(id))
    : contentTypes;

  const custom = useMemo(
    () => ({
      custom: {
        allowContentTypeIds: configs.allowContentTypeIds,
        imagePath: configs.imagePath,
        include: configs.include,
        searchField: configs.searchField,
        customQuery: configs.customQuery,
        enableFilterByLocale: configs.enableFilterByLocale,
        enableAdvancedFilters: configs.enableAdvancedFilters,
        includeFields: configs.includeFields,
      },
    }),
    [
      configs.allowContentTypeIds,
      configs.customQuery,
      configs.enableAdvancedFilters,
      configs.enableFilterByLocale,
      configs.imagePath,
      configs.include,
      configs.searchField,
      configs.includeFields,
    ]
  );

  const queryInitialValue: DataTypeLocationValue = useMemo(
    () => ({
      method: 'GET',
      path: '/entries?${filters}${contentTypeQuery}',
      variables: {
        contentTypeQuery: {
          default: '',
          type: 'text',
          displayName: 'Content Type',
        },
        keyword: {
          default: '',
          type: 'text',
          displayName: 'Search Text',
        },
        limit: {
          default: String(DEFAULT_COUNT_FOR_QUERY),
          type: 'text',
          displayName: 'Limit',
        },
        order: {
          default: '',
          type: 'text',
          displayName: 'Order',
        },
        filters: {
          default: '',
          type: 'text',
          displayName: 'Filters',
        },
        locale: {
          default: '',
          type: 'text',
          displayName: 'Locale',
        },
        skip: {
          default: '',
          type: 'number',
          displayName: 'Skip',
        },
      },
      parameters: [
        {
          key: 'include',
          value: String(configs.include || DEFAULT_INCLUDE),
        },
        {
          key: 'locale',
          value: '${locale}',
          omitIfEmpty: true,
        },
        { key: 'order', value: '${order}' },
        {
          key: `${searchQuery(configs.searchField, '${keyword}')?.[0]?.key || 'query'}`,
          value: '${keyword}',
        },
        {
          key: 'limit',
          value: '${limit}',
        },
        {
          key: 'skip',
          value: '${skip}',
          omitIfEmpty: true,
        },
        ...(mapCustomQuery(configs.customQuery)?.filter(
          ({ key }) => key !== `${configs.searchField?.id}${SEARCH_OPERATOR}`
        ) || []),
      ],
    }),
    [configs.include, configs.searchField, configs.customQuery]
  );

  const productsInitialValue: DataTypeLocationValue = useMemo(
    () => ({
      method: 'GET',
      path: '/entries',
      variables: {
        entryIds: {
          default: '',
          type: 'text',
          displayName: 'Entry Ids',
        },
        locale: {
          default: '',
          type: 'text',
          displayName: 'Locale',
        },
      },
      parameters: [
        {
          key: 'include',
          value: String(configs.include || DEFAULT_INCLUDE),
        },
        {
          key: 'locale',
          value: '${locale}',
          omitIfEmpty: true,
        },
        {
          key: 'sys.id[in]',
          value: '${entryIds}',
        },
      ],
    }),
    [configs.include]
  );

  const initialValue = useMemo(
    () => (isQuery ? { ...queryInitialValue, ...custom } : { ...productsInitialValue, ...custom }),
    [custom, isQuery, productsInitialValue, queryInitialValue]
  );

  useEffect(() => {
    if (!meshLocationValue.custom || !allowContentTypeIds?.length) {
      const runEffect = () => {
        setMeshLocationValue(() => ({
          newValue: initialValue,
        }));
      };
      setTimeout(runEffect);
    }
    // we only want to run this effect on initial render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meshLocationValue.custom, initialValue, queryInitialValue]);

  const updateParameters = useCallback(
    ({
      isQuery,
      value,
      includeFields,
      selectedContentTypes,
    }: {
      isQuery: boolean;
      value: DataTypeLocationValue;
      includeFields: string[];
      selectedContentTypes: ContentType[];
    }) => {
      if (includeFields && includeFields.length > 0 && selectedContentTypes.length == 1) {
        const params = [
          {
            key: 'select',
            value: getAllIncludedField(includeFields),
          },
        ];
        if (!isQuery) {
          params.push({
            key: 'content_type',
            value: selectedContentTypes[0].id,
          });
        }

        return {
          ...value,
          parameters: [...(value.parameters ?? []), ...params],
        };
      } else {
        return value;
      }
    },
    []
  );

  useEffect(() => {
    if (
      allowContentTypeIds.length !== configs.allowContentTypeIds?.length ||
      searchField !== configs.searchField ||
      imagePath !== configs.imagePath ||
      include !== configs.include ||
      customQuery !== configs.customQuery ||
      enableFilterByLocale !== configs.enableFilterByLocale ||
      enableAdvancedFilters !== configs.enableAdvancedFilters ||
      includeFields !== configs.includeFields
    ) {
      const runEffect = async () => {
        const options = await customQueryValidate({
          getDataResource,
          customQuery: configs.customQuery ?? '',
          contentTypes: configs.allowContentTypeIds ?? [],
          includeFields: configs.includeFields ?? [],
        });
        setMeshLocationValue(() => ({
          newValue: updateParameters({
            isQuery,
            value: initialValue,
            includeFields: configs.includeFields ?? [],
            selectedContentTypes,
          }),
          options,
        }));
      };
      runEffect();
    }
  }, [
    allowContentTypeIds,
    archetype,
    configs.allowContentTypeIds,
    configs.customQuery,
    configs.enableFilterByLocale,
    configs.enableAdvancedFilters,
    configs.imagePath,
    configs.include,
    configs.searchField,
    contentTypes,
    customQuery,
    enableFilterByLocale,
    enableAdvancedFilters,
    getDataResource,
    imagePath,
    include,
    initialValue,
    isMulti,
    isQuery,
    isSingle,
    searchField,
    selectedContentTypes,
    setMeshLocationValue,
    queryInitialValue,
    custom,
    includeFields,
    configs.includeFields,
    updateParameters,
  ]);

  const handleSetConfig = (newConfig: TypeEditorConfigs) => {
    setConfigs((prevState) => ({ ...prevState, ...newConfig }));
  };

  const handleSwitchConfig = (e: ChangeEvent<HTMLInputElement>) => {
    const { checked, name } = e.target;

    setConfigs((prevState) => ({
      ...prevState,
      [name]: checked,
    }));
  };

  const handleSetCustomQuery = (e: ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;

    setConfigs((prevState) => ({
      ...prevState,
      customQuery: value,
    }));
  };

  if (errorContentTypes) {
    return (
      <Callout type="error">
        <span>{ERROR_MESSAGE}</span>
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
    <div className="contentful-container">
      <ContentTypesSelector
        contentTypes={contentTypes}
        allowContentTypeIds={allowContentTypeIds}
        setConfigs={handleSetConfig}
      />
      <ImageFieldDropdown
        imagePath={imagePath}
        setConfigs={setConfigs}
        allowContentTypes={selectedContentTypes}
        contentTypesLoaded={Boolean(contentTypes.length)}
      />
      <Include includeValue={configs.include || DEFAULT_INCLUDE} setInclude={handleSetConfig} />
      <Switch
        label="Allow filtering by locale"
        name="enableFilterByLocale"
        onChange={handleSwitchConfig}
        checked={configs.enableFilterByLocale}
      />
      <Details summary="more optional settings">
        <div className="contentful-container">
          <ContentTypeFieldsSelector
            includeFields={configs.includeFields ?? []}
            selectedContentTypes={selectedContentTypes}
            setConfigs={handleSetConfig}
          />
          <FilterFieldDropdown
            allowContentTypes={selectedContentTypes}
            setConfigs={handleSetConfig}
            searchField={searchField}
          />
          <Input
            name="customQuery"
            label="Custom Search Parameters"
            disabled={!configs.allowContentTypeIds?.length}
            onChange={handleSetCustomQuery}
            value={configs.customQuery || ''}
            placeholder={CUSTOM_QUERY_FORMAT}
            caption={
              <span>
                <code>{CUSTOM_QUERY_FORMAT}</code>. See{' '}
                <a
                  target="_blank"
                  href="https://www.contentful.com/developers/docs/references/content-delivery-api/#/reference/search-parameters"
                  rel="noreferrer"
                >
                  docs
                </a>
                .
              </span>
            }
          />
          {isQuery && (
            <div>
              <Switch
                label="Show advanced filters"
                infoText="allows filtering by any field (experimental)"
                name="enableAdvancedFilters"
                onChange={handleSwitchConfig}
                checked={configs.enableAdvancedFilters}
              />
            </div>
          )}
        </div>
      </Details>
    </div>
  );
};

export default EntryTypeEditor;
