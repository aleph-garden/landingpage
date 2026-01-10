import { vi } from 'vitest';

/**
 * Mock Solid Session for testing
 */
export const createMockSession = () => {
  const mockFetch = vi.fn();

  return {
    login: vi.fn(),
    logout: vi.fn(),
    fetch: mockFetch,
    info: {
      isLoggedIn: true,
      webId: 'https://test.solidcommunity.net/profile/card#me',
      sessionId: 'test-session-id',
    },
  };
};

/**
 * Mock fetch response helper
 */
export const mockFetchResponse = (data: any, status = 200, contentType = 'text/turtle') => {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: {
      get: (name: string) => {
        if (name.toLowerCase() === 'content-type') {
          return contentType;
        }
        return null;
      },
    },
    text: () => Promise.resolve(typeof data === 'string' ? data : JSON.stringify(data)),
    json: () => Promise.resolve(typeof data === 'string' ? JSON.parse(data) : data),
  } as Response);
};

/**
 * Sample RDF data in Turtle format
 */
export const sampleTurtleData = `
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
@prefix schema: <http://schema.org/> .
@prefix : <http://aleph-wiki.local/concept/> .

:test-concept a skos:Concept ;
    skos:prefLabel "Test Concept"@en ;
    skos:definition "A concept for testing"@en ;
    schema:dateCreated "2026-01-10T00:00:00Z"^^<http://www.w3.org/2001/XMLSchema#dateTime> .

:another-concept a skos:Concept ;
    skos:prefLabel "Another Concept"@en ;
    skos:related :test-concept .
`.trim();

/**
 * Sample SPARQL results
 */
export const sampleSparqlResults = {
  head: {
    vars: ['subject', 'predicate', 'object'],
  },
  results: {
    bindings: [
      {
        subject: { type: 'uri', value: 'http://aleph-wiki.local/concept/test-concept' },
        predicate: { type: 'uri', value: 'http://www.w3.org/2004/02/skos/core#prefLabel' },
        object: { type: 'literal', value: 'Test Concept', 'xml:lang': 'en' },
      },
    ],
  },
};

/**
 * Mock MCP server request helper
 */
export const createMockRequest = (toolName: string, params: Record<string, any>) => {
  return {
    method: 'tools/call',
    params: {
      name: toolName,
      arguments: params,
    },
  };
};
