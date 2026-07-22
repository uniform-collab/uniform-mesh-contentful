# Uniform Mesh Contentful (experimental: contextual editing)

Contentful integration for Uniform DXP, built with the Uniform Mesh SDK.

> This is the `experimental/contextual-editing` branch. In addition to the base
> integration it ships the embedded (contextual) editor: an in-context Contentful
> entry/asset editor, Contentful OAuth login, and asset uploads. It requires an
> HTTPS origin and NextAuth configuration (see below).

## Features

- Browse and select Contentful entries and assets for Uniform Canvas parameters
- Query-based, single-entry, multiple-entry, entry-by-field and assets data archetypes
- Edgehancers that resolve and enrich Contentful data at the edge
- Embedded contextual editor for Contentful entries and assets (OAuth-based)

## Installation

### Prerequisites

- A Uniform team and project
- A Contentful account and space
- Read the integration [documentation](https://docs.uniform.app/docs/integrations/content/contentful)

### Deploy Mesh Integration

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Funiform-collab%2Funiform-mesh-contentful&env=CONTENTFUL_OAUTH_CLIENT_ID,CONTENTFUL_OAUTH_CLIENT_SECRET,NEXTAUTH_SECRET&envDescription=see%20README%20for%20more%20info&project-name=uniform-mesh-contentful&repository-name=uniform-mesh-contentful)

The embedded editor requires the following environment variables:

- **CONTENTFUL_OAUTH_CLIENT_ID** / **CONTENTFUL_OAUTH_CLIENT_SECRET** - OAuth client created in your Contentful account settings
- **NEXTAUTH_URL** (optional) - the public HTTPS URL of the deployed app
- **NEXTAUTH_SECRET** - secret used by NextAuth to sign and encrypt JWT tokens and cookies

#### Manual deployment

1. Fork this repository (optional)
1. Create a Vercel project based on the repository

### Register Mesh Integration

1. Go to Uniform dashboard => Your team => Settings => Custom Integrations
1. Click `Add Integration` and copy-paste the manifest from `mesh-manifest.stable.json`
1. Replace `http://localhost:4046` in the manifest with the previously deployed Vercel site URL
1. Click `Save`

Manifest variants:

- Canary version: [mesh-manifest.canary.json](./mesh-manifest.canary.json)
- Stable version: [mesh-manifest.stable.json](./mesh-manifest.stable.json)
- Local version: [mesh-manifest.local.json](./mesh-manifest.local.json)

## Local development

To run the integration locally:

1. Install dependencies: `npm install`
1. Copy `.env.example` to `.env` and define the required environment variables
1. Start the development server: `npm run dev`
1. Register a custom integration for your team using the manifest from `mesh-manifest.local.json`

### Contentful OAuth application

Your local environment has a unique URL, so it needs a separate OAuth application in Contentful.

- Go to your account settings in Contentful and create a new OAuth client
- Use `${NEXTAUTH_URL}/login-callback` as the redirect URI (e.g. `https://localhost:4046/login-callback` for development)
- Put the Client Id and Client Secret in `CONTENTFUL_OAUTH_CLIENT_ID` and `CONTENTFUL_OAUTH_CLIENT_SECRET` in your `.env` file

### Feature flag

Enable the `contextual-editing` feature flag for your environment.

### How to open the embedded editor

- Create a Data Source of type `Contentful`
- Create a Data Type of type `Single Entry`
- Go to any composition and add the `Single Entry` Data Resource to the composition
- Within the Data Resource Editor you will see "Edit" and "Add new" buttons
- Both buttons open the embedded editor in a new tab that will require you to login first

## Edgehancers

Edgehancer hooks live in [src/edgehancers](./src/edgehancers) and are bundled with `tsup`.

- Build: `npm run edgehancer:build`
- Test: `npm run test`
- Deploy all archetypes: `npm run edgehancer:deploy`

Deploying/removing edgehancers uses the Uniform CLI and requires `UNIFORM_API_KEY` and `UNIFORM_TEAM_ID` (see `.env.example`).
