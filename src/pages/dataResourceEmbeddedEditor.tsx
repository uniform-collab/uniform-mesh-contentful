import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ContentfulContextProvider } from '../components/embedded-editor-components/ContentfulContext';
import { useContentfulEntry } from '../components/embedded-editor-components/dataHooks';
import { useMeshLocation } from '@uniformdev/mesh-sdk-react';
import { LazyContentfulEditor } from './embeddedEditor';
import { GlobalStyles } from '@contentful/f36-components';
import { useAuthContext } from '../hooks';

const queryClient = new QueryClient();

const EmbeddedEditor = () => {
  const { metadata, value } = useMeshLocation('dataResource');
  const { dialogContext } = useMeshLocation('dataResource');
  const { actionType, variables } = dialogContext?.params as {
    actionType: string;
    variables: { entryIds: string };
  };
  const entryId = actionType === 'edit' ? variables.entryIds : '';
  const { data: entry, isLoading } = useContentfulEntry(entryId);
  if (isLoading && entryId) {
    return <div>Loading...</div>;
  }

  return <LazyContentfulEditor entry={entry} dataType={metadata.dataType} variables={value} />;
};

const DataResourceEmbeddedEditor = () => {
  const { metadata } = useMeshLocation('dataResource');
  const { accessToken } = useAuthContext();

  return (
    <QueryClientProvider client={queryClient}>
      <ContentfulContextProvider
        spaceId={metadata.dataSource.customPublic!.spaceId as string}
        environmentId={metadata.dataSource.customPublic!.environmentId as string}
        accessToken={accessToken ?? ''}
      >
        <GlobalStyles />
        <EmbeddedEditor />
      </ContentfulContextProvider>
    </QueryClientProvider>
  );
};

export default DataResourceEmbeddedEditor;
