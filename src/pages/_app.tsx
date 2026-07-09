import type { AppProps } from 'next/app';
import { MeshApp, ObjectSearchProvider } from '@uniformdev/mesh-sdk-react';
import { IconsProvider } from '@uniformdev/design-system';
import '../styles/globals.css';
import { useRouter } from 'next/router';
import React from 'react';

const PAGE_WITHOUT_MESH_LOCATION = ['/_error', '/'];

const App = ({ Component, pageProps }: AppProps) => {
  const { pathname } = useRouter();

  if (PAGE_WITHOUT_MESH_LOCATION.includes(pathname)) {
    return <Component {...pageProps} />;
  }

  return (
    <MeshApp>
      <ObjectSearchProvider>
        <IconsProvider>
          <Component {...pageProps} />
        </IconsProvider>
      </ObjectSearchProvider>
    </MeshApp>
  );
};

export default App;
