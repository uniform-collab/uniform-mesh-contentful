import {
  ContentTypeProps,
  createClient,
  EditorInterface,
  LocaleProps,
  PlainClientAPI,
  RoleProps,
  SpaceMembership,
  UserProps,
} from 'contentful-management';
import React, { useMemo } from 'react';
import { useContentfulMetadata, useEditorInterfaces } from './dataHooks';
import { Callout } from '@uniformdev/design-system';

export type ContentfulContextProps = {
  client: PlainClientAPI;
  user: UserProps;
  contentTypes: ContentTypeProps[];
  locales: LocaleProps[];
  defaultLocale: LocaleProps;
  editorInterfaces: EditorInterface[];
  spaceId: string;
  environmentId: string;
  spaceMemberships: SpaceMembership[];
  roles: RoleProps[];
  organizationId: string;
};

export const ContentfulContext = React.createContext<ContentfulContextProps>({
  user: {} as UserProps,
  client: {} as PlainClientAPI,
  contentTypes: [],
  locales: [],
  defaultLocale: {} as LocaleProps,
  editorInterfaces: [],
  spaceId: '',
  environmentId: '',
  spaceMemberships: [],
  roles: [],
  organizationId: '',
});

export const useContentfulContext = () => React.useContext(ContentfulContext);

export const ContentfulContextProvider = ({
  spaceId,
  environmentId,
  accessToken,
  children,
}: {
  spaceId: string;
  environmentId: string;
  accessToken: string;
  children: React.ReactNode;
}) => {
  const client = useMemo<PlainClientAPI>(
    () =>
      createClient(
        {
          accessToken,
          throttle: '70%',
        },
        {
          type: 'plain',
          defaults: {
            spaceId,
            environmentId,
          },
        }
      ),
    [accessToken, spaceId, environmentId]
  );

  const { data: metadata, isLoading } = useContentfulMetadata({ client, spaceId, environmentId });
  const { data: editorInterfaces, isLoading: editorInterfacesLoading } = useEditorInterfaces({
    client,
    spaceId,
    environmentId,
  });

  if (!spaceId) {
    return <Callout type="note" title="Please ask you administrator to re-save Contentful Data Source" />;
  }

  if (isLoading || editorInterfacesLoading) {
    return <div>Loading...</div>;
  }

  if (!metadata) {
    return <div>Metadata not found</div>;
  }

  return (
    <ContentfulContext.Provider
      value={{
        spaceId,
        environmentId,
        client,
        user: metadata.user,
        contentTypes: metadata.contentTypes,
        locales: metadata.locales,
        spaceMemberships: metadata.spaceMemberships,
        roles: metadata.roles,
        organizationId: metadata.organizationId,
        defaultLocale: metadata.locales.find((locale) => locale.default) as LocaleProps,
        editorInterfaces: editorInterfaces ?? [],
      }}
    >
      {children}
    </ContentfulContext.Provider>
  );
};
