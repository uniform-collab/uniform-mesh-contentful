import { ChangeEvent, FC, KeyboardEvent, useEffect, useMemo, useState } from 'react';
import { Option, SearchConfig, SearchParameter } from '../types/common';
import { Button, Input, InputSelect } from '@uniformdev/mesh-sdk-react';
import { Icon, Switch } from '@uniformdev/design-system';
import { FULL_TEXT_TYPES, NUMBER_TYPES, OBJECT_TYPES, SEARCH_OPERATORS } from '../constants';

interface FilterListItemProps {
  listItem: SearchParameter;
  customFiltersValue: SearchParameter[];
  onListChange: () => void;
  allowedOptions: Option[];
  searchConfig: SearchConfig;
  handleInputFieldUpdate: (newListItem?: SearchParameter) => void;
  removeFromList: (id: string) => void;
}

const FilterListItem: FC<FilterListItemProps> = ({
  listItem,
  customFiltersValue,
  onListChange,
  removeFromList,
  searchConfig,
  allowedOptions,
  handleInputFieldUpdate,
}) => {
  const [localItem, setLocalItem] = useState<SearchParameter>(listItem);

  useEffect(
    () => {
      if (localItem.key !== listItem.key) {
        const newValue = { ...localItem, operator: operatorOptions[0].value, value: '' };
        setLocalItem(newValue);
        return handleInputFieldUpdate(newValue);
      }
      return handleInputFieldUpdate(localItem);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [localItem]
  );

  const { searchOptions = [], searchFields = [] } = searchConfig;

  const currentFieldType = useMemo(
    () => searchFields.find(({ id }) => id === localItem.key || `fields.${id}` === localItem.key)?.type || '',
    [localItem.key, searchFields]
  );

  const searchOperators = useMemo(() => {
    if (NUMBER_TYPES.includes(currentFieldType)) {
      return SEARCH_OPERATORS['Number'];
    }
    if (FULL_TEXT_TYPES.includes(currentFieldType)) {
      return SEARCH_OPERATORS['FullText'];
    }
    if (OBJECT_TYPES.includes(currentFieldType)) {
      return SEARCH_OPERATORS['Object'];
    }
    if (currentFieldType === 'Location') {
      return SEARCH_OPERATORS['Location'];
    }
    if (currentFieldType === 'Date') {
      return SEARCH_OPERATORS['Date'];
    }
    if (currentFieldType === 'Symbol') {
      return SEARCH_OPERATORS['Text'];
    }
    return 'is';
  }, [currentFieldType]);

  const operatorOptions = useMemo(
    () =>
      searchOperators.split(',').map((operator) => {
        const operatorValue = operator === 'is' ? '' : `[${operator}]`;

        return {
          label: operator,
          value: OBJECT_TYPES.includes(currentFieldType) ? `.sys.id${operatorValue}` : operatorValue,
        };
      }),
    [currentFieldType, searchOperators]
  );

  const currentSearchOption = useMemo(
    () => searchOptions.find(({ value }) => value === localItem.key)?.label,
    [localItem.key, searchOptions]
  );

  const currentItem = useMemo(
    () => customFiltersValue.find(({ id }) => id === listItem.id),
    [customFiltersValue, listItem.id]
  );

  const hasNewValues = useMemo(
    () =>
      currentItem?.key !== listItem.key ||
      currentItem?.value !== listItem.value ||
      currentItem?.operator !== listItem.operator,
    [
      currentItem?.key,
      currentItem?.operator,
      currentItem?.value,
      listItem.key,
      listItem.operator,
      listItem.value,
    ]
  );

  const removeItem = () => removeFromList(localItem.id);

  const handleEnterPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onListChange();
    }
  };

  const handleListItemChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { value, name } = e.target;
    const newItemValue = {
      ...localItem,
      [name]: value,
    };
    setLocalItem(newItemValue);
  };

  const handleListItemSwitch = (e: ChangeEvent<HTMLInputElement>) => {
    const { checked } = e.target;
    setLocalItem((prevState) => ({ ...prevState, value: String(checked) }));
  };

  const currentValueType = () => {
    switch (currentFieldType) {
      case 'Date':
        return 'date';
      case 'Number':
        return 'number';
      case 'Integer':
        return 'number';
      default:
        return 'text';
    }
  };

  return (
    <div className="search-params-item">
      <div className="search-params-input">
        <span>Field name</span>
        <InputSelect
          name="key"
          options={[
            {
              label: currentSearchOption || 'Select...',
              value: localItem.key || '',
            },
            ...allowedOptions,
          ]}
          label=""
          value={localItem.key || ''}
          onChange={handleListItemChange}
        />
      </div>
      <div className="search-params-operator">
        <span>Operator</span>
        <InputSelect
          name="operator"
          options={operatorOptions}
          label=""
          value={localItem.operator}
          onChange={handleListItemChange}
          disabled={operatorOptions.length < 2 || !localItem.key}
        />
      </div>
      <div className="search-params-input">
        <span>Field value</span>
        {currentFieldType === 'Boolean' ? (
          <div className="search-params-switch">
            <Switch label="" onChange={handleListItemSwitch} checked={localItem.value === 'true'} />
          </div>
        ) : (
          <Input
            type={currentValueType()}
            name="value"
            label=""
            value={localItem.value || ''}
            onChange={handleListItemChange}
            disabled={!localItem.key}
            onKeyDown={handleEnterPress}
          />
        )}
      </div>
      <div className="search-params-remove-button">
        {hasNewValues && localItem.value ? (
          <Button onClick={onListChange} buttonType="ghost">
            <Icon icon="check-o" iconColor="currentColor" />
          </Button>
        ) : (
          <Button onClick={removeItem} buttonType="ghost">
            <Icon icon="remove" iconColor="red" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default FilterListItem;
