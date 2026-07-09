import { Option, SearchValue } from '../types/common';
import { NUMBER_TYPES, SEARCH_OPERATOR } from '../constants';

export const searchQuery = (searchField?: SearchValue, searchText?: string) => {
  if (searchField && searchText) {
    const isNumberField = NUMBER_TYPES.includes(searchField.type);
    const isArrayField = searchField.type === 'Array';
    const searchFieldKey = `${searchField.id}${SEARCH_OPERATOR}`;

    if (isNumberField) {
      const allowSearchText = Math.abs(Number(searchText));

      return !isNaN(allowSearchText) ? [{ key: searchField.id, value: String(allowSearchText) }] : [];
    }

    if (isArrayField) {
      return [{ key: `${searchField.id}[all]`, value: searchText }];
    }

    return [{ key: searchFieldKey, value: searchText }];
  }

  if (searchText) {
    return [{ key: 'query', value: searchText }];
  }

  return [];
};

export const alphabeticallySort = (options: Option[]) =>
  options.sort((a, b) => a.label.localeCompare(b.label));
