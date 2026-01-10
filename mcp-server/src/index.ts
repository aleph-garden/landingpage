#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { Parser, Store } from "n3";
import { QueryEngine } from "@comunica/query-sparql";
import { Config } from "./lib/config.js";
import {
  setSolidSession,
  getSolidSession,
  initializeSolidSession,
  readRdfResource,
  appendTriples,
  listContainer,
} from "./lib/solid-client.js";

/**
 * MCP Server for Solid Pod RDF Operations
 *
 * Provides tools for:
 * - SPARQL queries against Solid Pods
 * - Reading RDF resources
 * - Writing/appending triples
 * - Managing ontologies
 */

// Re-export for backward compatibility
export type { Config };
export {
  setSolidSession,
  initializeSolidSession,
  readRdfResource,
  appendTriples,
  listContainer,
};

/**
 * Match RDF triples using pattern matching
 *
 * Performs simple triple pattern matching on an RDF resource using N3.js Store.
 * Null or undefined parameters act as wildcards matching any value.
 *
 * @param url - The URL of the RDF resource to query
 * @param subject - Subject URI to match, or null/undefined for wildcard
 * @param predicate - Predicate URI to match, or null/undefined for wildcard
 * @param object - Object URI/literal to match, or null/undefined for wildcard
 * @returns Promise resolving to array of matched triples
 * @throws {Error} If session is not initialized or resource fetch fails
 *
 * @example
 * ```ts
 * // Find all SKOS Concepts
 * const concepts = await sparqlMatch(
 *   'https://example.com/data.ttl',
 *   null,
 *   'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
 *   'http://www.w3.org/2004/02/skos/core#Concept'
 * );
 * ```
 */
export async function sparqlMatch(
  url: string,
  subject?: string | null,
  predicate?: string | null,
  object?: string | null
): Promise<Array<{ subject: string; predicate: string; object: string }>> {
  // Read RDF resource
  const rdfContent = await readRdfResource(url);

  // Parse Turtle with N3.js
  const parser = new Parser();
  const store = new Store();
  const quads = parser.parse(rdfContent);
  store.addQuads(quads);

  // Use store.getQuads() for pattern matching (null = wildcard)
  const matches = store.getQuads(
    subject || null,
    predicate || null,
    object || null,
    null
  );

  // Convert quads to JSON array
  return matches.map((quad) => ({
    subject: quad.subject.value,
    predicate: quad.predicate.value,
    object: quad.object.value,
  }));
}

// Create a singleton QueryEngine instance
let queryEngine: QueryEngine | null = null;

/**
 * Get or create the singleton Comunica QueryEngine instance
 *
 * @returns The QueryEngine instance for executing SPARQL queries
 */
function getQueryEngine(): QueryEngine {
  if (!queryEngine) {
    queryEngine = new QueryEngine();
  }
  return queryEngine;
}

/**
 * Execute a full SPARQL query using Comunica QueryEngine
 *
 * Supports SELECT, CONSTRUCT, and ASK query types with automatic result formatting:
 * - SELECT: Returns SPARQL JSON results format
 * - CONSTRUCT: Returns Turtle format with common prefixes
 * - ASK: Returns JSON with boolean result
 *
 * @param url - The URL of the RDF resource to query
 * @param query - The SPARQL query string
 * @returns Promise resolving to formatted query results
 * @throws {Error} If session is not initialized
 * @throws {Error} If query execution fails
 *
 * @example
 * ```ts
 * // SELECT query
 * const results = await executeSparqlQuery(
 *   'https://example.com/data.ttl',
 *   'SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 10'
 * );
 *
 * // ASK query
 * const exists = await executeSparqlQuery(
 *   'https://example.com/data.ttl',
 *   'ASK { ?s a <http://example.org/Type> }'
 * );
 * ```
 */
export async function executeSparqlQuery(url: string, query: string): Promise<string> {
  const session = getSolidSession();
  if (!session) {
    throw new Error("Solid session not initialized");
  }

  const engine = getQueryEngine();

  // Execute query with authenticated fetch
  const result = await engine.query(query, {
    sources: [url],
    fetch: session.fetch,
    httpCacheDisabled: true,
  });

  // Detect query type and format output accordingly
  if (result.resultType === 'bindings') {
    // SELECT query - return SPARQL JSON results
    const bindingsStream = await result.execute();
    const bindingsArray = await bindingsStream.toArray();

    const vars = bindingsArray.length > 0
      ? Array.from(bindingsArray[0].keys()).map((key: any) => key.value)
      : [];

    return JSON.stringify({
      head: { vars },
      results: {
        bindings: bindingsArray.map((binding) => {
          const obj: any = {};
          binding.forEach((value, key) => {
            obj[key.value] = {
              type: value.termType === 'NamedNode' ? 'uri' : 'literal',
              value: value.value,
              ...(value.language && { 'xml:lang': value.language }),
            };
          });
          return obj;
        }),
      },
    });
  } else if (result.resultType === 'quads') {
    // CONSTRUCT query - return Turtle format
    const quadsStream = await result.execute();
    const quadsArray = await quadsStream.toArray();

    // Convert quads to Turtle format
    const store = new Store(quadsArray);
    const { Writer } = await import('n3');
    const writer = new Writer({
      format: 'text/turtle',
      prefixes: {
        skos: 'http://www.w3.org/2004/02/skos/core#',
        schema: 'http://schema.org/',
      },
    });

    return new Promise((resolve, reject) => {
      writer.addQuads(store.getQuads(null, null, null, null));
      writer.end((error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
  } else if (result.resultType === 'boolean') {
    // ASK query - return boolean JSON
    const booleanResult = await result.execute();
    return JSON.stringify({ boolean: booleanResult });
  }

  throw new Error(`Unsupported query result type: ${result.resultType}`);
}

/**
 * Register all MCP tools on the server
 *
 * Registers the following tools for Solid Pod operations:
 * - solid_init: Initialize Solid session with authentication
 * - rdf_read: Read RDF resources from Solid Pods
 * - rdf_append: Append RDF triples to resources
 * - sparql_match: Pattern matching for RDF triples
 * - sparql_query: Execute full SPARQL queries
 * - solid_list: List resources in Solid containers
 *
 * @param server - The MCP Server instance to register tools on
 */
export function registerTools(server: Server) {
  const tools = [
    {
      name: "solid_init",
      description: "Initialize Solid Pod session with authentication",
      inputSchema: {
        type: "object",
        properties: {
          podUrl: {
            type: "string",
            description: "URL of the Solid Pod",
          },
          webId: {
            type: "string",
            description: "WebID of the user",
          },
        },
        required: ["podUrl", "webId"],
      },
    },
    {
      name: "rdf_read",
      description: "Read RDF resource from a Solid Pod URL",
      inputSchema: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "URL of the RDF resource to read",
          },
        },
        required: ["url"],
      },
    },
    {
      name: "rdf_append",
      description: "Append RDF triples to a Solid Pod resource using SPARQL UPDATE",
      inputSchema: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "URL of the RDF resource to append to",
          },
          triples: {
            type: "string",
            description: "RDF triples to append in Turtle format",
          },
        },
        required: ["url", "triples"],
      },
    },
    {
      name: "sparql_match",
      description: "Match RDF triples using pattern matching with wildcards",
      inputSchema: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "URL of the RDF resource to query",
          },
          subject: {
            type: "string",
            description: "Subject URI to match (optional, null for wildcard)",
          },
          predicate: {
            type: "string",
            description: "Predicate URI to match (optional, null for wildcard)",
          },
          object: {
            type: "string",
            description: "Object URI or literal to match (optional, null for wildcard)",
          },
        },
        required: ["url"],
      },
    },
    {
      name: "sparql_query",
      description: "Execute SPARQL query against a Solid Pod resource using Comunica",
      inputSchema: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "URL of the RDF resource to query",
          },
          query: {
            type: "string",
            description: "SPARQL query to execute (SELECT, CONSTRUCT, or ASK)",
          },
        },
        required: ["url", "query"],
      },
    },
    {
      name: "solid_list",
      description: "List resources in a Solid container",
      inputSchema: {
        type: "object",
        properties: {
          containerUrl: {
            type: "string",
            description: "URL of the container to list (must end with /)",
          },
        },
        required: ["containerUrl"],
      },
    },
  ];

  server.setRequestHandler(
    ListToolsRequestSchema,
    async () => ({ tools })
  );

  server.setRequestHandler(
    CallToolRequestSchema,
    async (request) => {
      if (request.params.name === "solid_init") {
        const { podUrl, webId } = request.params.arguments as any;
        await initializeSolidSession({ podUrl, webId });
        return {
          content: [
            {
              type: "text",
              text: `Initialized Solid session for ${webId} at ${podUrl}`,
            },
          ],
        };
      }

      if (request.params.name === "rdf_read") {
        const { url } = request.params.arguments as any;
        const rdfContent = await readRdfResource(url);
        return {
          content: [
            {
              type: "text",
              text: rdfContent,
            },
          ],
        };
      }

      if (request.params.name === "rdf_append") {
        const { url, triples } = request.params.arguments as any;
        await appendTriples(url, triples);
        return {
          content: [
            {
              type: "text",
              text: `Successfully appended triples to ${url}`,
            },
          ],
        };
      }

      if (request.params.name === "sparql_match") {
        const { url, subject, predicate, object } = request.params.arguments as any;
        const matches = await sparqlMatch(url, subject, predicate, object);

        if (matches.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No matches found (0 triples)",
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(matches, null, 2),
            },
          ],
        };
      }

      if (request.params.name === "sparql_query") {
        const { url, query } = request.params.arguments as any;
        const result = await executeSparqlQuery(url, query);
        return {
          content: [
            {
              type: "text",
              text: result,
            },
          ],
        };
      }

      if (request.params.name === "solid_list") {
        const { containerUrl } = request.params.arguments as any;
        const resources = await listContainer(containerUrl);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(resources),
            },
          ],
        };
      }

      throw new Error(`Unknown tool: ${request.params.name}`);
    }
  );
}

/**
 * Main MCP Server
 */
async function main() {
  const server = new Server({
    name: "aleph-wiki-solid",
    version: "0.1.0",
  });

  // Register tools
  registerTools(server);

  // Start server on stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("Aleph.wiki Solid MCP Server running on stdio");
}

// Only run main when executed directly (not when imported)
if (import.meta.main) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
