import { useAsyncRetry } from 'react-use';
import pLimit from 'p-limit';

import { getSession } from 'next-auth/react';
import type { Session } from 'next-auth';

export type OAuthSession = Session & {
  tenant: string;
  accessToken: string;
};

export type AuthState =
  | {
      status: 'loading';
      accessToken: undefined;
      email: undefined;
    }
  | {
      status: 'unauthenticated';
      accessToken: undefined;
      email: undefined;
    }
  | {
      status: 'authenticated';
      accessToken: string;
      email: string;
    };

const limit = pLimit(1);

export function useReadAuthState(): ReturnType<typeof useAsyncRetry<AuthState>> {
  return useAsyncRetry<AuthState>(async () => {
    const session = await readSession();
    if (session?.accessToken) {
      return {
        status: 'authenticated',
        accessToken: session.accessToken,
        email: session.user?.email ?? '',
      };
    }

    return {
      status: 'unauthenticated',
    };
  }, []);
}

const readSession = async () => {
  // Avoid simultaneous calls to getSession
  const session = await limit(() => getSession());
  return session as OAuthSession | undefined;
};
