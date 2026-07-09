import {
  ContentDataResourceLocaleInfoResult,
  useContentDataResourceLocaleInfo,
  useMeshLocation,
} from '@uniformdev/mesh-sdk-react';

export const useDataResourceLocaleInfo = ({
  enableFilterByLocale,
  locale,
  setLocale,
}: {
  enableFilterByLocale: boolean | undefined;
  locale: string | undefined;
  setLocale?: (locale: string) => void;
}): ContentDataResourceLocaleInfoResult => {
  const { metadata } = useMeshLocation<'dataResource'>();

  return useContentDataResourceLocaleInfo({
    // platform resolves default locale based on the current selected locale
    // metadata.dynamicInputs.locale would not be available only in testing mode
    defaultLocale: undefined,
    locale,
    // do not pass dynamicInputs if filter by locale is disabled, to avoid initialization into '${locale}' value
    dynamicInputs: enableFilterByLocale ? (metadata.dynamicInputs ?? {}) : {},
    setLocale,
  });
};
