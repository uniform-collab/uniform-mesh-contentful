import React, { createContext, useContext } from 'react';
import { LocaleProps } from 'contentful-management';
import { useContentfulContext } from './ContentfulContext';
import { useLocalStorage } from 'react-use';
import { useMeshLocation } from '@uniformdev/mesh-sdk-react';

type EditorContextProps = {
  activeLocales: LocaleProps[];
  selectLocale: (locale: LocaleProps) => void;
  deselectLocale: (locale: LocaleProps) => void;
};

const EditorContext = createContext<EditorContextProps>({
  activeLocales: [],
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  selectLocale: () => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  deselectLocale: () => {},
});

export const useEditorContext = () => useContext(EditorContext);

export const EditorContextProvider = ({ children }: { children: React.ReactNode }) => {
  const { metadata } = useMeshLocation();
  const { defaultLocale } = useContentfulContext();

  const [activeLocales = [defaultLocale], setActiveLocales] = useLocalStorage<LocaleProps[]>(
    `${metadata.projectId}-contentful-active-locales`,
    [defaultLocale]
  );

  // @todo: we need to add spaceId from DS, to avoid conflicts between multiple data sources with different locales
  // also validate active locales against locales available for the space

  const selectLocale = (locale: LocaleProps) => {
    setActiveLocales([...activeLocales.filter((l) => l.code !== locale.code), locale]);
  };

  const deselectLocale = (locale: LocaleProps) => {
    setActiveLocales(activeLocales.filter((l) => l.code !== locale.code));
  };

  return (
    <EditorContext.Provider value={{ activeLocales, selectLocale, deselectLocale }}>
      {children}
    </EditorContext.Provider>
  );
};
