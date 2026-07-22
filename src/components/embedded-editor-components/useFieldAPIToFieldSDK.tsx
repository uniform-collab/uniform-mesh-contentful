import {
  AssetProps,
  ContentFields,
  ContentTypeProps,
  EditorInterfaceProps,
  EntryProps,
  KeyValueMap,
  LocaleProps,
  QueryParams,
  RoleProps,
  SpaceMembership,
} from 'contentful-management';
import { useContentfulContext } from './ContentfulContext';
import {
  BaseAppSDK,
  ContentTypeAPI,
  ContentTypeField,
  FieldAPI,
  FieldAppSDK,
  SerializedJSONValue,
} from '@contentful/app-sdk';
import { createFakeFieldAPI } from '@contentful/field-editor-test-utils';
import { useBladesContext } from './blades/BladesProvider';
import { useQueryClient } from '@tanstack/react-query';
import { useAssetMutations, useEntryMutations } from './dataHooks';
import { SELECT_EXISTING_ASSETS, SELECT_EXISTING_ENTRIES, useModals } from './modals/ModalsController';

interface UseFieldAPIToFieldSDKProps {
  editorInterface: EditorInterfaceProps | undefined;
  field: ContentFields<KeyValueMap>;
  // pickEntries: ReturnType<typeof useEntryPicker>["pick"];
  // pickAssets: ReturnType<typeof useAssetPicker>["pick"];
  entry: EntryProps<KeyValueMap>;
  contentType: ContentTypeProps;
  fakeField: FieldAPI;
  locale: LocaleProps;
  spaceMembership: SpaceMembership;
  roles: RoleProps[];
  organizationId: string;
  index: number;
}

interface FieldToFieldAPIInput<ValueType = unknown> {
  field: ContentTypeField;
  value: ValueType;
  setValue: () => Promise<SerializedJSONValue | undefined>;
}

export function fieldToFieldAPI<ValueType>({
  field,
  value,
  setValue,
}: FieldToFieldAPIInput<ValueType>): FieldAPI {
  return createFakeFieldAPI((fieldApi) => ({
    ...fieldApi,
    getValue: () => value || undefined,
    setValue,
    validations: field.validations ?? [],
  }))[0];
}

export function uncapitalizeFirstLetter(string: string) {
  return string.charAt(0).toLowerCase() + string.slice(1);
}

export const useFieldAPIToFieldSDK = ({
  entry,
  field,
  contentType,
  fakeField,
  locale,
  editorInterface,
  spaceMembership,
  roles,
  organizationId,
  index,
}: UseFieldAPIToFieldSDKProps) => {
  const { locales, user, defaultLocale, spaceId, environmentId, client, contentTypes } =
    useContentfulContext();

  const { openModal } = useModals();

  const queryClient = useQueryClient();
  const { createEmptyEntry } = useEntryMutations();
  const { createEmptyAsset } = useAssetMutations();
  const { openBlade } = useBladesContext();
  const defaultDialogs: FieldAppSDK['dialogs'] = {
    selectSingleEntry: async (options?: {
      locale?: string;
      contentTypes?: string[];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }): Promise<any> => {
      const selectedEntry = await openModal<EntryProps>(
        SELECT_EXISTING_ENTRIES,
        options
          ? {
              ...options,
              max: 1,
            }
          : {
              max: 1,
            }
      );

      if (selectedEntry.length === 0) {
        return null;
      }

      return selectedEntry[0];
    },
    selectMultipleEntries: async (options?: {
      locale?: string;
      contentTypes?: string[];
      min?: number;
      max?: number;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }): Promise<any> => {
      const selectedEntries = await openModal<EntryProps>(SELECT_EXISTING_ENTRIES, options ?? {});

      if (selectedEntries.length === 0) {
        return null;
      }

      return selectedEntries;
    },
    selectSingleAsset: async (options?: {
      locale?: string;
      mimetypeGroups?: string[];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }): Promise<any> => {
      const selectedAssets = await openModal(
        SELECT_EXISTING_ASSETS,
        options
          ? {
              ...options,
              max: 1,
            }
          : {
              max: 1,
            }
      );

      if (selectedAssets.length === 0) {
        return null;
      }

      return selectedAssets[0];
    },
    selectMultipleAssets: async (options?: {
      locale?: string;
      min?: number;
      max?: number;
      mimetypeGroups?: string[];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }): Promise<any> => {
      const selectedAssets = await openModal(SELECT_EXISTING_ASSETS, options ?? {});

      if (selectedAssets.length === 0) {
        return null;
      }

      return selectedAssets;
    },
    openAlert: async () => true,
    openConfirm: async () => true,
    openPrompt: async () => '',
    openExtension: async () => null,
    openCurrentApp: async () => null,
    openCurrent: async () => null,
  };

  const fieldSdk: FieldAppSDK = {
    hostnames: {
      delivery: 'https://cdn.contentful.com',
      management: 'https://api.contentful.com',
      preview: 'https://preview.contentful.com', // @todo it can be EU specific
      upload: 'https://images.ctfassets.net',
      graphql: 'https://graphql.contentful.com',
      webapp: 'https://api.contentful.com', // @todo have no idea what it is
    },
    cma: client as unknown as BaseAppSDK['cma'],
    ids: {
      field: field.id,
      contentType: contentType.sys.id,
      entry: entry.sys.id,
      environment: environmentId,
      space: spaceId,
      organization: organizationId,
      user: user.sys.id,
    },
    field: fakeField,
    dialogs: defaultDialogs,
    contentType: contentType as unknown as ContentTypeAPI,
    entry: {
      ...entry,
      fields: Object.keys(entry.fields).reduce((acc, entryFieldId) => {
        const cTypeField = contentType.fields.find((cTypeField) => cTypeField.id === entryFieldId);

        if (!cTypeField) {
          return acc;
        }

        return {
          ...acc,
          [entryFieldId]: fieldToFieldAPI({
            field: cTypeField,
            value:
              entry.fields[entryFieldId]?.[cTypeField.localized ? locale.code : defaultLocale.code] ?? null,
            setValue: async () => {
              return undefined;
            },
          }),
        };
      }, {}),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getSys: () => entry.sys as any,
      onSysChanged: () => () => {
        // eslint-disable-next-line no-console
        console.log('onSysChanged');
      },
      metadata: entry.metadata,
      getMetadata: () => entry.metadata,
      onMetadataChanged: () => () => {
        // eslint-disable-next-line no-console
        console.log('onMetadataChanged');
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getTask: () => Promise.resolve(null as any),
      getTasks: () =>
        Promise.resolve({
          items: [],
          total: 0,
          skip: 0,
          limit: 0,
          sys: {
            type: 'Array',
          },
        }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createTask: () => Promise.resolve(null as any),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      updateTask: () => Promise.resolve(null as any),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      deleteTask: () => Promise.resolve(null as any),
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      publish: async () => {},
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      unpublish: async () => {},
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      save: async () => {},
    },
    editor: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      editorInterface: editorInterface ?? ({ sys: {} } as any),
      onLocaleSettingsChanged: () => () => {
        // console.log("onLocaleSettingsChanged");
      },
      onShowDisabledFieldsChanged: () => () => {
        // console.log("onShowDisabledFieldsChanged");
      },
      getLocaleSettings: () => ({
        mode: 'single',
        focused: defaultLocale.code,
        active: [defaultLocale.code],
      }),
      getShowHiddenFields: () => false,
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      onShowHiddenFieldsChanged: () => () => {},
    },
    parameters: {
      invocation: {} as never, // wtf :D
      installation: {},
      instance: {
        getEntryUrl: (entryId: string) => {
          return `/spaces/${spaceId}/environment/${environmentId}/assets/${entryId}`;
        },
        getAssetUrl: (assetId: string) => {
          return `/spaces/${spaceId}/environment/${environmentId}/assets/${assetId}`;
        },
        ...(editorInterface?.controls?.find((control) => control.fieldId === field.id)?.settings ?? {}),
      },
    },
    window: {
      startAutoResizer: () => {
        // console.log("startAutoResizer");
      },
      stopAutoResizer: () => {
        // console.log("stopAutoResizer");
      },
      updateHeight: () => {
        // console.log("updateHeight");
      },
    },
    user: {
      ...user,
      spaceMembership: {
        admin: true,
        sys: spaceMembership?.sys,
        roles,
      },
    },
    locales: {
      available: locales.map((availableLocale) => availableLocale.code),
      default: defaultLocale.code,
      direction: locales.reduce((acc, availableLocale) => {
        return {
          ...acc,
          // Set them all to 'ltr' for now
          [availableLocale.code]: 'ltr',
        };
      }, {}),
      fallbacks: locales.reduce((acc, availableLocale) => {
        return {
          ...acc,
          [availableLocale.code]: availableLocale.fallbackCode,
        };
      }, {}),
      names: locales.reduce((acc, availableLocale) => {
        return {
          ...acc,
          [availableLocale.code]: availableLocale.name,
        };
      }, {}),
      optional: locales.reduce((acc, availableLocale) => {
        return {
          ...acc,
          [availableLocale.code]: availableLocale.optional,
        };
      }, {}),
    },
    access: {
      canEditAppConfig: async () => false,
      can: async () => {
        return true;
      },
    },
    cmaAdapter: {
      makeRequest: (opts) => {
        const entityType =
          opts.entityType === 'ScheduledAction'
            ? 'scheduledActions'
            : uncapitalizeFirstLetter(opts.entityType);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (client as any)[entityType][opts.action](opts.params);
      },
    },
    location: {
      is: (type: string) => type === 'entry-field',
    },
    navigator: {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      onSlideInNavigation: () => () => {},

      openAsset: async (assetId: string) => {
        const openedAsset = await openBlade<AssetProps>({
          entityId: assetId,
          entityType: 'asset',
          locale: locale.code,
        });

        return {
          navigated: true,
          entity: openedAsset,
          slide: {
            newSlideLevel: index,
            oldSlideLevel: index + 1,
          },
        };
      },
      openNewAsset: async () => {
        const newAsset = await createEmptyAsset();

        if (!newAsset) {
          return {
            navigated: false,
            entity: null,
          };
        }

        const openedAsset = await openBlade<AssetProps>({
          entityId: newAsset.sys.id,
          entityType: 'asset',
          locale: locale.code,
        });

        return {
          navigated: true,
          entity: openedAsset.data,
          slide: {
            newSlideLevel: index,
            oldSlideLevel: index + 1,
          },
        };
      },
      openEntry: async (entryId: string) => {
        const openedEntry = await openBlade<EntryProps>({
          entityId: entryId,
          entityType: 'entry',
          locale: locale.code,
        });

        return {
          navigated: true,
          entity: openedEntry.data,
          slide: {
            newSlideLevel: index,
            oldSlideLevel: index + 1,
          },
        };
      },
      openNewEntry: async (contentTypeId: string) => {
        const newEntry = await createEmptyEntry({
          contentType: contentTypes.find((c) => c.sys.id === contentTypeId)!,
        });

        if (!newEntry) {
          return {
            navigated: false,
            entity: null,
          };
        }

        const openedEntry = await openBlade<EntryProps>({
          entityId: newEntry.sys.id,
          entityType: 'entry',
          locale: locale.code,
        });

        return {
          navigated: true,
          entity: openedEntry.data,
          slide: {
            newSlideLevel: index,
            oldSlideLevel: index + 1,
          },
        };
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    notifier: {} as any,
    space: {
      getCachedContentTypes: () => contentTypes,
      getContentTypes: () =>
        Promise.resolve({
          items: [],
          limit: 0,
          skip: 0,
          total: 0,
          sys: {
            type: 'Array',
          },
        }),
      getEntries: async (query: QueryParams) => {
        return client.entry.getMany({ spaceId, environmentId, query });
      },
      getEntry: async (id: string) => {
        return client.entry.get({ spaceId, environmentId, entryId: id });
      },
      async getEntityScheduledActions() {
        return [];
      },
      onEntityChanged: (entityType: string, entityId: string, onChange: (data: unknown) => void) => {
        return () => {
          // Special hack until this issue is closed https://github.com/contentful/field-editors/issues/1808
          // When we mutate entries inside our app, we set updated/published entry in OUR query client cache, here we fetch it
          // and pass down so field editor can override its own React Query cache
          // @see https://github.com/contentful/field-editors/blob/master/packages/reference/src/common/EntityStore.tsx#L525
          const latestEntity = queryClient.getQueryData([entityType, entityId, spaceId, environmentId]);

          if (latestEntity) {
            onChange(latestEntity);
          }
        };
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  };

  return { fieldSdk };
};
