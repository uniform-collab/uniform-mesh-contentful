import NextAuth, { AuthOptions } from 'next-auth';
import { OAuthConfig } from 'next-auth/providers/oauth';
import { Collection, createClient } from 'contentful-management';

export type ContentfulAuthenticatedUser = {
  sys: {
    id: string;
  };
  firstName: string;
  lastNave: string;
  email: string;
  avatarUrl: string;
};

if (!process.env.CONTENTFUL_OAUTH_CLIENT_ID) {
  throw new Error('CONTENTFUL_OAUTH_CLIENT_ID is not set');
}
if (!process.env.CONTENTFUL_OAUTH_CLIENT_SECRET) {
  throw new Error('CONTENTFUL_OAUTH_CLIENT_SECRET is not set');
}

const SERVER_URL = getServerUrl();
// eslint-disable-next-line no-console
console.debug('SERVER_URL', SERVER_URL);

if (!SERVER_URL || !isValidUrl(SERVER_URL)) {
  throw new Error('SERVER_URL is not a valid URL');
}

const SERVER_DOMAIN = new URL(SERVER_URL).hostname;

export const OAuthContentfulProviderConfig: OAuthConfig<ContentfulAuthenticatedUser> = {
  id: 'contentful',
  name: 'Contentful',
  type: 'oauth',
  clientId: process.env.CONTENTFUL_OAUTH_CLIENT_ID,
  clientSecret: process.env.CONTENTFUL_OAUTH_CLIENT_SECRET,
  authorization: {
    url: 'https://be.contentful.com/oauth/authorize',
    params: {
      response_type: 'token',
      scope: 'content_management_manage',
      redirect_uri: `${SERVER_URL}/login-callback`,
    },
  },
  token: {
    url: 'https://api.contentful.com/users/me',
    async request(context) {
      const client = createClient(
        {
          accessToken: context.params.access_token as string,
        },
        { type: 'plain' }
      );

      const oauthToken = (await client.raw.get('/token')) as Collection<
        Record<string, any>,
        Record<string, any>
      > & { includes: any };

      return {
        tokens: {
          access_token: context.params.access_token as string,
          spaceMembership: oauthToken.includes.SpaceMembership,
        },
      };
    },
  },
  userinfo: {
    url: 'https://api.contentful.com/users/me',
    async request(context) {
      const res = await fetch('https://api.contentful.com/users/me', {
        headers: [
          ['Authorization', `Bearer ${context.tokens.access_token}`],
          ['Content-Type', 'application/json'],
        ],
      });
      const user = await res.json();

      return user as ContentfulAuthenticatedUser;
    },
  },
  profile: async (profile, token) => {
    return {
      id: profile.sys.id,
      firstName: profile.firstName,
      email: profile.email,
      image: profile.avatarUrl,
      token: token.access_token,
      spaceMembership: token.spaceMembership,
    };
  },
};

// We may use several integrations with next-auth
const COOKIE_PREFIX = 'uniform-contentful-';

export const authOptions: AuthOptions = {
  providers: [OAuthContentfulProviderConfig],
  cookies: {
    sessionToken: {
      name: `${COOKIE_PREFIX}next-auth.session-token`,
      options: {
        domain: SERVER_DOMAIN,
        path: '/',
        httpOnly: true,
        sameSite: 'none',
        secure: true,
      },
    },
    callbackUrl: {
      name: `${COOKIE_PREFIX}next-auth.callback-url`,
      options: {
        domain: SERVER_DOMAIN,
        path: '/',
        sameSite: 'none',
        secure: true,
      },
    },
    csrfToken: {
      name: `${COOKIE_PREFIX}next-auth.csrf-token`,
      options: {
        domain: SERVER_DOMAIN,
        path: '/',
        httpOnly: true,
        sameSite: 'none',
        secure: true,
      },
    },
  },
  callbacks: {
    async jwt({ token, account }) {
      // Persist the OAuth access_token and or the user id to the token right after signin
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      (session as unknown as Record<string, string>).accessToken = token.accessToken as string;

      return session;
    },
  },
};

export default NextAuth(authOptions);

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function getServerUrl(): string {
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL;
  }

  if (process.env.VERCEL) {
    if (process.env.VERCEL_ENV === 'production' && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
      return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
    }

    if (process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_BRANCH_URL) {
      return `https://${process.env.VERCEL_BRANCH_URL}`;
    }
  }

  return '';
}
