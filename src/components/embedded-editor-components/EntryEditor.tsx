import { Field, FieldWrapper } from '@contentful/default-field-editors';
import { entityHelpers } from '@contentful/field-editor-shared';

import jsonPointer from 'jsonpointer';
import {
  ContentFields,
  ContentTypeProps,
  EntryProps,
  KeyValueMap,
  LocaleProps,
  EditorInterface,
} from 'contentful-management';
import { Dispatch, SetStateAction, useCallback, useMemo, useState } from 'react';
import { useFieldAPIToFieldSDK } from './useFieldAPIToFieldSDK';
import { useContentfulContext } from './ContentfulContext';
import { createFakeFieldAPI } from '@contentful/field-editor-test-utils';
import { Button, Menu, Note, Paragraph, Header, EntityStatusBadge, Stack } from '@contentful/f36-components';
import { ChevronDownIcon } from '@contentful/f36-icons';
import { useContentfulEntry, useEntryMutations } from './dataHooks';
import { useMeshLocation } from '@uniformdev/mesh-sdk-react';
import { HorizontalRhythm, VerticalRhythm } from '@uniformdev/design-system';
import { ContentfulEditorProps } from '../../pages/embeddedEditor';
import type { ValidationError } from '@contentful/app-sdk/dist/types/validation-error';
import { EditorContextProvider, useEditorContext } from './EditorContext';
import { LocaleSelector } from './LocaleSelector';
import { BladesProvider, useBladeContext } from './blades/BladesProvider';
import { EntityCacheProvider } from '@contentful/field-editor-reference';
import { css } from '@emotion/react';
import { ModalsProvider } from './modals/ModalsController';
import 'codemirror/lib/codemirror.css';
import {
  useValidation,
  validationErrorsEmitter,
  ValidationErrorsEvents,
  ValidationProvider,
} from './validation/ValidationContext';
import { validateField } from './validation/validateEntry';
import { Items } from '@contentful/app-sdk';
import { activateContentfulI18n, useFocusRichTextOnEmbedClick } from './hacks';
import { openMarkdownDialog } from '@contentful/field-editor-markdown';
import { LogoutButton } from './AuthorizationOverlay';

activateContentfulI18n();

const EntryEditorSelector = ({ entry: defaultEntry, dataType, variables }: ContentfulEditorProps) => {
  const [entry, setEntry] = useState<EntryProps>(defaultEntry!);

  if (!entry) {
    return <NewEntryCreator setEntry={setEntry} dataType={dataType} variables={variables} />;
  } else {
    return (
      <EditorContextProvider>
        <EntityCacheProvider>
          <RootEntryEditor entry={entry} dataType={dataType} variables={variables} />
        </EntityCacheProvider>
      </EditorContextProvider>
    );
  }
};

const NewEntryCreator = ({
  setEntry,
  dataType,
}: Omit<ContentfulEditorProps, 'entry'> & { setEntry: Dispatch<SetStateAction<EntryProps>> }) => {
  const allowedContentTypes = (dataType.custom?.allowContentTypeIds as string[]) ?? [];
  const { contentTypes } = useContentfulContext();
  const { createEmptyEntry } = useEntryMutations();

  return (
    <div style={{ minHeight: '40rem' }}>
      <Paragraph>Create a new Contentful entry</Paragraph>
      <Menu>
        <Menu.Trigger>
          <Button variant="primary" endIcon={<ChevronDownIcon />} aria-label="Select content type">
            Add new entry
          </Button>
        </Menu.Trigger>
        <Menu.List>
          {contentTypes
            .filter(
              (contentType) => !allowedContentTypes.length || allowedContentTypes.includes(contentType.sys.id)
            )
            .map((contentType) => (
              <Menu.Item
                key={contentType.sys.id}
                onClick={async () => {
                  const entry = await createEmptyEntry({ contentType });
                  if (entry) {
                    setEntry(entry);
                  }
                }}
              >
                {contentType.name}
              </Menu.Item>
            ))}
        </Menu.List>
      </Menu>
    </div>
  );
};

const RootEntryEditor = ({
  entry: defaultEntry,
  dataType,
  variables,
}: ContentfulEditorProps & { entry: EntryProps }) => {
  const archetype = dataType.archetype;
  const { setValue } = useMeshLocation();
  const setValuePerArcheType = useCallback(
    async (newEntry: EntryProps) => {
      try {
        const newEntryId = newEntry.sys.id;
        switch (archetype) {
          case 'queryEntry':
            // Nothing to set for query from inside embedded editor, but we need to trigger setValue to close mesh location and reload data
            await setValue(() => ({ newValue: {} }));
            break;

          case 'singleEntry':
            await setValue(() => ({ newValue: { entryIds: newEntryId } }));
            break;

          case 'multipleEntry':
            await setValue(() => ({
              newValue: { entryIds: variables.entryIds ? `${variables.entryIds},${newEntryId}` : newEntryId },
            }));
            break;

          case 'entryByField':
            if (dataType.custom?.slugField) {
              // remove operator from the field filter field. E.g. field.slug[in] -> field.slug
              const fieldJsonPointer = (dataType.custom?.slugField as string).split('[')[0];
              const value = jsonPointer.get(newEntry, `/${fieldJsonPointer.replaceAll('.', '/')}`);
              if (value) {
                await setValue(() => ({ newValue: { entryIds: newEntryId, value } }));
              } else {
                // eslint-disable-next-line no-console
                console.warn(
                  'We have failed to automatically set the new value. But entry was saved successfully. So please go and change selection manually.'
                );
              }
              break;
            } else {
              // eslint-disable-next-line no-console
              console.error('No slug field found in data type', { dataType });
            }
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to set value', error);
      }
    },
    [archetype, setValue, dataType, variables]
  );
  return (
    <BladesProvider>
      <ValidationProvider>
        <EntryEditor entry={defaultEntry} setLocalEntry={setValuePerArcheType} index={0} />
      </ValidationProvider>
    </BladesProvider>
  );
};

export const InBladeEntryEditor = () => {
  const { data, index, close, setBladeResult } = useBladeContext();

  const { data: entry, isLoading } = useContentfulEntry(data.entityId);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!entry) {
    return <div>Entry not found</div>;
  }

  return (
    <div>
      <ValidationProvider>
        <EntryEditor entry={entry} setLocalEntry={setBladeResult} index={index} close={close} />
      </ValidationProvider>
    </div>
  );
};

const EntryEditor = ({
  entry: defaultEntry,
  setLocalEntry,
  index,
  close,
}: {
  entry: EntryProps;
  setLocalEntry?: (entry: EntryProps) => void;
  index: number;
  close?: () => void;
}) => {
  const { updateEntry, publishEntry } = useEntryMutations();
  const { contentTypes, defaultLocale } = useContentfulContext();
  const [entry, setEntry] = useState(defaultEntry);
  const [processing, setProcessing] = useState(false);
  const contentType = contentTypes.find((c) => c.sys.id === entry.sys.contentType.sys.id)!;
  const [error, setError] = useState<string>();
  const isRootEditor = index === 0;
  const { addFieldError, errors } = useValidation();

  const entryTitle = entityHelpers.getEntryTitle({
    entry,
    contentType,
    localeCode: defaultLocale.code,
    defaultLocaleCode: defaultLocale.code,
    defaultTitle: 'Untitled',
  });

  const updateLocalEntry = (newEntry: EntryProps) => {
    setEntry(newEntry);

    if (setLocalEntry && !isRootEditor) {
      setLocalEntry(newEntry);
    }
  };

  useFocusRichTextOnEmbedClick();

  return (
    <ModalsProvider>
      <div
        css={css`
          padding: var(--spacing-base);
        `}
      >
        {/* When either an EntryCard or AssetCard actions menu is closed, popper focuses
        the first focusable element of the body, which then causes scroll if the
        said element is out of viewport.
        We have no direct access to popper config as it's part of the asset/entry reference
        fields, so this was the only way I could found to prevent this behavior. */}
        <button
          css={{
            position: 'fixed',
            top: 0,
            left: 0,
            opacity: 0,
            pointerEvents: 'none',
            height: 0,
            width: 0,
          }}
        >
          Focus capture
        </button>

        <Header
          title={
            <Stack spacing="spacingL">
              <span>{`Entry: ${entryTitle}`}</span>
              <EntityStatusBadge entityStatus={entityHelpers.getEntityStatus(entry.sys)} />
            </Stack>
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          withBackButton={(index !== 0) as any}
          backButtonProps={{
            onClick: () => {
              close?.();
            },
          }}
          actions={
            <Stack spacing="spacingL">
              <LocaleSelector />
              <LogoutButton />
            </Stack>
          }
        />

        {contentType.fields.map((field) => (
          <ContentfulField
            key={field.id}
            contentType={contentType}
            fieldId={field.id}
            entry={entry}
            setFieldValue={({ fieldId, locale, value }) => {
              const updatedEntry = { ...entry };

              if (updatedEntry.fields[fieldId] === undefined) {
                updatedEntry.fields[fieldId] = {};
              }

              updatedEntry.fields[fieldId][locale.code] = value;

              updateLocalEntry(updatedEntry);
              const errors = validateField({
                fieldId,
                entry: updatedEntry,
                contentType,
                localeCode: locale.code,
              });
              errors.map(addFieldError);
              validationErrorsEmitter.emit('errorsChanged', {
                entryId: updatedEntry.sys.id,
                fieldId,
                localeCode: locale.code,
                errors,
              });
            }}
            index={index}
          />
        ))}

        <VerticalRhythm gap="base">
          {error && <Note variant="warning">{error}</Note>}

          <HorizontalRhythm gap="base">
            <Button
              isLoading={processing}
              isDisabled={processing}
              variant="positive"
              onClick={async () => {
                setProcessing(true);
                setError(undefined);
                try {
                  const updatedEntry = await updateEntry({ entry, entryId: entry.sys.id });

                  updateLocalEntry(updatedEntry);
                  if (isRootEditor) {
                    setLocalEntry?.(updatedEntry);
                  }
                  close?.();
                } catch (e) {
                  setError(e.message);
                } finally {
                  setProcessing(false);
                }
              }}
            >
              Save changes & Close
            </Button>
            <Button
              isLoading={processing}
              isDisabled={processing || errors.length > 0}
              variant="primary"
              onClick={async () => {
                setProcessing(true);
                setError(undefined);
                try {
                  const updatedEntry = await updateEntry({ entry, entryId: entry.sys.id });

                  updateLocalEntry(updatedEntry);

                  const publishedEntry = await publishEntry({
                    entry: updatedEntry!,
                    entryId: updatedEntry!.sys.id,
                  });

                  updateLocalEntry(publishedEntry);
                  if (isRootEditor) {
                    setLocalEntry?.(publishedEntry);
                  }
                  close?.();
                } catch (e) {
                  setError(e.message);
                } finally {
                  setProcessing(false);
                }
              }}
            >
              Save & Publish & Close
            </Button>
          </HorizontalRhythm>
        </VerticalRhythm>
      </div>
    </ModalsProvider>
  );
};

export const ContentfulField = ({
  fieldId,
  entry,
  setFieldValue,
  contentType,
  index,
}: {
  contentType: ContentTypeProps;
  fieldId: string;
  entry: EntryProps;
  setFieldValue: ({
    fieldId,
    locale,
    value,
  }: {
    fieldId: string;
    locale: LocaleProps;
    value: unknown;
  }) => void;
  index: number;
}) => {
  const { defaultLocale, editorInterfaces } = useContentfulContext();
  const { activeLocales } = useEditorContext();

  const editorInterface = useMemo(
    () => editorInterfaces.find((ei) => ei.sys.contentType.sys.id === contentType.sys.id),
    [editorInterfaces, contentType]
  );

  const field = contentType.fields.find((f) => f.id === fieldId);

  if (!field) {
    return null;
  }

  if (!field.localized && !activeLocales.some((l) => l.code === defaultLocale.code)) {
    return null;
  }

  if (!editorInterface) {
    return null;
  }

  const effectiveLocales = field.localized ? activeLocales : [defaultLocale];

  return (
    <>
      {effectiveLocales.map((locale) => {
        const value = entry.fields[fieldId]?.[locale.code];

        return (
          <ContentfulFieldWidget
            name={effectiveLocales.length > 1 ? `${field.name} | ${locale.name}` : field.name}
            key={locale.code}
            field={field}
            value={value}
            contentType={contentType}
            locale={locale}
            setFieldValue={setFieldValue}
            entry={entry}
            editorInterface={editorInterface}
            index={index}
          />
        );
      })}
    </>
  );
};

const ContentfulFieldWidget = ({
  name,
  field,
  value,
  contentType,
  locale,
  setFieldValue,
  entry,
  editorInterface,
  index,
}: {
  name: string;
  field: ContentFields<KeyValueMap>;
  value: unknown;
  contentType: ContentTypeProps;
  locale: LocaleProps;
  setFieldValue: ({
    fieldId,
    locale,
    value,
  }: {
    fieldId: string;
    locale: LocaleProps;
    value: unknown;
  }) => void;
  entry: EntryProps;
  editorInterface: EditorInterface;
  index: number;
}) => {
  const { spaceMemberships, spaceId, roles, organizationId } = useContentfulContext();
  const spaceMembership = spaceMemberships.find((sm) => sm.sys.space.sys.id === spaceId);
  const { clearFieldErrors } = useValidation();
  const { activeLocales } = useEditorContext();
  const [fakeField] = createFakeFieldAPI((fieldApi) => {
    return {
      ...fieldApi,
      id: field.id,
      required: field.required,
      locale: locale.code,
      getValue: () => value || undefined,
      setValue: async (newValue: unknown) => {
        validationErrorsEmitter.emit('errorsChanged', {
          entryId: entry.sys.id,
          fieldId: field.id,
          localeCode: locale.code,
          errors: [],
        });
        clearFieldErrors(field.id);
        setFieldValue({
          fieldId: field.id,
          locale,
          value: newValue,
        });

        return undefined;
      },
      removeValue: async () => {
        validationErrorsEmitter.emit('errorsChanged', {
          entryId: entry.sys.id,
          fieldId: field.id,
          localeCode: locale.code,
          errors: [],
        });
        clearFieldErrors(field.id);

        setFieldValue({
          fieldId: field.id,
          locale,
          value: undefined,
        });

        return undefined;
      },
      validations: field.validations ?? [],
      items: field.items as Items,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type: field.type as any,
      onSchemaErrorsChanged: (cb: (errors: ValidationError[]) => void) => {
        const errorsChangedHandler = (msg: ValidationErrorsEvents['errorsChanged']): void => {
          const isLocaleWithErrorsNotActive =
            !!msg.localeCode && !activeLocales.some((l) => l.code === msg.localeCode);
          const notLocalisedOrEmptyFieldError = typeof msg.localeCode === 'undefined';

          if (
            msg.entryId !== entry.sys.id ||
            msg.fieldId !== field.id ||
            (!notLocalisedOrEmptyFieldError && !isLocaleWithErrorsNotActive && msg.localeCode !== locale.code)
          ) {
            return;
          }

          // Switching to custom error messages if specified in field configuration
          msg.errors.forEach((error) => {
            const validation = field.validations?.find((v) => error.name in v && v.message);
            if (validation?.message) {
              error.message = validation.message;
            }
          });

          if (isLocaleWithErrorsNotActive) {
            // special case when locale with error is not active so not visible in UI,
            // that's why we want to render error under first active locale
            cb(msg.errors.map((error) => ({ ...error, localeCode: activeLocales[0].code })));
          } else {
            cb(msg.errors);
          }
        };

        validationErrorsEmitter.on('errorsChanged', errorsChangedHandler);

        return () => {
          validationErrorsEmitter.off('errorsChanged', errorsChangedHandler);
        };
      },
    };
  });
  const { fieldSdk } = useFieldAPIToFieldSDK({
    entry,
    field,
    contentType,
    locale,
    fakeField,
    editorInterface,
    spaceMembership: spaceMembership!,
    roles,
    organizationId,
    index,
  });

  const widgetId = editorInterface.controls?.find((c) => c.fieldId === field.id)?.widgetId;

  if (widgetId === 'markdown') {
    // @ts-expect-error
    fieldSdk.dialogs.openCurrent = openMarkdownDialog(fieldSdk);
  }

  return (
    <FieldWrapper sdk={fieldSdk} name={name}>
      <Field
        sdk={fieldSdk}
        isInitiallyDisabled={false}
        widgetId={widgetId}
        getOptions={() => {
          return {
            singleLine: {
              withCharValidation: true,
            },
          };
        }}
      />
    </FieldWrapper>
  );
};

export default EntryEditorSelector;
