import { useMemo } from 'react';
import { useEditorContext } from './EditorContext';
import { Multiselect } from '@contentful/f36-multiselect';
import { useContentfulContext } from './ContentfulContext';

export const LocaleSelector = () => {
  const { activeLocales, selectLocale, deselectLocale } = useEditorContext();
  const { locales } = useContentfulContext();

  const currentSelection = useMemo(() => {
    return [...activeLocales]
      .sort((a, b) => (a.default ? -1 : b.default ? 1 : 0))
      .map((locale) => locale.code);
  }, [activeLocales]);

  return (
    <div className="locale-selector-wrapper">
      <Multiselect placeholder="Locales" currentSelection={currentSelection} className="locale-selector">
        {locales.map((locale) => {
          return (
            <Multiselect.Option
              key={locale.code}
              label={locale.name}
              value={locale.code}
              isChecked={
                activeLocales.find((activeLocale) => activeLocale.code === locale.code) !== undefined
              }
              itemId={locale.code}
              onSelectItem={(event) => {
                const { checked, value } = event.target;

                const checkedLocale = locales.find((activeLocale) => activeLocale.code === value);

                if (!checkedLocale) {
                  return;
                }

                if (checked) {
                  selectLocale(checkedLocale);
                } else {
                  deselectLocale(checkedLocale);
                }
              }}
              isDisabled={activeLocales.length === 1 && activeLocales.some((l) => l.code === locale.code)}
            />
          );
        })}
      </Multiselect>
    </div>
  );
};
