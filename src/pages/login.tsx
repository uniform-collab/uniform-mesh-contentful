import { LoadingOverlay } from '@uniformdev/mesh-sdk-react';
import { signIn } from 'next-auth/react';
import React, { useEffect } from 'react';

export default function Login() {
  useEffect(() => {
    signIn('contentful');
  }, []);

  return (
    <main>
      <LoadingOverlay isActive />
    </main>
  );
}
