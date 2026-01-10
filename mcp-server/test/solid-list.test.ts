import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { registerTools, setSolidSession } from '../src/index.js';
import { createMockSession, mockFetchResponse } from './mocks.js';

/**
 * Sample container RDF data in Turtle format
 * Shows a container with ldp:contains relationships
 */
const sampleContainerData = `
@prefix ldp: <http://www.w3.org/ns/ldp#> .
@prefix dcterms: <http://purl.org/dc/terms/> .

<https://test.solidcommunity.net/concepts/>
  a ldp:BasicContainer ;
  ldp:contains <https://test.solidcommunity.net/concepts/concept1.ttl> ;
  ldp:contains <https://test.solidcommunity.net/concepts/concept2.ttl> ;
  ldp:contains <https://test.solidcommunity.net/concepts/nested/> ;
  dcterms:modified "2026-01-10T00:00:00Z"^^<http://www.w3.org/2001/XMLSchema#dateTime> .
`.trim();

/**
 * Empty container RDF data
 */
const emptyContainerData = `
@prefix ldp: <http://www.w3.org/ns/ldp#> .

<https://test.solidcommunity.net/empty/>
  a ldp:BasicContainer .
`.trim();

describe('solid_list MCP tool', () => {
  let server: Server;
  let listToolsHandler: any;
  let callToolHandler: any;

  /**
   * Reusable setup function to create server and register tools
   */
  function setupServerWithTools() {
    const testServer = new Server(
      {
        name: 'aleph-wiki-solid',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Capture the handlers that registerTools sets
    let listHandler: any = null;
    let callHandler: any = null;
    const originalSetRequestHandler = testServer.setRequestHandler.bind(testServer);
    testServer.setRequestHandler = ((schema: any, handler: any) => {
      if (schema === ListToolsRequestSchema) {
        listHandler = handler;
      } else if (schema === CallToolRequestSchema) {
        callHandler = handler;
      }
      return originalSetRequestHandler(schema, handler);
    }) as any;

    // Register tools
    registerTools(testServer);

    return { testServer, listHandler, callHandler };
  }

  beforeEach(() => {
    const setup = setupServerWithTools();
    server = setup.testServer;
    listToolsHandler = setup.listHandler;
    callToolHandler = setup.callHandler;
  });

  it('should register solid_list tool with correct name', async () => {
    const listResponse = await listToolsHandler();
    const solidListTool = listResponse.tools.find((t: any) => t.name === 'solid_list');

    expect(solidListTool).toBeDefined();
    expect(solidListTool.name).toBe('solid_list');
  });

  it('should have proper schema with containerUrl parameter', async () => {
    const listResponse = await listToolsHandler();
    const solidListTool = listResponse.tools.find((t: any) => t.name === 'solid_list');

    expect(solidListTool).toBeDefined();
    expect(solidListTool.inputSchema.type).toBe('object');
    expect(solidListTool.inputSchema.properties).toHaveProperty('containerUrl');
    expect(solidListTool.inputSchema.required).toContain('containerUrl');
    expect(solidListTool.inputSchema.properties.containerUrl.type).toBe('string');
    expect(solidListTool.inputSchema.properties.containerUrl.description).toBeDefined();
  });

  it('should list resources in a container', async () => {
    // Mock session with fetch behavior returning container data
    const mockSession = createMockSession();
    mockSession.fetch.mockReturnValue(
      mockFetchResponse(sampleContainerData, 200, 'text/turtle')
    );

    // Inject the mock session
    setSolidSession(mockSession as any);

    // Call the solid_list tool
    const callResponse = await callToolHandler({
      params: {
        name: 'solid_list',
        arguments: {
          containerUrl: 'https://test.solidcommunity.net/concepts/',
        },
      },
    });

    // Verify the response contains the resources
    expect(callResponse.content).toBeDefined();
    expect(callResponse.content[0].type).toBe('text');

    const responseText = callResponse.content[0].text;
    // Should contain the contained resources
    expect(responseText).toContain('concept1.ttl');
    expect(responseText).toContain('concept2.ttl');
    expect(responseText).toContain('nested/');

    // Parse as JSON to verify structure
    const resources = JSON.parse(responseText);
    expect(Array.isArray(resources)).toBe(true);
    expect(resources).toHaveLength(3);
    expect(resources).toContain('https://test.solidcommunity.net/concepts/concept1.ttl');
    expect(resources).toContain('https://test.solidcommunity.net/concepts/concept2.ttl');
    expect(resources).toContain('https://test.solidcommunity.net/concepts/nested/');
  });

  it('should handle empty containers', async () => {
    // Mock session with fetch behavior returning empty container
    const mockSession = createMockSession();
    mockSession.fetch.mockReturnValue(
      mockFetchResponse(emptyContainerData, 200, 'text/turtle')
    );

    // Inject the mock session
    setSolidSession(mockSession as any);

    // Call the solid_list tool
    const callResponse = await callToolHandler({
      params: {
        name: 'solid_list',
        arguments: {
          containerUrl: 'https://test.solidcommunity.net/empty/',
        },
      },
    });

    // Verify the response shows empty array
    expect(callResponse.content).toBeDefined();
    expect(callResponse.content[0].type).toBe('text');

    const responseText = callResponse.content[0].text;
    const resources = JSON.parse(responseText);
    expect(Array.isArray(resources)).toBe(true);
    expect(resources).toHaveLength(0);
  });

  it('should require containerUrl to end with / (container convention)', async () => {
    // Mock session
    const mockSession = createMockSession();
    setSolidSession(mockSession as any);

    // Call with URL not ending in /
    const callPromise = callToolHandler({
      params: {
        name: 'solid_list',
        arguments: {
          containerUrl: 'https://test.solidcommunity.net/concepts',
        },
      },
    });

    // Should reject with error message about container convention
    await expect(callPromise).rejects.toThrow(/container.*\//i);
  });
});
