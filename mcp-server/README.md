# Aleph.wiki MCP Server

Model Context Protocol (MCP) server for Solid Pod RDF operations with SPARQL pattern matching support.

## Features

- **Solid Pod Integration**: Authenticate and interact with Solid Pods using the Solid Protocol
- **RDF Operations**: Read, write, and append RDF triples in Turtle format
- **SPARQL Pattern Matching**: Query RDF graphs with triple pattern matching
- **Container Management**: List and navigate Solid Pod containers
- **Authenticated Access**: OAuth/OIDC authentication with DPoP tokens

## Installation

```bash
npm install
npm run build
```

## Usage with Claude Code

### 1. Configure MCP Server

Add to your Claude Code MCP configuration (typically `~/.config/claude-code/mcp.json`):

```json
{
  "mcpServers": {
    "aleph-wiki-solid": {
      "command": "node",
      "args": ["/path/to/aleph-wiki/mcp-server/dist/index.js"],
      "env": {}
    }
  }
}
```

### 2. Initialize Solid Connection

In Claude Code, the agent can use:

```
Use the solid_init tool to connect to my Solid Pod at https://user.solidcommunity.net/
```

### 3. Read RDF Data

```
Use rdf_read to get the contents of https://user.solidcommunity.net/aleph-wiki/index.ttl
```

### 4. Append Triples

```
Use rdf_append to add these triples to my knowledge graph:
<concept:example> a skos:Concept ;
    skos:prefLabel "Example Concept"@en .
```

## Available Tools

### `solid_init`
Initialize connection to Solid Pod with authentication.

**Parameters:**
- `podUrl` (required): Solid Pod URL
- `webId` (required): User's WebID
- `clientId` (optional): OAuth client ID
- `clientSecret` (optional): OAuth client secret
- `oidcIssuer` (optional): OIDC issuer URL (default: https://solidcommunity.net)

**Example:**
```typescript
{
  "podUrl": "https://user.solidcommunity.net/",
  "webId": "https://user.solidcommunity.net/profile/card#me"
}
```

### `rdf_read`
Read RDF resource from Solid Pod in Turtle format.

**Parameters:**
- `resourceUrl` (required): Full URL of the RDF resource

**Example:**
```typescript
{
  "resourceUrl": "https://user.solidcommunity.net/aleph-wiki/index.ttl"
}
```

### `rdf_append`
Append RDF triples to a resource using Solid Protocol PATCH.

**Parameters:**
- `resourceUrl` (required): Full URL of the RDF resource
- `triples` (required): Turtle-formatted triples to append

**Example:**
```typescript
{
  "resourceUrl": "https://user.solidcommunity.net/aleph-wiki/index.ttl",
  "triples": "<concept:test> a skos:Concept ; skos:prefLabel \"Test\"@en ."
}
```

### `sparql_match`
Execute simple triple pattern matching. Use null for wildcards.

**Parameters:**
- `resourceUrl` (required): RDF resource URL
- `subject` (optional): Subject IRI or null for wildcard
- `predicate` (optional): Predicate IRI or null for wildcard
- `object` (optional): Object IRI/literal or null for wildcard

**Example - Find all concepts:**
```typescript
{
  "resourceUrl": "https://user.solidcommunity.net/aleph-wiki/index.ttl",
  "subject": null,
  "predicate": "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
  "object": "http://www.w3.org/2004/02/skos/core#Concept"
}
```

**Example - Find all properties of a concept:**
```typescript
{
  "resourceUrl": "https://user.solidcommunity.net/aleph-wiki/index.ttl",
  "subject": "http://aleph-wiki.local/concept/french-revolution",
  "predicate": null,
  "object": null
}
```

### `solid_list`
List resources in a Solid container.

**Parameters:**
- `containerUrl` (required): URL of the Solid container (must end with /)

**Example:**
```typescript
{
  "containerUrl": "https://user.solidcommunity.net/aleph-wiki/"
}
```

## Architecture

```
┌─────────────────┐
│  Claude Code    │
│  Agent          │
└────────┬────────┘
         │ MCP Protocol
         │ (stdio)
         ↓
┌─────────────────┐
│  MCP Server     │
│  (This package) │
└────────┬────────┘
         │ Solid Protocol
         │ (HTTPS + Auth)
         ↓
┌─────────────────┐
│  Solid Pod      │
│  RDF Storage    │
└─────────────────┘
```

## Integration with Agent

The `rdf-learning` agent skill can be updated to use these MCP tools instead of local filesystem operations:

```markdown
### File Location (MCP Mode)

When MCP server is configured:

1. **Initialize** Solid connection: `solid_init`
2. **Read** existing graph: `rdf_read`
3. **Query** concepts: `sparql_match`
4. **Append** new triples: `rdf_append`
```

## Development

```bash
# Install dependencies
npm install

# Development mode with auto-reload
npm run dev

# Build for production
npm run build

# Run built server
npm start
```

## Future Enhancements

- [ ] Full SPARQL 1.1 query support (via Comunica)
- [ ] SPARQL UPDATE support
- [ ] Batch operations for multiple resources
- [ ] WebSocket notifications for real-time updates
- [ ] Access control management tools
- [ ] Container creation and deletion
- [ ] Resource metadata queries
- [ ] Support for other RDF formats (JSON-LD, RDF/XML)

## Security Considerations

- Credentials should be stored securely (environment variables, secret manager)
- Use HTTPS for all Pod communications
- Implement proper token refresh mechanisms
- Validate all user inputs before sending to Pod
- Follow Solid security best practices

## References

- [Model Context Protocol](https://modelcontextprotocol.io)
- [Solid Protocol Specification](https://solidproject.org/TR/protocol)
- [Inrupt JavaScript Client Libraries](https://docs.inrupt.com/developer-tools/javascript/client-libraries/)
- [N3.js Documentation](https://github.com/rdfjs/N3.js)
