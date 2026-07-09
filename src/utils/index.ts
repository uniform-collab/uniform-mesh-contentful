import qs from 'qs';
import { DynamicInputs } from '@uniformdev/mesh-sdk-react';
import { GET_DYNAMIC_INPUT_REGEX, REPLACE_DYNAMIC_INPUT_REGEX } from '../constants';

export const getSearchText = (text: string) =>
  qs.stringify({ text }, { encode: false }).split('=')[1]?.replaceAll('%20', ' ');

export const get = <T>(
  obj: { [name: string]: any } | undefined = {},
  path: string,
  defaultValue: any = undefined
): T => {
  const travel = (regexp: RegExp) =>
    String.prototype.split
      .call(path, regexp)
      .filter(Boolean)
      .reduce((res, key) => (res !== null && res !== undefined ? res[key] : res), obj);
  const result = travel(/[.[\]]+?/);

  return result === undefined || result === obj ? defaultValue : result;
};

export const capitalise = (string: string) => {
  return `${string.charAt(0).toUpperCase()}${string?.slice(1)}`;
};

export function isValidUrl(url: string) {
  try {
    new URL(url);
    return true;
  } catch (err) {
    return false;
  }
}

export const isEqualArrays = <T>(aArray?: Array<T>, bArray?: Array<T>) =>
  JSON.stringify(aArray) === JSON.stringify(bArray);

export function capitalize(value?: string) {
  if (!value) {
    return;
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export const dynamicInputsReplacer = (ids: string, dynamicInputs: DynamicInputs) => {
  const isDynamicInputs = Boolean(Object.keys(dynamicInputs).find((key) => ids?.includes(`\${${key}}`)));

  return isDynamicInputs
    ? ids.replace(
        GET_DYNAMIC_INPUT_REGEX,
        (param) => dynamicInputs[param.replace(REPLACE_DYNAMIC_INPUT_REGEX, '$1')]?.value || param
      )
    : undefined;
};

export const getAllIncludedField = (includeFields: string[]) => {
  return ['sys', 'metadata', ...includeFields].join(',');
};
