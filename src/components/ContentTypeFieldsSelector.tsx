import { FC, useEffect, useMemo } from 'react';
import { MultiValue } from 'react-select';
import { InputComboBox, Label } from '@uniformdev/mesh-sdk-react';
import { ContentType, Option } from '../types/common';

interface ContentTypeFieldsSelectorProps {
  includeFields: string[];
  selectedContentTypes: ContentType[];
  setConfigs: (newConfig: { includeFields: string[] }) => void;
}

export const ContentTypeFieldsSelector: FC<ContentTypeFieldsSelectorProps> = ({
  includeFields,
  selectedContentTypes,
  setConfigs,
}) => {
  const handleIncludeField = (newValue: MultiValue<Option>) => {
    const fieldIds = newValue.map(({ value }) => value);
    setConfigs({ includeFields: fieldIds });
  };

  useEffect(() => {
    if (selectedContentTypes.length !== 1 && includeFields.length > 0) {
      handleIncludeField([]);
    }
    // we only want to run this effect on initial render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedContentTypes.length, includeFields.length]);

  const options = useMemo(() => {
    if (selectedContentTypes.length == 1) {
      return selectedContentTypes[0].fields.map((field) => {
        return {
          label: field.name,
          value: `fields.${field.id}`,
        } as Option;
      });
    }

    return [];
  }, [selectedContentTypes]);

  const selectedOptions = useMemo(() => {
    if (selectedContentTypes.length == 1) {
      return options.filter((field) => includeFields.includes(field.value));
    }

    return [];
  }, [selectedContentTypes, includeFields, options]);

  return (
    <div>
      <Label>Pick fields to select (optional)</Label>
      <InputComboBox
        options={options}
        name="Index"
        value={selectedOptions}
        onChange={handleIncludeField}
        isMulti
        isDisabled={selectedContentTypes.length != 1}
      />
    </div>
  );
};
