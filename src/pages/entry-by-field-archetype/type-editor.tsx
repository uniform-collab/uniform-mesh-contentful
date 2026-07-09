import { ChangeEvent, FC, useCallback, useEffect, useMemo, useState } from 'react';
import { useAsync } from 'react-use';
import {
  Callout,
  LoadingOverlay,
  useMeshLocation,
  InputSelect,
  DataTypeLocationValue,
} from '@uniformdev/mesh-sdk-react';
import { Details, Switch } from '@uniformdev/design-system';
import { TypeEditorConfigs } from '../../types/mesh';
import { ContentTypesResponse } from '../../types/contentfulTypes';
import { mapContentType } from '../../utils/mapper';
import { ImageFieldDropdown, Include } from '../../components';
import { ContentType } from '../../types/common';
import { CONTENT_TYPES_FETCH_LIMIT, DEFAULT_INCLUDE, SEARCH_FIELDS_TYPES } from '../../constants';
import { ContentTypeFieldsSelector } from '../../components/ContentTypeFieldsSelector';
import { getAllIncludedField } from '../../utils';

const EntryTypeEditor: FC = () => {
  const {
    value: meshLocationValue,
    setValue: setMeshLocationValue,
    getDataResource,
  } = useMeshLocation<'dataType', TypeEditorConfigs>();

  const {
    contentTypeId = '',
    imagePath,
    include,
    slugField,
    enableFilterByLocale = false,
    includeFields = [],
  } = (meshLocationValue.custom as TypeEditorConfigs) || {};

  const [configs, setConfigs] = useState<TypeEditorConfigs>(() => ({
    slugField,
    imagePath,
    contentTypeId,
    include,
    enableFilterByLocale,
    includeFields,
  }));

  const {
    value: contentTypes = [],
    error: errorContentTypes,
    loading: loadingContentTypes,
  } = useAsync(
    (): Promise<ContentType[]> =>
      getDataResource<ContentTypesResponse>({
        method: 'GET',
        path: '/content_types',
        parameters: [{ key: 'limit', value: CONTENT_TYPES_FETCH_LIMIT }],
      }).then((response) => mapContentType(response)),
    []
  );

  const selectedContentType = useMemo(
    () => contentTypes.find(({ id }) => configs.contentTypeId === id) || contentTypes[0],
    [configs.contentTypeId, contentTypes]
  );

  const allowContentTypesOptions = useMemo(
    () => contentTypes.map(({ name: label, id: value }) => ({ label, value })),
    [contentTypes]
  );

  const slugFieldOptions = useMemo(
    () =>
      selectedContentType?.fields
        ?.filter(({ type }) => SEARCH_FIELDS_TYPES.includes(type))
        .map(({ id, name }) => ({
          label: `${name}`,
          name: id,
          value: `fields.${id}`,
        })),
    [selectedContentType?.fields]
  );

  const initialValue: DataTypeLocationValue = useMemo(
    () => ({
      method: 'GET',
      path: `/entries`,
      variables: {
        slug: {
          default: '',
          type: 'text',
          displayName: 'Slug',
        },
        slugField: {
          default: `${configs.slugField || slugFieldOptions?.[0]?.value}[in]`,
          type: 'text',
          displayName: 'Slug Field',
        },
        contentType: {
          default: selectedContentType?.id,
          type: 'text',
          displayName: 'Content Type',
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
          key: '${slugField}',
          value: '${slug}',
        },
        {
          key: 'content_type',
          value: '${contentType}',
        },
        {
          key: 'locale',
          value: '${locale}',
          omitIfEmpty: true,
        },
      ],
      custom: {
        contentTypeId: configs.contentTypeId || contentTypes[0]?.id,
        imagePath: configs.imagePath,
        slugField: configs.slugField || slugFieldOptions?.[0]?.value,
        include: configs.include,
        displayField: selectedContentType?.displayField,
        enableFilterByLocale: configs.enableFilterByLocale,
        includeFields: configs.includeFields,
      },
    }),
    [
      configs.contentTypeId,
      configs.enableFilterByLocale,
      configs.imagePath,
      configs.include,
      configs.slugField,
      configs.includeFields,
      contentTypes,
      selectedContentType?.displayField,
      selectedContentType?.id,
      slugFieldOptions,
    ]
  );

  useEffect(() => {
    if (!meshLocationValue.custom && !loadingContentTypes) {
      setMeshLocationValue(() => ({
        newValue: initialValue,
      }));
    }
    // we only want to run this effect on initial render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValue, meshLocationValue.custom, loadingContentTypes]);

  const updateParameters = useCallback(
    ({ value, includeFields }: { includeFields: string[]; value: DataTypeLocationValue }) => {
      if (includeFields.length > 0) {
        return {
          ...value,
          parameters: [
            ...(value.parameters ?? []),
            ...[
              {
                key: 'select',
                value: getAllIncludedField(includeFields),
              },
            ],
          ],
        };
      } else {
        return value;
      }
    },
    []
  );

  useEffect(() => {
    if (
      selectedContentType &&
      (contentTypeId !== configs.contentTypeId ||
        imagePath !== configs.imagePath ||
        slugField !== configs.slugField ||
        include !== configs.include ||
        enableFilterByLocale !== configs.enableFilterByLocale ||
        includeFields !== configs.includeFields)
    ) {
      setMeshLocationValue(() => ({
        newValue: updateParameters({ value: initialValue, includeFields: configs.includeFields ?? [] }),
      }));
    }
  }, [
    selectedContentType,
    configs.contentTypeId,
    configs.enableFilterByLocale,
    configs.imagePath,
    configs.include,
    configs.slugField,
    configs.includeFields,
    includeFields,
    contentTypeId,
    enableFilterByLocale,
    imagePath,
    include,
    initialValue,
    setMeshLocationValue,
    slugField,
    updateParameters,
  ]);

  const handleSetConfig = (newConfig: TypeEditorConfigs) => {
    setConfigs((prevState) => ({ ...prevState, ...newConfig }));
  };

  const handleSetSlugField = (e: ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    handleSetConfig({ [name]: value });
  };

  const handleSwitchFilterByLocale = (e: ChangeEvent<HTMLInputElement>) => {
    const { checked } = e.target;

    setConfigs((prevState) => ({
      ...prevState,
      enableFilterByLocale: checked,
    }));
  };

  const handleContentTypeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.target;
    const selectedContentType = contentTypes.find(({ id }) => id === value);
    const findSlugField =
      selectedContentType?.fields.find(({ id }) => `fields.${id}` === slugField)?.id ||
      selectedContentType?.fields[0]?.id;

    setConfigs((prevState) => ({ ...prevState, contentTypeId: value, slugField: `fields.${findSlugField}` }));
  };

  if (errorContentTypes) {
    return <Callout type="error">{errorContentTypes.message}</Callout>;
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
      <InputSelect
        id="contentTypeId"
        options={allowContentTypesOptions}
        name="contentTypeId"
        label="Filter by content type"
        value={configs.contentTypeId}
        onChange={handleContentTypeChange}
      />
      <InputSelect
        options={slugFieldOptions || []}
        name="slugField"
        label="Field to search"
        value={configs.slugField}
        onChange={handleSetSlugField}
      />
      <Include includeValue={configs.include || DEFAULT_INCLUDE} setInclude={handleSetConfig} />
      <Details summary="more optional settings">
        <div className="contentful-container">
          <ContentTypeFieldsSelector
            includeFields={configs.includeFields ?? []}
            selectedContentTypes={[selectedContentType]}
            setConfigs={handleSetConfig}
          />
          <Switch
            label="Allow filtering by locale"
            onChange={handleSwitchFilterByLocale}
            checked={configs.enableFilterByLocale}
          />
          <ImageFieldDropdown
            imagePath={imagePath}
            setConfigs={setConfigs}
            allowContentTypes={selectedContentType ? [selectedContentType] : []}
            contentTypesLoaded={Boolean(contentTypes.length)}
          />
        </div>
      </Details>
    </div>
  );
};

export default EntryTypeEditor;
