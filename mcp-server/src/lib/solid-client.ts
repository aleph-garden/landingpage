import { Session } from '@inrupt/solid-client-authn-node';
import { Parser, Store } from 'n3';
import { Config } from './config.js';

// Global session for Solid authentication
let solidSession: Session | null = null;
let config: Config | null = null;

/**
 * Set the global Solid session (primarily for testing)
 *
 * @param session - The Solid session to set, or null to clear
 */
export function setSolidSession(session: Session | null) {
  solidSession = session;
}

/**
 * Get the current Solid session
 *
 * @returns The current Solid session, or null if not initialized
 */
export function getSolidSession(): Session | null {
  return solidSession;
}

/**
 * Initialize a Solid session with authentication
 *
 * Creates a new Solid session and optionally authenticates with client credentials.
 * The session is stored globally for use by other operations.
 *
 * @param cfg - Configuration object containing Pod URL, WebID, and optional credentials
 * @returns Promise resolving to the initialized Session
 * @throws {Error} If authentication fails
 *
 * @example
 * ```ts
 * const session = await initializeSolidSession({
 *   podUrl: 'https://user.solidcommunity.net/',
 *   webId: 'https://user.solidcommunity.net/profile/card#me',
 *   clientId: 'my-app-id',
 *   clientSecret: 'my-app-secret'
 * });
 * ```
 */
export async function initializeSolidSession(cfg: Config): Promise<Session> {
  const session = new Session();

  if (cfg.clientId && cfg.clientSecret) {
    await session.login({
      clientId: cfg.clientId,
      clientSecret: cfg.clientSecret,
      oidcIssuer: cfg.oidcIssuer,
    });
  }

  solidSession = session;
  config = cfg;

  return session;
}

/**
 * Read RDF resource from a URL using authenticated Solid session
 *
 * Fetches an RDF resource (typically in Turtle format) from a Solid Pod.
 * Requires an initialized session via initializeSolidSession().
 *
 * @param url - The URL of the RDF resource to read
 * @returns Promise resolving to the RDF content as a string
 * @throws {Error} If session is not initialized
 * @throws {Error} If the fetch fails or returns a non-OK status
 *
 * @example
 * ```ts
 * const turtleContent = await readRdfResource(
 *   'https://user.solidcommunity.net/data/file.ttl'
 * );
 * ```
 */
export async function readRdfResource(url: string): Promise<string> {
  if (!solidSession) {
    throw new Error('Solid session not initialized');
  }

  const response = await solidSession.fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch RDF resource: ${response.statusText}`);
  }

  return response.text();
}

/**
 * Append RDF triples to a resource using SPARQL UPDATE
 *
 * Uses the Solid Protocol's PATCH method with SPARQL UPDATE to append triples
 * to an existing resource without replacing existing data.
 *
 * @param url - The URL of the RDF resource to modify
 * @param triples - Turtle-formatted triples to append (without prefixes)
 * @returns Promise that resolves when the operation completes
 * @throws {Error} If session is not initialized
 * @throws {Error} If the PATCH request fails
 *
 * @example
 * ```ts
 * await appendTriples(
 *   'https://user.solidcommunity.net/data/file.ttl',
 *   '<http://example.org/subject> <http://example.org/predicate> "value" .'
 * );
 * ```
 */
export async function appendTriples(url: string, triples: string): Promise<void> {
  if (!solidSession) {
    throw new Error('Solid session not initialized');
  }

  const sparqlUpdate = `INSERT DATA {\n${triples}\n}`;

  const response = await solidSession.fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/sparql-update',
    },
    body: sparqlUpdate,
  });

  if (!response.ok) {
    throw new Error(`Failed to append triples: ${response.statusText}`);
  }
}

/**
 * List resources in a Solid container
 *
 * Reads a container's RDF representation and extracts all contained resource URLs
 * using the ldp:contains predicate. Container URLs must end with '/'.
 *
 * @param containerUrl - The URL of the container (must end with '/')
 * @returns Promise resolving to an array of resource URLs
 * @throws {Error} If containerUrl doesn't end with '/'
 * @throws {Error} If session is not initialized or fetch fails
 *
 * @example
 * ```ts
 * const resources = await listContainer(
 *   'https://user.solidcommunity.net/public/'
 * );
 * // Returns: ['https://user.solidcommunity.net/public/file1.ttl', ...]
 * ```
 */
export async function listContainer(containerUrl: string): Promise<string[]> {
  if (!containerUrl.endsWith('/')) {
    throw new Error('Container URL must end with /');
  }

  const rdfContent = await readRdfResource(containerUrl);

  // Parse Turtle with N3.js
  const parser = new Parser();
  const store = new Store();
  const quads = parser.parse(rdfContent);
  store.addQuads(quads);

  // Find all ldp:contains predicates
  const containsQuads = store.getQuads(
    null,
    'http://www.w3.org/ns/ldp#contains',
    null,
    null
  );

  // Extract object URIs
  return containsQuads.map((quad) => quad.object.value);
}
