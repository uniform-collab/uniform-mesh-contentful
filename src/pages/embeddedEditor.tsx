import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { EntryProps } from 'contentful-management';
import { DataType } from '@uniformdev/canvas';
import { GlobalStyles } from '@contentful/f36-components';

import lazy from 'next/dynamic';
import { ContentfulContextProvider } from '../components/embedded-editor-components/ContentfulContext';
import { useContentfulEntry } from '../components/embedded-editor-components/dataHooks';
import { LoadingOverlay, useMeshLocation } from '@uniformdev/mesh-sdk-react';
import { useAuthContext } from '../hooks';

export type ContentfulEditorProps = {
  entry: EntryProps | undefined;
  dataType: DataType;
  variables: Record<string, unknown>;
};

// Has to be lazy loaded to avoid SSR issues with nested dependencies of Contentful UI widgets
export const LazyContentfulEditor = lazy<ContentfulEditorProps>(
  () => import('../components/embedded-editor-components/EntryEditor'),
  {
    ssr: false,
    loading: () => <LoadingOverlay isActive />,
  }
);

export const queryClient = new QueryClient();
const emptyVariables = {};

const EmbeddedEditor = ({ entryId }: { entryId: string }) => {
  const { value, metadata } = useMeshLocation('embeddedEditor');
  const { data: entry, isLoading } = useContentfulEntry(entryId);

  if (isLoading && !!entryId) {
    return <LoadingOverlay isActive />;
  }

  return (
    <LazyContentfulEditor
      entry={entry}
      dataType={metadata.dataType}
      variables={value.dataResourceVariables ?? emptyVariables}
    />
  );
};

const EmbeddedEditorWrapper = () => {
  const { value, metadata } = useMeshLocation('embeddedEditor');
  const { accessToken } = useAuthContext();
  const entryId = metadata.actionType === 'edit' ? value.dataResourceVariables?.entryIds : '';

  return (
    <QueryClientProvider client={queryClient}>
      <GlobalStyles />
      <ContentfulContextProvider
        spaceId={metadata.dataSource.customPublic!.spaceId as string}
        environmentId={metadata.dataSource.customPublic!.environmentId as string}
        accessToken={accessToken ?? ''}
      >
        <EmbeddedEditor entryId={entryId!} />
      </ContentfulContextProvider>
    </QueryClientProvider>
  );
};

export default EmbeddedEditorWrapper;
