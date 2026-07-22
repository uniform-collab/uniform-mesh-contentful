import { LoadingOverlay } from '@uniformdev/mesh-sdk-react';
import { useEffect } from 'react';

export default function LoginCallback() {
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.hash.slice(1));
    const access_token = urlParams.get('access_token');
    const state = urlParams.get('state');

    // Contentful Oauth passes token as a part of URL hash, call next-auth endpoint with query params
    fetch(`/api/auth/callback/contentful?access_token=${access_token}&state=${state}`).then(() => {
      window.close();
    });
  }, []);

  return (
    <main>
      <LoadingOverlay isActive statusMessage="Authorizing...." />
    </main>
  );
}
