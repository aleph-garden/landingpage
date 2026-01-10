#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Session } from "@inrupt/solid-client-authn-node";
import {
  getSolidDataset,
  saveSolidDatasetAt,
  getThing,
  getStringNoLocale,
  setThing,
  createThing,
  buildThing,
  getUrl,
} from "@inrupt/solid-client";
import { Parser, Writer, Store, DataFactory, Quad } from "n3";

const { namedNode, literal, quad } = DataFactory;

/**
 * MCP Server for Solid Pod RDF Operations
 *
 * Provides tools for:
 * - SPARQL queries against Solid Pods
 * - Reading RDF resources
 * - Writing/appending triples
 * - Managing ontologies
 */

// Configuration schema
const ConfigSchema = z.object({
  podUrl: z.string().url(),
  webId: z.string().url(),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  oidcIssuer: z.string().url().default("https://solidcommunity.net"),
});

type Config = z.infer<typeof ConfigSchema>;

// Global session for Solid authentication
let solidSession: Session | null = null;
let config: Config | null = null;

/**
 * Initialize Solid session with authentication
 */
async function initializeSolidSession(cfg: Config): Promise<Session> {
  const session = new Session();

  if (cfg.clientId && cfg.clientSecret) {
    await session.login({
      clientId: cfg.clientId,
      clientSecret: cfg.clientSecret,
      oidcIssuer: cfg.oidcIssuer,
    });
  }

  return session;
}

/**
 * Execute SPARQL query over HTTP against a SPARQL endpoint
 */
async function executeSparqlQuery(
  endpointUrl: string,
  sparqlQuery: string,
  session: Session
): Promise<string> {
  try {
    // Prepare the SPARQL query request
    const params = new URLSearchParams();
    params.append('query', sparqlQuery);

    // Execute the query via HTTP POST
    const response = await session.fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/sparql-results+json',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error(`SPARQL query failed: ${response.status} ${response.statusText}`);
    }

    // Parse and return the SPARQL results
    const results = await response.json();
    return JSON.stringify(results, null, 2);
  } catch (error) {
    return JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Read RDF resource from Solid Pod
 */
async function readRdfResource(
  resourceUrl: string,
  session: Session
): Promise<string> {
  try {
    const response = await session.fetch(resourceUrl);
    const content = await response.text();

    return content;
  } catch (error) {
    throw new Error(
      `Failed to read resource: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Append triples to RDF resource using PATCH
 */
async function appendTriples(
  resourceUrl: string,
  turtleContent: string,
  session: Session
): Promise<string> {
  try {
    // Use Solid Protocol PATCH with N3 Patch
    const patchBody = `
@prefix solid: <http://www.w3.org/ns/solid/terms#>.
@prefix : <#>.

_:patch a solid:InsertDeletePatch;
  solid:inserts {
    ${turtleContent}
  }.
`;

    const response = await session.fetch(resourceUrl, {
      method: "PATCH",
      headers: {
        "Content-Type": "text/n3",
      },
      body: patchBody,
    });

    if (!response.ok) {
      throw new Error(`PATCH failed: ${response.status} ${response.statusText}`);
    }

    return JSON.stringify({
      success: true,
      message: `Successfully appended triples to ${resourceUrl}`,
    });
  } catch (error) {
    throw new Error(
      `Failed to append triples: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Execute simple triple pattern matching (simplified SPARQL)
 */
async function sparqlMatch(
  resourceUrl: string,
  subject: string | null,
  predicate: string | null,
  object: string | null,
  session: Session
): Promise<string> {
  try {
    const content = await readRdfResource(resourceUrl, session);
    const store = new Store();
    const parser = new Parser({ baseIRI: resourceUrl });

    return new Promise((resolve, reject) => {
      parser.parse(content, (error, quad, prefixes) => {
        if (error) {
          reject(error);
          return;
        }
        if (quad) {
          store.addQuad(quad);
        } else {
          // Parsing complete, execute match
          const matches = store.getQuads(
            subject ? namedNode(subject) : null,
            predicate ? namedNode(predicate) : null,
            object ? (object.startsWith("http") ? namedNode(object) : literal(object)) : null,
            null
          );

          const results = matches.map((q) => ({
            subject: q.subject.value,
            predicate: q.predicate.value,
            object: q.object.value,
          }));

          resolve(JSON.stringify(results, null, 2));
        }
      });
    });
  } catch (error) {
    throw new Error(
      `Failed to match triples: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * List resources in a Solid container
 */
async function listContainer(
  containerUrl: string,
  session: Session
): Promise<string> {
  try {
    const dataset = await getSolidDataset(containerUrl, {
      fetch: session.fetch,
    });

    const containerThing = getThing(dataset, containerUrl);
    if (!containerThing) {
      return JSON.stringify({ resources: [] });
    }

    // Get contained resources
    const contains = getUrl(
      containerThing,
      "http://www.w3.org/ns/ldp#contains"
    );

    return JSON.stringify({
      container: containerUrl,
      contains: contains || [],
    });
  } catch (error) {
    throw new Error(
      `Failed to list container: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Main MCP Server
 */
async function main() {
  const server = new Server({
    name: "aleph-wiki-solid",
    version: "0.1.0",
  });

  // Tool: Initialize Solid connection
  server.registerTool(
    "solid_init",
    {
      description: "Initialize connection to Solid Pod with authentication",
      inputSchema: {
        type: "object",
        properties: {
          podUrl: { type: "string", description: "Solid Pod URL" },
          webId: { type: "string", description: "User's WebID" },
          clientId: { type: "string", description: "OAuth client ID (optional)" },
          clientSecret: { type: "string", description: "OAuth client secret (optional)" },
          oidcIssuer: {
            type: "string",
            description: "OIDC issuer URL",
            default: "https://solidcommunity.net",
          },
        },
        required: ["podUrl", "webId"],
      },
    },
    async (params) => {
      try {
        config = ConfigSchema.parse(params);
        solidSession = await initializeSolidSession(config);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                message: "Solid session initialized",
                podUrl: config.podUrl,
              }),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: error instanceof Error ? error.message : "Failed to initialize",
              }),
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool: Read RDF resource
  server.registerTool(
    "rdf_read",
    {
      description: "Read RDF resource from Solid Pod in Turtle format",
      inputSchema: {
        type: "object",
        properties: {
          resourceUrl: {
            type: "string",
            description: "Full URL of the RDF resource to read",
          },
        },
        required: ["resourceUrl"],
      },
    },
    async (params) => {
      if (!solidSession) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "Not authenticated. Call solid_init first.",
              }),
            },
          ],
          isError: true,
        };
      }

      try {
        const content = await readRdfResource(
          params.resourceUrl as string,
          solidSession
        );

        return {
          content: [
            {
              type: "text",
              text: content,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: error instanceof Error ? error.message : "Read failed",
              }),
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool: Append triples
  server.registerTool(
    "rdf_append",
    {
      description: "Append RDF triples to a resource in Solid Pod using PATCH",
      inputSchema: {
        type: "object",
        properties: {
          resourceUrl: {
            type: "string",
            description: "Full URL of the RDF resource",
          },
          triples: {
            type: "string",
            description: "Turtle-formatted triples to append",
          },
        },
        required: ["resourceUrl", "triples"],
      },
    },
    async (params) => {
      if (!solidSession) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "Not authenticated. Call solid_init first.",
              }),
            },
          ],
          isError: true,
        };
      }

      try {
        const result = await appendTriples(
          params.resourceUrl as string,
          params.triples as string,
          solidSession
        );

        return {
          content: [
            {
              type: "text",
              text: result,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: error instanceof Error ? error.message : "Append failed",
              }),
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool: SPARQL pattern match
  server.registerTool(
    "sparql_match",
    {
      description:
        "Execute simple triple pattern matching (subject, predicate, object). Use null for wildcards.",
      inputSchema: {
        type: "object",
        properties: {
          resourceUrl: { type: "string", description: "RDF resource URL" },
          subject: {
            type: "string",
            description: "Subject IRI or null for wildcard",
            nullable: true,
          },
          predicate: {
            type: "string",
            description: "Predicate IRI or null for wildcard",
            nullable: true,
          },
          object: {
            type: "string",
            description: "Object IRI/literal or null for wildcard",
            nullable: true,
          },
        },
        required: ["resourceUrl"],
      },
    },
    async (params) => {
      if (!solidSession) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "Not authenticated. Call solid_init first.",
              }),
            },
          ],
          isError: true,
        };
      }

      try {
        const result = await sparqlMatch(
          params.resourceUrl as string,
          (params.subject as string) || null,
          (params.predicate as string) || null,
          (params.object as string) || null,
          solidSession
        );

        return {
          content: [
            {
              type: "text",
              text: result,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: error instanceof Error ? error.message : "Match failed",
              }),
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool: List container contents
  server.registerTool(
    "solid_list",
    {
      description: "List resources in a Solid container",
      inputSchema: {
        type: "object",
        properties: {
          containerUrl: {
            type: "string",
            description: "URL of the Solid container (must end with /)",
          },
        },
        required: ["containerUrl"],
      },
    },
    async (params) => {
      if (!solidSession) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "Not authenticated. Call solid_init first.",
              }),
            },
          ],
          isError: true,
        };
      }

      try {
        const result = await listContainer(
          params.containerUrl as string,
          solidSession
        );

        return {
          content: [
            {
              type: "text",
              text: result,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: error instanceof Error ? error.message : "List failed",
              }),
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool: Execute SPARQL query
  server.registerTool(
    "sparql_query",
    {
      description:
        "Execute a full SPARQL query against a SPARQL endpoint over HTTP. Supports SELECT, ASK, CONSTRUCT, and DESCRIBE queries.",
      inputSchema: {
        type: "object",
        properties: {
          endpointUrl: {
            type: "string",
            description: "URL of the SPARQL endpoint (e.g., http://localhost:3030/dataset/sparql)",
          },
          query: {
            type: "string",
            description: "SPARQL query string (SELECT, ASK, CONSTRUCT, or DESCRIBE)",
          },
        },
        required: ["endpointUrl", "query"],
      },
    },
    async (params) => {
      if (!solidSession) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "Not authenticated. Call solid_init first.",
              }),
            },
          ],
          isError: true,
        };
      }

      try {
        const result = await executeSparqlQuery(
          params.endpointUrl as string,
          params.query as string,
          solidSession
        );

        return {
          content: [
            {
              type: "text",
              text: result,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: error instanceof Error ? error.message : "Query failed",
              }),
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Start server on stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("Aleph.wiki Solid MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
