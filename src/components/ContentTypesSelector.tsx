import { FC, useEffect } from 'react';
import { MultiValue } from 'react-select';
import { InputComboBox, Label } from '@uniformdev/mesh-sdk-react';
import { ContentType, Option } from '../types/common';

interface ContentTypesSelectorProps {
  allowContentTypeIds: string[];
  setConfigs: (newConfig: { allowContentTypeIds: string[] }) => void;
  contentTypes: ContentType[];
}

export const ContentTypesSelector: FC<ContentTypesSelectorProps> = ({
  allowContentTypeIds,
  contentTypes,
  setConfigs,
}) => {
  const handelAllowContentTypesChanged = (newValue: MultiValue<Option>) => {
    const currentContentTypeIds = newValue.map(({ value }) => value);

    setConfigs({ allowContentTypeIds: currentContentTypeIds });
  };

  const contentTypesOptions = contentTypes.map(({ name: label, id: value }) => ({ label, value }));
  const selectedAllowContentTypeValue = contentTypesOptions.filter(({ value }) =>
    allowContentTypeIds.includes(value)
  );

  useEffect(
    () => {
      if (selectedAllowContentTypeValue.length !== allowContentTypeIds.length) {
        handelAllowContentTypesChanged(selectedAllowContentTypeValue);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedAllowContentTypeValue.length, allowContentTypeIds.length]
  );

  return (
    <div data-testid="allowed-content-types">
      <Label>Allowed Content Types (optional)</Label>
      <InputComboBox
        options={contentTypesOptions}
        name="contentTypes"
        value={selectedAllowContentTypeValue}
        isMulti
        onChange={handelAllowContentTypesChanged}
      />
    </div>
  );
};
