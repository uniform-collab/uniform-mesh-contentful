import { ChangeEvent, FC, useEffect, useState } from 'react';
import { DataTypeLocationValue, InputComboBox, useMeshLocation, Label } from '@uniformdev/mesh-sdk-react';
import { Caption, Switch } from '@uniformdev/design-system';
import { AssetTypeEditorConfigs } from '../../types/mesh';
import { MIME_TYPES_OPTIONS, SEAERCH_TYPES_OPTIONS, UNKNOWN } from '../../constants';
import { SingleValue, MultiValue } from 'react-select';
import { Option } from '../../types/common';

const AssetsTypeEditor: FC = () => {
  const { value: meshLocationValue, setValue: setMeshLocationValue } = useMeshLocation<
    'dataType',
    AssetTypeEditorConfigs
  >();

  const {
    mimeTypes,
    searchType,
    enableFilterByLocale = false,
  } = (meshLocationValue.custom as AssetTypeEditorConfigs) || {};

  const [configs, setConfigs] = useState<AssetTypeEditorConfigs>(() => ({
    mimeTypes,
    searchType,
    enableFilterByLocale,
  }));

  useEffect(() => {
    const runEffect = () => {
      setMeshLocationValue((previousValue) => ({
        newValue: {
          ...previousValue,
          method: 'GET',
          path: `/assets`,
          variables: {
            assetsIds: {
              default: UNKNOWN,
              type: 'text',
              displayName: 'Assets ID',
            },
            locale: {
              default: '',
              type: 'text',
              displayName: 'Locale',
            },
          },
          parameters: [
            {
              key: 'sys.id[in]',
              value: '${assetsIds}',
            },
            { key: 'locale', value: '${locale}', omitIfEmpty: true },
          ],
        },
      }));
    };
    setTimeout(runEffect);
    // we only want to run this effect on initial render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (
      mimeTypes?.length !== configs.mimeTypes?.length ||
      searchType !== configs.searchType ||
      enableFilterByLocale !== configs.enableFilterByLocale
    ) {
      setMeshLocationValue((previousValue) => {
        const newValue: DataTypeLocationValue = {
          ...previousValue,
          custom: {
            mimeTypes: configs.mimeTypes,
            searchType: configs.searchType,
            enableFilterByLocale: configs.enableFilterByLocale,
          },
        };
        return { newValue };
      });
    }
  }, [
    configs.enableFilterByLocale,
    configs.mimeTypes,
    configs.searchType,
    enableFilterByLocale,
    mimeTypes,
    searchType,
    setMeshLocationValue,
  ]);

  const handelMimeTypeChange = (newValue: MultiValue<Option>) => {
    setConfigs((prevState) => ({ ...prevState, mimeTypes: newValue.map(({ value }) => value) }));
  };
  const handelSearchTypeChange = (newValue: SingleValue<Option>) => {
    setConfigs((prevState) => ({ ...prevState, searchType: newValue?.value }));
  };

  const handleSwitchFilterByLocale = (e: ChangeEvent<HTMLInputElement>) => {
    const { checked } = e.target;

    setConfigs((prevState) => ({
      ...prevState,
      enableFilterByLocale: checked,
    }));
  };

  const mimeTypeValue = MIME_TYPES_OPTIONS.filter(({ value }) => mimeTypes?.includes(value));
  const searchTypeValue = SEAERCH_TYPES_OPTIONS.find(({ value }) => value === searchType);

  return (
    <div className="contentful-container">
      <div data-testid="asset-types">
        <Label>MIME Types Groups</Label>
        <InputComboBox
          isMulti
          options={MIME_TYPES_OPTIONS}
          value={mimeTypeValue}
          onChange={handelMimeTypeChange}
        />
        <Caption>
          <span>Select MIME Types to search for Assets.</span>
        </Caption>
      </div>
      <div data-testid="search-field">
        <Label>Search Field</Label>
        <InputComboBox
          options={SEAERCH_TYPES_OPTIONS}
          value={searchTypeValue || SEAERCH_TYPES_OPTIONS[0]}
          onChange={handelSearchTypeChange}
        />
        <Caption>
          <span>{`Select the field to search by keyword (default 'Title').`}</span>
        </Caption>
      </div>
      <Switch
        label="Allow filtering by locale"
        onChange={handleSwitchFilterByLocale}
        checked={configs.enableFilterByLocale}
        data-testid="filter-by-locale"
      />
    </div>
  );
};

export default AssetsTypeEditor;
