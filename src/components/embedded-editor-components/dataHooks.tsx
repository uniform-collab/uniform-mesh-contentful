import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AssetProps,
  Collection,
  ContentTypeProps,
  EditorInterface,
  EditorInterfaceProps,
  EntryProps,
  GetSpaceEnvironmentParams,
  PlainClientAPI,
  QueryParams,
  RoleProps,
  SpaceMembership,
  SpaceMembershipProps,
} from 'contentful-management';
import { useContentfulContext } from './ContentfulContext';
import { validationErrorsEmitter, ValidationErrorsEvents } from './validation/ValidationContext';
import { ValidationError } from '@contentful/app-sdk';

export const useContentfulMetadata = ({
  client,
  spaceId,
  environmentId,
}: {
  client: PlainClientAPI;
  spaceId: string;
  environmentId: string;
}) => {
  return useQuery({
    queryKey: ['contentful', 'metadata'],
    queryFn: async () => {
      const [space, environment, locales, user, contentTypes, token] = await Promise.all([
        client.space.get({ spaceId }),
        client.environment.get({ environmentId, spaceId }),
        client.locale.getMany({ spaceId, environmentId }),
        client.user.getCurrent(),
        client.contentType.getMany({ spaceId, environmentId }),
        client.raw.get<{
          includes: {
            Role: RoleProps[];
            SpaceMembership: SpaceMembershipProps[];
          };
        }>(`/token`),
      ]);

      const spaceMemberships = token.includes.SpaceMembership as SpaceMembership[];
      const roles = token.includes.Role as RoleProps[];
      const organizationId = space.sys.organization.sys.id;

      return {
        space,
        environment,
        user,
        locales: locales.items,
        contentTypes: contentTypes.items,
        spaceMemberships,
        roles,
        organizationId,
      };
    },
    staleTime: 60 * 1000, // 1 minute
  });
};

export const useContentfulEntry = (entryId: string) => {
  const { client, spaceId, environmentId } = useContentfulContext();
  // simulating query key from @contentful/field-editor-reference
  const queryKey = ['Entry', entryId, spaceId, environmentId];

  return useQuery({
    queryKey,
    queryFn: async () => {
      return client.entry.get({ spaceId, environmentId, entryId });
    },
    enabled: !!entryId,
  });
};

// @todo try to re-use hook from @contentful/field-references
export const useContentfulEntries = (query: GetSpaceEnvironmentParams & QueryParams, enabled = true) => {
  const { client, spaceId, environmentId } = useContentfulContext();

  return useQuery({
    queryKey: ['contentful', spaceId, environmentId, query],
    queryFn: async () => {
      return client.entry.getMany(query);
    },
    staleTime: 60 * 1000, // 1 minute
    enabled,
  });
};

export const createAssetQueryKey = (assetId: string, spaceId: string, environmentId: string) => [
  'Asset',
  assetId,
  spaceId,
  environmentId,
];

// Changing this? Also change constructInvalidateAssetsQueriesKey
export const createAssetsQueryKey = (
  query: GetSpaceEnvironmentParams & QueryParams,
  spaceId: string,
  environmentId: string
) => ['Assets', spaceId, environmentId, query];

export const constructInvalidateAssetsQueriesKey = (spaceId: string, environmentId: string) => [
  'Assets',
  spaceId,
  environmentId,
];

export const useContentfulAsset = (assetId: string) => {
  const { client, spaceId, environmentId } = useContentfulContext();
  const queryKey = createAssetQueryKey(assetId, spaceId, environmentId);

  return useQuery({
    queryKey,
    queryFn: async () => {
      return client.asset.get({ spaceId, environmentId, assetId });
    },
    staleTime: 60 * 1000, // 1 minute
  });
};

export const useContentfulAssets = (query: GetSpaceEnvironmentParams & QueryParams, enabled = true) => {
  const { client, spaceId, environmentId } = useContentfulContext();

  return useQuery({
    queryKey: createAssetsQueryKey(query, spaceId, environmentId),
    queryFn: async () => {
      return client.asset.getMany(query);
    },
    staleTime: 60 * 1000, // 1 minute
    enabled,
  });
};

export const useEditorInterfaces = ({
  client,
  spaceId,
  environmentId,
}: {
  client: PlainClientAPI;
  spaceId: string;
  environmentId: string;
}) => {
  return useQuery({
    queryKey: ['contentful', 'editorInterfaces'],
    queryFn: async () => {
      const response = (await client.raw.get(
        `/spaces/${spaceId}/environments/${environmentId}/editor_interfaces`
      )) as Collection<EditorInterface, EditorInterfaceProps>;

      return response.items;
    },
    refetchOnWindowFocus: false,
  });
};

export const useEntryMutations = () => {
  const { client, spaceId, environmentId } = useContentfulContext();
  const queryClient = useQueryClient();

  return {
    createEmptyEntry: async ({ contentType }: { contentType: ContentTypeProps }) => {
      try {
        const entry = await client.entry.create(
          { spaceId, environmentId, contentTypeId: contentType.sys.id },
          { fields: {} }
        );

        return entry;
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Contentful createEmptyEntry failed: ', e);
      }
    },
    updateEntry: async ({ entryId, entry }: { entryId: string; entry: EntryProps }) => {
      try {
        const updatedEntry = await client.entry.update({ spaceId, environmentId, entryId }, entry);
        // @todo I think we need to properly wrap with react-query mutation with optimistic updates, invalidation, etc
        queryClient.setQueryData(['Entry', entryId, spaceId, environmentId], updatedEntry);
        return updatedEntry;
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Contentful updateEntry failed: ', { e });
        throw new Error(e.message);
      }
    },

    publishEntry: async ({ entryId, entry }: { entryId: string; entry: EntryProps }) => {
      try {
        const publishedEntry = await client.entry.publish({ spaceId, environmentId, entryId }, entry);
        // @todo I think we need to properly wrap with react-query mutation with optimistic updates, invalidation, etc
        queryClient.setQueryData(['Entry', entryId, spaceId, environmentId], publishedEntry);
        return publishedEntry;
      } catch (e) {
        // @todo this really needs some unit tests
        let reason = 'unknown';
        let handledAsValidation = false;
        try {
          const contentfulError = JSON.parse(e.message);
          const errors = contentfulError.details?.errors ?? [];
          const fieldErrors = errors.filter((error: ValidationError) => error.path.length > 1);
          // @todo which kind of other errors are there?
          // const otherErrors = errors.filter((error: { details: string; path: string[]; name: string}) => error.path.length < 2);
          const errorsPerField: { [key: string]: ValidationErrorsEvents['errorsChanged'] } =
            fieldErrors.reduce(
              (acc: { [key: string]: ValidationErrorsEvents['errorsChanged'] }, error: ValidationError) => {
                const fieldId = error.path[1];
                const localeCode = error.path[2];

                if (!acc[fieldId]) {
                  acc[fieldId] = {
                    entryId,
                    fieldId,
                    localeCode,
                    errors: [],
                  };
                }

                if (error.name === 'prohibitRegexp' || error.name === 'regexp') {
                  // Contentful hides actual regexp from error message, so we need to construct same custom message here
                  error.message = 'Input does not match the expected format. Please edit and try again.';
                } else if (error.details) {
                  // UI component expectes .message to render error message, while API returns only .details
                  error.message = error.details;
                } else if (error.name === 'in' && 'expected' in error) {
                  // Allowed Values validation error does not contain .details, so we need to construct message here
                  error.message = `Must be one of ${error.expected!.join(
                    ', '
                  )}. Any invalid options need to be removed.`;
                }

                acc[fieldId].errors.push(error);

                return acc;
              },
              {}
            );

          Object.values(errorsPerField).forEach((errorEvent) => {
            validationErrorsEmitter.emit('errorsChanged', errorEvent);
          });

          reason = contentfulError.message;
          handledAsValidation = true;
        } catch (parseError) {
          // eslint-disable-next-line no-console
          console.warn('Failed to parse contentful error', { parseError });
        }
        // A parsed Contentful validation error is an expected outcome (e.g. a non-unique
        // value) that is surfaced to the user via the validation emitter and the thrown
        // reason below. Logging the raw Error here would make Next.js dev tooling elevate
        // it to a fatal "Runtime" error overlay, so only console.error genuinely
        // unexpected failures.
        if (!handledAsValidation) {
          // eslint-disable-next-line no-console
          console.error('Contentful publishEntry failed: ', e);
        }
        throw new Error(reason);
      }
    },
  };
};

export const useAssetMutations = () => {
  const { client, spaceId, environmentId } = useContentfulContext();
  const queryClient = useQueryClient();

  return {
    createEmptyAsset: async () => {
      const asset = await client.asset.create(
        { spaceId, environmentId },
        { fields: { title: {}, file: {} } }
      );
      return asset;
    },
    updateAsset: async ({ assetId, asset }: { assetId: string; asset: AssetProps }) => {
      const updatedAsset = await client.asset.update({ spaceId, environmentId, assetId }, asset);

      queryClient.setQueryData(createAssetQueryKey(assetId, spaceId, environmentId), updatedAsset);

      return updatedAsset;
    },
    publishAsset: async ({ assetId, asset }: { assetId: string; asset: AssetProps }) => {
      const publishedAsset = await client.asset.publish({ spaceId, environmentId, assetId }, asset);

      queryClient.setQueryData(createAssetQueryKey(assetId, spaceId, environmentId), publishedAsset);

      return publishedAsset;
    },
  };
};
