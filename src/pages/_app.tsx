import type { AppProps } from 'next/app';
import { MeshApp, ObjectSearchProvider } from '@uniformdev/mesh-sdk-react';
import { IconsProvider } from '@uniformdev/design-system';
import '../styles/globals.css';
import { useRouter } from 'next/router';
import { SessionProvider } from 'next-auth/react';
import { AuthorizationOverlay } from '../components/embedded-editor-components/AuthorizationOverlay';
import { AuthProvider } from '../hooks';

const PAGE_WITHOUT_MESH_LOCATION = ['/_error', '/'];

const LOGIN_PAGE = '/login';
const LOGIN_CALLBACK_PAGE = '/login-callback';
const LOGIN_AWARE_PAGES = ['/embeddedEditor', '/dataResourceEmbeddedEditor'];

const App = ({ Component, pageProps }: AppProps) => {
  const { pathname } = useRouter();

  if (PAGE_WITHOUT_MESH_LOCATION.includes(pathname)) {
    return <Component {...pageProps} />;
  }

  if (pathname === LOGIN_PAGE || pathname === LOGIN_CALLBACK_PAGE) {
    return (
      <SessionProvider session={pageProps.session}>
        <Component {...pageProps} />
      </SessionProvider>
    );
  }

  if (LOGIN_AWARE_PAGES.includes(pathname)) {
    return (
      <MeshApp>
        <AuthProvider>
          <AuthorizationOverlay>
            <Component {...pageProps} />
          </AuthorizationOverlay>
        </AuthProvider>
      </MeshApp>
    );
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
