import { FC, useEffect, useMemo, useState } from 'react';
import { AddListButton, Details } from '@uniformdev/design-system';
import { ContentType, Option, SearchParameter } from '../types/common';
import { alphabeticallySort } from '../utils/common';
import { SYSTEM_FILTER_FIELDS_OPTION } from '../constants';
import FilterListItem from './FilterListItem';

interface AdvancedFilteringProps {
  customFiltersValue: SearchParameter[];
  setSearchParamsValue: (newList: SearchParameter[]) => void;
  contentType: ContentType;
}

const AdvancedFiltering: FC<AdvancedFilteringProps> = ({
  customFiltersValue = [],
  setSearchParamsValue,
  contentType,
}) => {
  const searchConfig = useMemo(() => {
    const searchFields = [...contentType.fields, ...SYSTEM_FILTER_FIELDS_OPTION];
    const searchOptions = alphabeticallySort([
      ...contentType.fields.map(({ id, name }) => ({
        label: name,
        value: `fields.${id}`,
      })),
      ...SYSTEM_FILTER_FIELDS_OPTION.map(({ id, name }) => ({
        label: name,
        value: id,
      })),
    ]);
    return { searchFields, searchOptions };
  }, [contentType]);

  const { searchOptions = [] } = searchConfig || {};

  const currentFiltersValue = useMemo(
    () => customFiltersValue.filter(({ key }) => searchOptions.find(({ value }) => value === key)),
    [customFiltersValue, searchOptions]
  );

  const [list, setList] = useState<Array<SearchParameter>>(currentFiltersValue);

  const [allowedOptions, setAllowedOptions] = useState<Option[]>(searchOptions);

  useEffect(() => {
    const addedSearchValues = list.map((item) => item.key);
    const allowedSearchOptions = searchOptions.filter((item) => !addedSearchValues.includes(item.value));
    setAllowedOptions(allowedSearchOptions);
  }, [list, contentType, searchOptions]);

  useEffect(
    () => {
      if (currentFiltersValue.length !== list.length) {
        setList(currentFiltersValue);
        setSearchParamsValue(currentFiltersValue);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contentType]
  );

  const onListChange = () => {
    setSearchParamsValue(list);
  };

  const addToList = () => {
    setList((prev) => [
      ...prev,
      {
        key: '',
        operator: '',
        value: '',
        id: `param-${Math.random()}`,
      },
    ]);
  };

  const removeFromList = (id: string) => {
    const newList = list.filter((item) => item.id !== id);
    setList(newList);
    setSearchParamsValue(newList);
  };

  const handleInputFieldUpdate = (newListItem?: SearchParameter) => {
    const newValues = list.map((item) => {
      if (newListItem?.id === item.id) {
        return {
          ...item,
          ...newListItem,
        };
      }
      return item;
    });
    setList(newValues);
  };

  return (
    <Details summary="Advanced filters">
      {list.length
        ? list.map((parameter) => (
            <FilterListItem
              key={parameter.id}
              listItem={parameter}
              customFiltersValue={customFiltersValue}
              onListChange={onListChange}
              searchConfig={searchConfig}
              allowedOptions={allowedOptions}
              handleInputFieldUpdate={handleInputFieldUpdate}
              removeFromList={removeFromList}
            />
          ))
        : null}
      {Boolean(allowedOptions.length) && (
        <div className="search-params-button">
          <AddListButton onButtonClick={addToList} buttonText="Add  filter" />
        </div>
      )}
    </Details>
  );
};

export default AdvancedFiltering;
