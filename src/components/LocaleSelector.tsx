import { useMemo } from 'react';
import {
  Callout,
  GetDataResourceMessage,
  InputSelect,
  InputVariables,
  LoadingIndicator,
  useMeshLocation,
} from '@uniformdev/mesh-sdk-react';
import { DEFAULT_LABEL } from '../constants';
import { useGetContentfulLocales } from '../hooks';

export const LocaleSelector = ({
  handleLocaleChange,
  effectiveLocale,
  boundLocale,
}: {
  effectiveLocale: string;
  boundLocale: string;
  handleLocaleChange: (locale: string) => void;
}) => {
  const { metadata, getDataResource } = useMeshLocation<'dataResource'>();

  return (
    <InputVariables
      label="Filter by locale"
      id="locale"
      value={effectiveLocale}
      onChange={(newValue) => handleLocaleChange(newValue ?? '')}
      disableInlineMenu={true}
      inputWhenNoVariables={
        // we are removing "reset" option
        metadata.dynamicInputs.locale ? undefined : (
          <LocalesDropdown
            getDataResource={getDataResource}
            boundLocale={boundLocale}
            handleLocaleChange={handleLocaleChange}
          />
        )
      }
    />
  );
};

const LocalesDropdown = ({
  getDataResource,
  boundLocale,
  handleLocaleChange,
}: {
  getDataResource: <TExpectedResult>(message: GetDataResourceMessage) => Promise<TExpectedResult>;
  boundLocale: string;
  handleLocaleChange: (locale: string) => void;
}) => {
  const { loading, error, value: locales } = useGetContentfulLocales(getDataResource);

  const localeOptions = useMemo(
    () =>
      locales?.map(({ code, name }: { code: string; name: string }) => ({
        label: name,
        value: code,
      })) ?? [],
    [locales]
  );

  return (
    <>
      {loading ? <LoadingIndicator /> : null}
      {error ? <Callout type="error">{error?.message}</Callout> : null}
      {!loading && !error ? (
        <InputSelect
          id="locale"
          options={[DEFAULT_LABEL, ...localeOptions]}
          name="locale"
          label=""
          value={boundLocale}
          onChange={(e) => handleLocaleChange(e.target.value ?? '')}
        />
      ) : null}
    </>
  );
};
