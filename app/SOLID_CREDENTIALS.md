# Solid Dev Server Credentials

## Seeded Pod

Your CSS server is configured with a pre-seeded development pod:

- **Pod Name**: `dev`
- **Email**: `dev@localhost`
- **Password**: `dev123`
- **WebID**: `http://localhost:3000/dev/profile/card#me`
- **Pod Root**: `http://localhost:3000/dev/`

## Usage

### Creating Additional Pods

You can create more pods via the registration interface:
1. Visit http://localhost:3000/
2. Click "Create Pod" or navigate to http://localhost:3000/idp/register/
3. Fill in the registration form

### Config Options

You can modify pod configurations by editing:
- **Seeded pods**: `config/css-seeded-pods.json`
- **Server config**: Update the `--seedConfig` flag in package.json

### Multiple Seeded Accounts with Pods

To seed multiple accounts with their pods, modify `config/css-seeded-pods.json`:

```json
[
  {
    "email": "dev@localhost",
    "password": "dev123",
    "pods": [
      {
        "name": "dev"
      }
    ]
  },
  {
    "email": "alice@localhost",
    "password": "alice123",
    "pods": [
      {
        "name": "alice"
      }
    ]
  }
]
```

You can create multiple pods for a single account:

```json
[
  {
    "email": "dev@localhost",
    "password": "dev123",
    "pods": [
      {
        "name": "personal"
      },
      {
        "name": "work"
      }
    ]
  }
]
```

## Minimal Config Options

CSS provides several config presets:

### 1. Current Setup (File Storage + Seeded Pods)
```bash
-c @css:config/file.json --seedConfig config/css-seeded-pods.json
```
- File-based storage
- Pre-configured user accounts
- Good for development

### 2. Memory Storage (Fastest, No Persistence)
```bash
-c @css:config/memory.json
```
- Everything in RAM
- Lost on restart
- Good for quick testing

### 3. SPARQL Storage (For Backends)
```bash
-c @css:config/sparql-endpoint.json --sparqlEndpoint http://localhost:7878/sparql
```
- Use with Oxigraph or other SPARQL stores
- Best performance for large datasets
- Requires separate SPARQL endpoint

### 4. Unsafe Config (Development Only - No Auth)
```bash
-c @css:config/unsafe.json
```
- No authentication
- No authorization
- **DO NOT use in production**
- Useful for automated testing

## Authentication in Comunica

When querying authenticated resources, use Solid OIDC:

```javascript
import { QueryEngine } from '@comunica/query-sparql';
import { Session } from '@inrupt/solid-client-authn-browser';

const session = new Session();
await session.login({
  clientName: "My App",
  oidcIssuer: "http://localhost:3000/"
});

const engine = new QueryEngine();
const result = await engine.queryBindings(query, {
  sources: ['http://localhost:3000/dev/private/data.ttl'],
  fetch: session.fetch  // Use authenticated fetch
});
```
