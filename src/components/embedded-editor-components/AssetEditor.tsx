import { Field, FieldWrapper } from '@contentful/default-field-editors';
import { ContentFields, ContentTypeProps, KeyValueMap, LocaleProps, AssetProps } from 'contentful-management';
import { useRef, useState } from 'react';
import { useFieldAPIToFieldSDK } from './useFieldAPIToFieldSDK';
import { useContentfulContext } from './ContentfulContext';
import { createFakeFieldAPI } from '@contentful/field-editor-test-utils';
import { Button, Note, Header, Stack, EntityStatusBadge } from '@contentful/f36-components';
import {
  constructInvalidateAssetsQueriesKey,
  createAssetQueryKey,
  useAssetMutations,
  useContentfulAsset,
} from './dataHooks';
import { HorizontalRhythm } from '@uniformdev/design-system';
import { useEditorContext } from './EditorContext';
import { LocaleSelector } from './LocaleSelector';
import { useBladeContext } from './blades/BladesProvider';
import { css } from '@emotion/react';
import { assetFakeContentType } from './assets/assetContentType';
import { AssetFileField } from './assets/AssetFIleField';
import { produce, applyPatches, enablePatches, Patch } from 'immer';
import { useQueryClient } from '@tanstack/react-query';
import { ModalsProvider } from './modals/ModalsController';
import { entityHelpers } from '@contentful/field-editor-shared';
import { activateContentfulI18n } from './hacks';

enablePatches();
activateContentfulI18n();

export const InBladeAssetEditor = () => {
  const { data } = useBladeContext();

  const { data: asset, isLoading } = useContentfulAsset(data.entityId);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!asset) {
    return <div>Asset not found</div>;
  }

  return (
    <ModalsProvider>
      <AssetEditor asset={asset} />
    </ModalsProvider>
  );
};

const AssetEditor = ({ asset: defaultAsset }: { asset: AssetProps }) => {
  const { updateAsset, publishAsset } = useAssetMutations();
  const { defaultLocale, client, spaceId, environmentId } = useContentfulContext();
  const [asset, setAsset] = useState(defaultAsset);
  const [formState, setFormState] = useState<'saving' | 'publishing' | 'idle'>('idle');
  const [error, setError] = useState<string>();
  const { index, close, setBladeResult } = useBladeContext();
  const queryClient = useQueryClient();
  const assetTitle = entityHelpers.getAssetTitle({
    asset,
    localeCode: defaultLocale.code,
    defaultLocaleCode: defaultLocale.code,
    defaultTitle: 'Untitled',
  });

  const { activeLocales } = useEditorContext();

  const changes = useRef<Patch[]>([]);

  const updateLocalAsset = (newAsset: AssetProps) => {
    setAsset(newAsset);
    setBladeResult(newAsset);
  };
  // Used to force re-render of the asset title field when set from a file upload
  // (only happens if the title is not set yet)
  const [assetTitleFieldKey, setAssetTitleFieldKey] = useState<number>(0);

  return (
    <div
      css={css`
        padding: var(--spacing-base);
      `}
    >
      <Header
        title={
          <Stack spacing="spacingL">
            <span>{`Asset: ${assetTitle}`}</span>
            <EntityStatusBadge entityStatus={entityHelpers.getEntityStatus(asset.sys)} />
          </Stack>
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        withBackButton={(index !== 0) as any}
        backButtonProps={{
          onClick: () => {
            close();
          },
        }}
        actions={<LocaleSelector />}
      />

      <ContentfulField
        contentType={assetFakeContentType}
        fieldId="title"
        asset={asset}
        setFieldValue={({ fieldId, locale, value }) => {
          const updatedAsset = produce(
            asset,
            (draft) => {
              draft.fields[fieldId] ??= {};

              draft.fields[fieldId][locale.code] = value ?? '';
            },
            (patches) => {
              changes.current = changes.current.concat(patches);
            }
          );

          updateLocalAsset(updatedAsset);
        }}
        widgetId="singleLine"
        key={assetTitleFieldKey}
      />

      <ContentfulField
        contentType={assetFakeContentType}
        fieldId="description"
        asset={asset}
        setFieldValue={({ fieldId, locale, value }) => {
          const updatedAsset = produce(
            asset,
            (draft) => {
              draft.fields[fieldId] ??= {};

              draft.fields[fieldId][locale.code] = value ?? '';
            },
            (patches) => {
              changes.current = changes.current.concat(patches);
            }
          );

          updateLocalAsset(updatedAsset);
        }}
        widgetId="multipleLine"
      />

      {activeLocales.map((locale) => (
        <AssetFileField
          key={locale.code}
          assetId={asset.sys.id}
          locale={locale}
          value={asset.fields.file?.[locale.code]}
          setValue={(value) => {
            const updatedAsset = produce(
              asset,
              (draft) => {
                if (value === null) {
                  delete draft.fields.file[locale.code];
                } else {
                  draft.fields.file ??= {};
                  draft.fields.file[locale.code] = value;

                  if (!draft.fields.title?.[locale.code]) {
                    draft.fields.title ??= {};
                    draft.fields.title[locale.code] = value.fileName.split('.')[0];
                  }
                }
              },
              (patches) => {
                changes.current = changes.current.concat(patches);
              }
            );

            updateLocalAsset(updatedAsset);

            setAssetTitleFieldKey((prev) => prev + 1);
          }}
        />
      ))}

      {error && <Note variant="warning">{error}</Note>}

      <HorizontalRhythm gap="base">
        <Button
          isLoading={formState === 'saving'}
          isDisabled={formState !== 'idle'}
          variant="positive"
          onClick={async () => {
            setFormState('saving');

            const existingAsset = await client.asset.get({
              environmentId,
              spaceId,
              assetId: asset.sys.id,
            });

            const updatedAsset = await updateAsset({
              asset: applyPatches(existingAsset, changes.current),
              assetId: asset.sys.id,
            });

            if (!updatedAsset) {
              setFormState('idle');
              setError('Failed to save asset');
              return;
            }

            queryClient.setQueryData(
              createAssetQueryKey(updatedAsset.sys.id, spaceId, environmentId),
              updatedAsset
            );

            const assetsInvalidationQueryKey = constructInvalidateAssetsQueriesKey(spaceId, environmentId);

            queryClient.invalidateQueries({
              queryKey: assetsInvalidationQueryKey,
            });

            updateLocalAsset(updatedAsset);
            setFormState('idle');
          }}
        >
          Save changes
        </Button>
        <Button
          isLoading={formState === 'publishing'}
          isDisabled={formState !== 'idle'}
          variant="primary"
          onClick={async () => {
            setFormState('publishing');

            const existingAsset = await client.asset.get({
              environmentId,
              spaceId,
              assetId: asset.sys.id,
            });

            const updatedAsset = await updateAsset({
              asset: applyPatches(existingAsset, changes.current),
              assetId: asset.sys.id,
            });

            if (!updatedAsset) {
              setFormState('idle');
              setError('Failed to save asset');
              return;
            }

            updateLocalAsset(updatedAsset);

            const publishedAsset = await publishAsset({
              asset: updatedAsset,
              assetId: updatedAsset.sys.id,
            });

            if (!publishedAsset) {
              setFormState('idle');
              setError('Failed to publish asset');
              return;
            }

            queryClient.setQueryData(
              createAssetQueryKey(publishedAsset.sys.id, spaceId, environmentId),
              publishedAsset
            );

            const assetsInvalidationQueryKey = constructInvalidateAssetsQueriesKey(spaceId, environmentId);

            queryClient.invalidateQueries({
              queryKey: assetsInvalidationQueryKey,
            });

            updateLocalAsset(publishedAsset);
            setFormState('idle');
          }}
        >
          Save & Publish
        </Button>
      </HorizontalRhythm>
    </div>
  );
};

export const ContentfulField = ({
  contentType,
  fieldId,
  asset,
  setFieldValue,
  widgetId,
}: {
  contentType: ContentTypeProps;
  fieldId: 'title' | 'description';
  asset: AssetProps;
  setFieldValue: ({
    fieldId,
    locale,
    value,
  }: {
    fieldId: 'title' | 'description';
    locale: LocaleProps;
    value: string | undefined;
  }) => void;
  widgetId: 'singleLine' | 'multipleLine';
}) => {
  const { defaultLocale } = useContentfulContext();
  const { activeLocales } = useEditorContext();

  const field = contentType.fields.find((f) => f.id === fieldId);

  if (!field) {
    return null;
  }

  const effectiveLocales = field.localized ? activeLocales : [defaultLocale];

  return (
    <>
      {effectiveLocales.map((locale) => {
        const value = asset.fields[fieldId]?.[locale.code];

        return (
          <ContentfulFieldWidget
            name={effectiveLocales.length > 1 ? `${field.name} | ${locale.name}` : field.name}
            key={locale.code}
            field={field}
            value={value}
            contentType={contentType}
            locale={locale}
            setFieldValue={setFieldValue}
            asset={asset}
            widgetId={widgetId}
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
  asset,
  widgetId,
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
    fieldId: 'title' | 'description';
    locale: LocaleProps;
    value: string | undefined;
  }) => void;
  asset: AssetProps;
  widgetId: 'singleLine' | 'multipleLine';
}) => {
  const { spaceMemberships, spaceId, roles, organizationId } = useContentfulContext();
  const spaceMembership = spaceMemberships.find((sm) => sm.sys.space.sys.id === spaceId);
  const { index } = useBladeContext();
  const [fakeField] = createFakeFieldAPI((fieldApi) => {
    return {
      ...fieldApi,
      id: field.id,
      required: field.required,
      locale: locale.code,
      getValue: () => value || undefined,
      setValue: async (newValue: unknown) => {
        setFieldValue({
          fieldId: field.id as 'title' | 'description',
          locale,
          value: newValue as string | undefined,
        });

        // clearFieldErrors({
        //   entryId: entry.sys.id,
        //   fieldId: field.id,
        //   locale: locale.code,
        // });

        return undefined;
      },
      removeValue: async () => {
        setFieldValue({
          fieldId: field.id as 'title' | 'description',
          locale,
          value: undefined,
        });

        // clearFieldErrors({
        //   entryId: entry.sys.id,
        //   fieldId: field.id,
        //   locale: locale.code,
        // });

        return undefined;
      },
      validations: field.validations ?? [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      linkType: 'Asset',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type: field.type as any,
      onSchemaErrorsChanged: () => {
        // const errorsChangedHandler = (msg: ValidationErrorsEvents['errorsChanged']): void => {
        //   if (msg.key[0] !== entry.sys.id || msg.key[1] !== field.id || msg.key[2] !== locale.code) {
        //     return;
        //   }

        //   cb(msg.errors);
        // };

        // validationErrorsEmitter.on('errorsChanged', errorsChangedHandler);

        // const existingErrors = fieldErrors.get(`${entry.sys.id}-${field.id}-${locale.code}`);

        // if (existingErrors !== undefined) {
        //   cb(existingErrors);
        // }

        return () => {
          // validationErrorsEmitter.off('errorsChanged', errorsChangedHandler);
        };
      },
    };
  });
  const { fieldSdk } = useFieldAPIToFieldSDK({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    entry: asset as any,
    field,
    contentType,
    locale,
    fakeField,
    editorInterface: undefined,
    spaceMembership: spaceMembership!,
    roles,
    organizationId,
    index,
  });

  return (
    <FieldWrapper sdk={fieldSdk} name={name}>
      <Field sdk={fieldSdk} isInitiallyDisabled={false} widgetId={widgetId} />
    </FieldWrapper>
  );
};
