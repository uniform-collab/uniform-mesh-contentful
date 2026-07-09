import React, { Dispatch, FC, SetStateAction, useEffect, useMemo } from 'react';
import { SingleValue } from 'react-select';
import { InputComboBox, Label } from '@uniformdev/mesh-sdk-react';
import { DEFAULT_LABEL, FIELD_TYPES, IMAGES_FIELDS_TYPES } from '../constants';
import { ContentType, Option } from '../types/common';
import { TypeEditorConfigs } from '../types/mesh';
import { Caption } from '@uniformdev/design-system';

interface ImageFieldDropdownProps {
  allowContentTypes: ContentType[];
  setConfigs: Dispatch<SetStateAction<TypeEditorConfigs>>;
  imagePath: string | undefined;
  contentTypesLoaded: boolean;
}

export const ImageFieldDropdown: FC<ImageFieldDropdownProps> = ({
  allowContentTypes,
  setConfigs,
  imagePath,
  contentTypesLoaded,
}) => {
  const imagePathOptions = useMemo(
    () =>
      allowContentTypes.reduce((options: Option[], { fields }) => {
        const mappedPossibleImageFields = fields
          .map(({ id, name, type, linkType }) => {
            const linkFieldType =
              Boolean(linkType) && (linkType === 'Asset' ? FIELD_TYPES.Media : FIELD_TYPES.Reference);

            const fieldType = linkFieldType || FIELD_TYPES[type] || type;

            return {
              label: `${name} (${fieldType})`,
              value: id,
              fieldType,
            };
          })
          .filter(({ fieldType }) => IMAGES_FIELDS_TYPES.includes(fieldType));

        const uniqueImageFields = mappedPossibleImageFields.filter(({ value }) =>
          options.every(({ value: optionValue }) => value !== optionValue)
        );

        return options
          .concat(uniqueImageFields)
          .sort(({ label }, { label: bLabel }) => (label.toLowerCase() > bLabel.toLowerCase() ? 1 : -1));
      }, []),
    [allowContentTypes]
  );

  const imagePathValue = useMemo(
    () => imagePathOptions.find(({ value }) => value === imagePath),
    [imagePath, imagePathOptions]
  );

  useEffect(() => {
    if (contentTypesLoaded && imagePathValue?.value !== imagePath) {
      setConfigs((prevState) => ({ ...prevState, imagePath: imagePathValue?.value }));
    }
  }, [contentTypesLoaded, imagePath, imagePathValue, setConfigs]);

  const handelImagePathChange = (newValue: SingleValue<Option>) => {
    setConfigs((prevState) => ({ ...prevState, imagePath: newValue?.value }));
  };

  return (
    <div data-testid="image-field">
      <Label>Image thumbnail field name (optional)</Label>
      <InputComboBox
        options={[DEFAULT_LABEL, ...imagePathOptions]}
        name="imagePath"
        value={imagePathValue || DEFAULT_LABEL}
        onChange={handelImagePathChange}
      />
      <Caption>
        <span>Used to display image thumbnail for each entry from Contentful.</span>
      </Caption>
    </div>
  );
};
