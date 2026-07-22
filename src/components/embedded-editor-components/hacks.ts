import { useEffect } from 'react';
import { i18n } from '@lingui/core';

// Contentful's field editor components (e.g. the `UniquenessError` from
// `@contentful/field-editor-validation-errors`) call Lingui translation helpers
// (`i18n._(...)`). Inside the Contentful web app the host activates a locale, but
// in this standalone embedded editor nobody does, so those components throw
// "Attempted to call a translation function without setting a locale".
// Activating an (empty) catalog makes Lingui fall back to the inline default
// messages the components ship with instead of throwing.
//
// Note: @lingui/core ships separate ESM and CJS builds, each with its own `i18n`
// singleton. The Contentful field editors use the CJS build, so `@lingui/core` is
// aliased to that build in next.config.js — that way the `i18n` imported here is
// the exact instance the components use.
let contentfulI18nActivated = false;
export const activateContentfulI18n = () => {
  if (contentfulI18nActivated) {
    return;
  }

  i18n.loadAndActivate({ locale: 'en', messages: {} });
  contentfulI18nActivated = true;
};

// When a RTE field is just initialized, it it hasn't been interacted with,
// inserting an asset/entry causes a bug with the focus state management.
// Reproducible https://contentful-field-editors.netlify.app/?path=/story/editors-rich-text-editor--default
// by directly clicking on Embed without first interacting with the editor.
// To get around this, we focus the RTE and trigger a fake click when the Embed menu is clicked.
export const useFocusRichTextOnEmbedClick = () => {
  useEffect(() => {
    const listener = (event: MouseEvent) => {
      if (!event.target) {
        return;
      }

      if (!(event.target as HTMLElement).closest('[data-test-id="toolbar-entity-dropdown-toggle"]')) {
        return;
      }

      const rteElementToClick = (event.target as HTMLElement)
        .closest('[data-test-id="rich-text-editor"]')
        ?.querySelector('[data-slate-editor="true"]');

      if (!rteElementToClick) {
        return;
      }

      (rteElementToClick as HTMLElement).focus();
      (rteElementToClick as HTMLElement).click();
    };

    document.addEventListener('click', listener);

    return () => {
      document.removeEventListener('click', listener);
    };
  }, []);
};
