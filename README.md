# Uniform Mesh Contentful

Contentful integration for Uniform DXP, built with the Uniform Mesh SDK.

## Features

- Browse and select Contentful entries and assets for Uniform Canvas parameters
- Query-based, single-entry, multiple-entry, entry-by-field and assets data archetypes
- Edgehancers that resolve and enrich Contentful data at the edge

## Installation

### Prerequisites

- A Uniform team and project
- A Contentful account and space
- Read the integration [documentation](https://docs.uniform.app/docs/integrations/content/contentful)

### Deploy Mesh Integration

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Funiform-collab%2Funiform-mesh-contentful&project-name=uniform-mesh-contentful&repository-name=uniform-mesh-contentful)

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

## Edgehancers

Edgehancer hooks live in [src/edgehancers](./src/edgehancers) and are bundled with `tsup`.

- Build: `npm run edgehancer:build`
- Test: `npm run test`
- Deploy all archetypes: `npm run edgehancer:deploy`

Deploying/removing edgehancers uses the Uniform CLI and requires `UNIFORM_API_KEY` and `UNIFORM_TEAM_ID` (see `.env.example`).
