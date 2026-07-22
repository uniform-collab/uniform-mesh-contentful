import { signOut } from 'next-auth/react';
import { Callout, HorizontalRhythm, LoadingOverlay, VerticalRhythm } from '@uniformdev/design-system';
import { PropsWithChildren, useEffect, useRef, useState } from 'react';
import { Paragraph, Button, Heading } from '@contentful/f36-components';
import * as styles from './embedded-editor-component.styles';
import { useEffectOnce } from 'react-use';
import { useAuthContext } from '../../hooks';

export const AuthorizationOverlay = ({ children }: PropsWithChildren) => {
  const { status, refresh } = useAuthContext();

  const [hasStorageAccess, setHasStorageAccess] = useState<boolean | undefined>(undefined);

  // Self-hosted integration requires third-party cookies to be allowed to store `next-auth` cookies
  useEffectOnce(() => {
    const hostname = window.location.hostname;
    if (hostname === 'uniform.app' || hostname.endsWith('.uniform.app')) {
      setHasStorageAccess(true);
    } else {
      document.hasStorageAccess().then((value) => setHasStorageAccess(value));
    }
  });

  if (status === 'loading' || hasStorageAccess === undefined) {
    return (
      <Delayed delayMs={500}>
        <LoadingOverlay isActive />
      </Delayed>
    );
  }

  if (!hasStorageAccess) {
    return (
      <Callout type="caution">Self-hosted integration requires third-party cookies to be allowed</Callout>
    );
  }

  if (status === 'error') {
    return <Callout type="error">Authentication could not be resolved.</Callout>;
  }

  if (status === 'unauthenticated') {
    return (
      <VerticalRhythm gap="base" justify="center" align="center" css={styles.AuthorizationOverlay}>
        <VerticalRhythm gap="0" css={styles.AuthirozationOverlayContainer}>
          <Heading>Authentication required</Heading>
          <Paragraph>You need to log in to Contentful to proceed.</Paragraph>
          <LoginButton onLoggedIn={refresh} />
        </VerticalRhythm>
      </VerticalRhythm>
    );
  }

  return <>{children}</>;
};

export function LoginButton({ onLoggedIn }: { onLoggedIn: () => void }) {
  const popup = useRef<Window | null>(null);
  const [waitingForAuth, setWaitingForAuth] = useState(false);

  useEffect(() => {
    if (!waitingForAuth) {
      return;
    }

    const abortController = new AbortController();

    // Contentful OAuth app includes `Cross-Origin-Opener-Policy: same-origin` header, so we can't access `window.opener` during the cross-origin OAuth flows.
    // Use `focus` instead of `postMessage` from the popup.
    addEventListener(
      'focus',
      () => {
        if (waitingForAuth && popup.current?.closed && document.visibilityState === 'visible') {
          setWaitingForAuth(false);
          onLoggedIn();
        }
      },
      { signal: abortController.signal }
    );

    return () => abortController.abort();
  }, [waitingForAuth, onLoggedIn]);

  return (
    <Button
      variant="primary"
      isFullWidth
      onClick={async () => {
        // explicitly sign-out to ensure we don't have an active session
        // otherwise `/login` page will be closed immediately
        await signOut({ redirect: false });

        const tokenUri = `${location.origin}/login`;
        const width = 600;
        const height = 800;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height;

        popup.current = window.open(
          tokenUri,
          'ContentfulLogin',
          `toolbar=no, menubar=no, scrollbars=on, width=${width}, height=${height}, top=${top}, left=${left}`
        );

        setWaitingForAuth(true);
      }}
    >
      Login
    </Button>
  );
}

export function LogoutButton() {
  const { status, refresh } = useAuthContext();

  return status === 'authenticated' ? (
    <HorizontalRhythm gap="sm" justify="flex-start" align="center">
      {/* <span>{email || ''}</span> */}
      <Button
        variant="negative"
        size="small"
        onClick={async () => {
          await signOut({ redirect: false });
          refresh();
        }}
        style={{ outline: 'unset', padding: 'var(--spacing-sm)' }}
      >
        Logout
      </Button>
    </HorizontalRhythm>
  ) : null;
}

function Delayed({ delayMs, children }: { delayMs: number; children: React.ReactNode }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  return <>{show ? children : null}</>;
}
