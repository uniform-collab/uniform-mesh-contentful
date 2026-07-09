import React, { FC, useEffect, useMemo } from 'react';
import { SingleValue } from 'react-select';
import { InputComboBox, Label } from '@uniformdev/mesh-sdk-react';
import { Caption } from '@uniformdev/design-system';
import { DEFAULT_LABEL, SEARCH_FIELDS_TYPES } from '../constants';
import { ContentType, SearchOption, SearchValue } from '../types/common';
import { TypeEditorConfigs } from '../types/mesh';

const SELECT_SYSTEM_FIELDS = [
  { label: 'Id', value: 'sys.id', searchFieldValue: { type: 'Symbol', id: 'sys.id' } },
  {
    label: 'Revision',
    value: 'sys.revision',
    searchFieldValue: { type: 'Number', id: 'sys.revision' },
  },
];

interface FilterDropdownProps {
  allowContentTypes: ContentType[];
  setConfigs: (newConfig: TypeEditorConfigs) => void;
  searchField?: SearchValue;
}

export const FilterFieldDropdown: FC<FilterDropdownProps> = ({
  allowContentTypes,
  setConfigs,
  searchField,
}) => {
  const inputOptions = useMemo(() => {
    const uniqueFields = allowContentTypes.reduce((options: SearchOption[], { fields }, currentIndex) => {
      const mappedFields = fields
        .filter(
          ({ type, linkType }) => SEARCH_FIELDS_TYPES.includes(type) && (!linkType || linkType === 'Symbol')
        )
        .map(({ type, id, name }) => ({
          label: `${name}`,
          value: id,
          searchFieldValue: { type, id: `fields.${id}` },
        }));

      return mappedFields
        .filter(
          ({ value }) => !currentIndex || options.some(({ value: optionValue }) => value === optionValue)
        )
        .sort(({ label }, { label: bLabel }) => (label.toLowerCase() > bLabel.toLowerCase() ? 1 : -1));
    }, []);
    return [...uniqueFields, ...SELECT_SYSTEM_FIELDS];
  }, [allowContentTypes]);

  const inputValue = useMemo(
    () => inputOptions.find(({ searchFieldValue }) => searchFieldValue?.id === searchField?.id),
    [searchField, inputOptions]
  );

  useEffect(
    () => {
      if (inputValue?.searchFieldValue?.id !== searchField?.id) {
        setConfigs({ searchField: inputValue?.searchFieldValue as SearchValue });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inputValue?.searchFieldValue?.id, searchField?.id]
  );

  const handelInputChange = (newValue: SingleValue<SearchOption>) => {
    setConfigs({ searchField: newValue?.searchFieldValue });
  };

  return (
    <div>
      <Label>Search by field</Label>
      <InputComboBox
        options={[DEFAULT_LABEL, ...inputOptions]}
        name="searchFields"
        value={inputValue || DEFAULT_LABEL}
        onChange={handelInputChange}
      />
      <Caption>Select a field that can be used when searching for entries.</Caption>
    </div>
  );
};
