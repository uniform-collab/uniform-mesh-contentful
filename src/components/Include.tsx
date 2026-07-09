import { ChangeEvent, FC } from 'react';
import { InputSelect } from '@uniformdev/mesh-sdk-react';
import { TypeEditorConfigs } from '../types/mesh';
import { DEFAULT_INCLUDE } from '../constants';

interface IncludeProps {
  includeValue?: number;
  setInclude: (newValue: TypeEditorConfigs) => void;
}

export const Include: FC<IncludeProps> = ({ includeValue, setInclude }) => {
  const inputSizeOptions = [...Array(10).keys()].map((val) => {
    const opt = val + 1;
    return {
      label: String(opt),
      value: opt,
    };
  });

  return (
    <>
      <InputSelect
        label="Number of levels to include in response"
        value={includeValue ?? DEFAULT_INCLUDE}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => {
          setInclude({ ['include']: Number(e.currentTarget.value) });
        }}
        options={inputSizeOptions}
      />
    </>
  );
};
