# Solid Protocol Integration Plan

## Overview

This document outlines the architecture for integrating RDF Graph Viewer with the Solid Protocol, enabling decentralized knowledge graph storage in user-controlled Pods with a web-based visualizer.

## Architecture

```
┌─────────────────────────┐
│   Claude Code Agent     │
│   (RDF Producer)        │
│                         │
│   - Authenticates       │
│   - Writes triples      │
│   - Manages sessions    │
└───────────┬─────────────┘
            │
            │ HTTPS (Solid Protocol)
            │ PUT/PATCH operations
            │ Authentication: DPoP/OIDC
            │
            ↓
┌─────────────────────────┐
│      Solid Pod          │
│   (RDF Storage)         │
│                         │
│   /aleph-wiki/          │
│   ├── index.ttl         │
│   ├── sessions/         │
│   │   └── {timestamp}/  │
│   └── ontologies/       │
│       ├── skos.ttl      │
│       └── schema.ttl    │
└───────────┬─────────────┘
            │
            │ HTTPS (Read)
            │ WebSocket (Notifications)
            │
            ↓
┌─────────────────────────┐
│   Visualizer App        │
│   (Solid Web App)       │
│                         │
│   - User authenticates  │
│   - Reads RDF graph     │
│   - Renders D3/Cytoscape│
│   - Live updates        │
└─────────────────────────┘
```

## Component 1: Solid-Enabled Agent

### Requirements

**Dependencies:**
- `@inrupt/solid-client-authn-node` - Authentication
- `@inrupt/solid-client` - Solid operations
- `n3` - RDF parsing and generation

**Configuration needed:**

```javascript
// Agent configuration
{
  "solidPod": {
    "url": "https://user.solidcommunity.net/",
    "webId": "https://user.solidcommunity.net/profile/card#me",
    "clientId": "https://agent.example.com/client-id",
    "clientSecret": "...",
    "graphPath": "/aleph-wiki/index.ttl",
    "ontologiesPath": "/aleph-wiki/ontologies/",
    "sessionsPath": "/aleph-wiki/sessions/"
  }
}
```

### Authentication Flow

1. **Initial setup:**
   - Register agent as Solid client application
   - Obtain client credentials (ID + secret)
   - User grants agent write access to `/aleph-wiki/` container

2. **Session authentication:**
   ```javascript
   import { Session } from "@inrupt/solid-client-authn-node";

   const session = new Session();
   await session.login({
     clientId: config.clientId,
     clientSecret: config.clientSecret,
     oidcIssuer: "https://solidcommunity.net"
   });
   ```

3. **Token management:**
   - Store session tokens securely
   - Refresh tokens as needed
   - Handle authentication errors gracefully

### Write Operations

**Appending triples (N3 Patch):**

```http
PATCH https://user.solidcommunity.net/aleph-wiki/index.ttl
Content-Type: text/n3

@prefix solid: <http://www.w3.org/ns/solid/terms#>.
@prefix : <#>.

_:patch a solid:InsertDeletePatch;
  solid:inserts {
    <interaction:2026-01-10T14:30:00Z> a schema:InteractionAction ;
        schema:agent <session:2026-01-10T14:23:45Z> ;
        schema:startTime "2026-01-10T14:30:00Z"^^xsd:dateTime .
  }.
```

**Alternative: SPARQL UPDATE:**

```http
PATCH https://user.solidcommunity.net/aleph-wiki/index.ttl
Content-Type: application/sparql-update

PREFIX schema: <http://schema.org/>
PREFIX interaction: <http://aleph-wiki.local/interaction/>

INSERT DATA {
  <interaction:2026-01-10T14:30:00Z> a schema:InteractionAction ;
      schema:agent <session:2026-01-10T14:23:45Z> ;
      schema:startTime "2026-01-10T14:30:00Z"^^xsd:dateTime .
}
```

**Implementation pseudocode:**

```javascript
async function appendTriples(triples, podUrl, graphPath, session) {
  const resourceUrl = `${podUrl}${graphPath}`;

  // Convert triples to N3 Patch format
  const patch = generateN3Patch(triples);

  // Send PATCH request with authentication
  const response = await fetch(resourceUrl, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'text/n3',
      'Authorization': `DPoP ${session.token}`
    },
    body: patch
  });

  if (!response.ok) {
    throw new Error(`Failed to append triples: ${response.status}`);
  }

  return response;
}
```

### Modified Skill Instructions

Update `rdf-learning.md` with:

```markdown
### File Location (Solid Mode)

When Solid integration is enabled:

1. **Authenticate** to user's Solid Pod using client credentials
2. **Write triples** to `{POD_URL}/aleph-wiki/index.ttl` via PATCH
3. **Store ontologies** in `{POD_URL}/aleph-wiki/ontologies/`
4. **Track sessions** in `{POD_URL}/aleph-wiki/sessions/{timestamp}/`

### Write Operations

Use Solid Protocol PATCH with N3 Patch format:
- Append new triples without overwriting existing data
- Include proper authentication headers (DPoP tokens)
- Handle 401/403 errors gracefully (re-authenticate if needed)
- Verify write success before confirming to user

### Error Handling

- **401 Unauthorized**: Re-authenticate and retry
- **403 Forbidden**: User hasn't granted write access
- **409 Conflict**: Concurrent modification, retry with backoff
- **Network errors**: Queue writes locally, sync when available
```

### Initialization Workflow

On first run:

1. Check if Pod URL is configured
2. Authenticate to Pod
3. Check if `/aleph-wiki/` container exists
4. If not, create container with proper ACL:
   ```turtle
   # .acl file for /aleph-wiki/
   @prefix acl: <http://www.w3.org/ns/auth/acl#>.

   <#owner>
       a acl:Authorization;
       acl:agent <https://user.solidcommunity.net/profile/card#me>;
       acl:accessTo <./>;
       acl:default <./>;
       acl:mode acl:Read, acl:Write, acl:Control.

   <#agent>
       a acl:Authorization;
       acl:agent <https://agent.example.com/profile/card#me>;
       acl:accessTo <./>;
       acl:default <./>;
       acl:mode acl:Read, acl:Write.
   ```
5. Initialize `index.ttl` with namespace prefixes if empty
6. Create `ontologies/` and `sessions/` containers

## Component 2: Visualizer Web App

### Technology Stack

**Framework options:**
- Vanilla JS + RDF libraries (lightweight)
- React + Solid React SDK (recommended)
- Vue/Svelte + Solid client libraries

**Core dependencies:**
```json
{
  "@inrupt/solid-client": "^2.0.0",
  "@inrupt/solid-client-authn-browser": "^2.0.0",
  "@inrupt/solid-ui-react": "^2.0.0",
  "rdflib": "^2.2.0",
  "n3": "^1.17.0",
  "d3": "^7.8.0",
  "cytoscape": "^3.28.0"
}
```

### Features

**1. Authentication:**
```javascript
import { LoginButton, useSession } from "@inrupt/solid-ui-react";

function App() {
  const { session } = useSession();

  if (!session.info.isLoggedIn) {
    return <LoginButton oidcIssuer="https://solidcommunity.net" />;
  }

  return <GraphViewer session={session} />;
}
```

**2. Read RDF graph:**
```javascript
import { getSolidDataset, getThing, getUrl } from "@inrupt/solid-client";

async function loadGraph(podUrl, session) {
  const graphUrl = `${podUrl}/aleph-wiki/index.ttl`;
  const dataset = await getSolidDataset(graphUrl, { fetch: session.fetch });

  // Parse triples
  const store = new N3.Store();
  // ... populate store from dataset

  return store;
}
```

**3. Live updates (WebSocket):**
```javascript
import { subscribeToNotifications } from "@inrupt/solid-client-notifications";

async function watchGraph(resourceUrl, session, onUpdate) {
  const subscription = await subscribeToNotifications(
    resourceUrl,
    { fetch: session.fetch }
  );

  for await (const notification of subscription) {
    if (notification.type === "update") {
      // Reload graph and re-render
      const updatedGraph = await loadGraph(podUrl, session);
      onUpdate(updatedGraph);
    }
  }
}
```

**4. Graph visualization:**
```javascript
import cytoscape from 'cytoscape';

function renderGraph(store) {
  const elements = [];

  // Convert RDF triples to Cytoscape elements
  for (const quad of store.match()) {
    elements.push({
      data: { id: quad.subject.value, label: extractLabel(quad.subject) }
    });
    elements.push({
      data: {
        source: quad.subject.value,
        target: quad.object.value,
        label: quad.predicate.value
      }
    });
  }

  cytoscape({
    container: document.getElementById('graph'),
    elements: elements,
    style: [ /* ... */ ]
  });
}
```

### UI Features

**Graph view modes:**
- **Hierarchical**: Show SKOS concept hierarchies
- **Temporal**: Timeline view of learning sessions
- **Semantic**: Cluster by ontology types
- **Session**: Filter by specific Claude sessions

**Interaction patterns:**
- Click node → Show all triples for that resource
- Hover → Display `rdfs:comment` tooltips
- Filter by language, date range, concept type
- Search across labels and comments
- Export subgraphs as Turtle

**Filters panel:**
```javascript
function Filters({ onFilterChange }) {
  return (
    <div>
      <input
        type="date"
        onChange={e => onFilterChange({ startDate: e.target.value })}
      />
      <select onChange={e => onFilterChange({ language: e.target.value })}>
        <option value="en">English</option>
        <option value="de">Deutsch</option>
        <option value="fa">فارسی</option>
      </select>
      <select onChange={e => onFilterChange({ session: e.target.value })}>
        {sessions.map(s => <option value={s.id}>{s.label}</option>)}
      </select>
    </div>
  );
}
```

## Component 3: Multi-User Scenarios

### Shared Concept Libraries

**Public ontology container:**
```
https://shared.pod.example/ontologies/
├── chemistry.ttl (public read)
├── history.ttl (public read)
└── .acl (allows public read)
```

Agents reference shared ontologies:
```turtle
@prefix chem: <https://shared.pod.example/ontologies/chemistry#> .

<concept:water> a skos:Concept ;
    skos:exactMatch chem:H2O .
```

### Collaborative Learning

**User A's Pod:**
```turtle
<concept:french-revolution> a skos:Concept ;
    skos:prefLabel "French Revolution"@en ;
    acl:accessTo <https://userB.pod.example/profile/card#me> .
```

User B can read User A's concepts and link to them:
```turtle
# In User B's Pod
<concept:napoleon> a skos:Concept ;
    skos:related <https://userA.pod.example/aleph-wiki/index.ttl#french-revolution> .
```

### Research Team Setup

1. **Team container** with shared access:
   ```
   https://team.pod.example/research-project/
   ├── shared-concepts.ttl (team read/write)
   ├── individual/
   │   ├── alice/ (Alice read/write, team read)
   │   └── bob/ (Bob read/write, team read)
   ```

2. **Agent configuration** for team members:
   - Write personal learnings to individual space
   - Reference shared concepts
   - Visualizer shows merged view

## Implementation Tasks

### Phase 1: Agent Solid Support
- [ ] Add Solid client dependencies
- [ ] Implement authentication flow
- [ ] Replace file writes with Solid PATCH operations
- [ ] Handle Pod initialization (create containers, set ACLs)
- [ ] Add error handling and retry logic
- [ ] Update rdf-learning.md skill with Solid instructions
- [ ] Create configuration mechanism for Pod URL

### Phase 2: Basic Visualizer
- [ ] Set up Solid React app scaffolding
- [ ] Implement user authentication
- [ ] Load and parse RDF from Pod
- [ ] Basic graph rendering with Cytoscape.js
- [ ] Display node details on click
- [ ] Filter by session

### Phase 3: Advanced Features
- [ ] WebSocket notifications for live updates
- [ ] Multi-language support in UI
- [ ] Timeline view for temporal exploration
- [ ] SPARQL query interface
- [ ] Export functionality
- [ ] Shared concept linking

### Phase 4: Multi-User
- [ ] Shared ontology containers
- [ ] Cross-Pod concept references
- [ ] Team workspace support
- [ ] Access control management UI

## Testing Plan

### Agent Testing
1. Authenticate to test Pod
2. Create sample interactions
3. Verify triples written correctly
4. Test concurrent writes
5. Verify ontology downloads to Pod
6. Test error recovery

### Visualizer Testing
1. Authenticate test user
2. Load sample graph
3. Verify rendering
4. Test filters and search
5. Verify WebSocket updates
6. Cross-browser testing

### Integration Testing
1. Agent writes → Visualizer displays
2. Multiple sessions → Timeline view
3. Shared concepts → Cross-Pod links
4. Large graphs → Performance testing

## Security Considerations

1. **Authentication:**
   - Store credentials securely (environment variables, keychain)
   - Rotate tokens regularly
   - Implement token refresh

2. **Access control:**
   - Validate ACLs before writes
   - Don't leak private concepts in shared contexts
   - Warn user about public data

3. **Data validation:**
   - Validate RDF before writing
   - Sanitize user input
   - Prevent injection attacks

## Performance Considerations

1. **Large graphs:**
   - Pagination for loading triples
   - Lazy loading of concept details
   - Index common queries

2. **Network efficiency:**
   - Batch writes when possible
   - Cache frequently accessed resources
   - Use conditional requests (ETags)

3. **Visualization:**
   - Virtual scrolling for large node lists
   - Progressive rendering
   - Web Workers for RDF parsing

## Open Questions

1. Should each session create a separate resource or all write to `index.ttl`?
2. How to handle very large graphs (100k+ triples)?
3. Best strategy for concurrent agent writes?
4. Should visualizer support offline mode with local cache?
5. How to version the knowledge graph over time?

## References

- [Solid Protocol Specification](https://solidproject.org/TR/protocol)
- [Solid OIDC](https://solidproject.org/TR/oidc)
- [Inrupt JavaScript Client Libraries](https://docs.inrupt.com/developer-tools/javascript/client-libraries/)
- [RDF Patch Format](https://www.w3.org/TR/rdf-patch/)
- [WebSocket Notifications](https://solidproject.org/TR/notifications-protocol)
