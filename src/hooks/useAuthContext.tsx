import { ReactNode, createContext, useContext, useMemo } from 'react';

import { useReadAuthState } from './useReadAuthState';

export type AuthContextValue = {
  status: 'loading' | 'error' | 'authenticated' | 'unauthenticated';
  accessToken: string | undefined;
  email?: string;
  refresh: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuthContext = (): AuthContextValue => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuthContext must be used within an AuthContextProvider');
  }

  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const auth = useReadAuthState();

  const value = useMemo<AuthContextValue>(() => {
    if (auth.loading) {
      return { status: 'loading', accessToken: undefined, refresh: auth.retry };
    }

    if (!auth.value) {
      return { status: 'error', accessToken: undefined, refresh: auth.retry };
    }

    return {
      status: auth.value.status,
      accessToken: auth.value.accessToken,
      email: auth.value.email,
      refresh: auth.retry,
    };
  }, [auth]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
