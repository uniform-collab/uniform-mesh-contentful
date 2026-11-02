/**
 * Mints a client_id for a host that pre-registers OAuth clients instead of
 * using dynamic client registration.
 *
 * The bridge stores no registrations - a client_id *is* the sealed
 * registration - so this produces exactly what POST /oauth/register would
 * return, just ahead of time.
 *
 *   MCP_BRIDGE_SECRET=... npm run mint-client-id -- <redirect-uri> [more...]
 *
 * Run it with the same MCP_BRIDGE_SECRET as the deployment: the id is sealed
 * with a key derived from it, and rotating the secret invalidates every id
 * minted under the old one.
 */
import { PURPOSE, ClientRegistration } from '../src/mcp/bridge';
import { seal } from '../src/mcp/sealed';

const redirectUris = process.argv.slice(2).filter(Boolean);

if (!redirectUris.length) {
  process.stderr.write('Usage: npm run mint-client-id -- <redirect-uri> [more redirect-uris...]\n');
  process.exit(1);
}

const invalid = redirectUris.filter((uri) => {
  try {
    new URL(uri);
    return false;
  } catch {
    return true;
  }
});

if (invalid.length) {
  process.stderr.write(`Not valid absolute URLs: ${invalid.join(', ')}\n`);
  process.exit(1);
}

if (!process.env.MCP_BRIDGE_SECRET && process.env.NODE_ENV === 'production') {
  process.stderr.write('MCP_BRIDGE_SECRET must be set to mint an id usable in production.\n');
  process.exit(1);
}

const clientId = seal(PURPOSE.client, {
  redirect_uris: redirectUris,
  client_name: 'Pre-registered client',
} satisfies ClientRegistration);

process.stdout.write(`${clientId}\n`);
