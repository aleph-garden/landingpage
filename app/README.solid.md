# Solid + Comunica Development Setup

Complete setup for local Solid development with SPARQL querying.

## Quick Start

```bash
npm run dev:all
```

This starts both servers:
- **Community Solid Server**: http://localhost:3000/
- **Vite dev server**: http://localhost:5173/

## Pre-Configured Credentials

Your local CSS server includes a seeded development account:

```
Email: dev@localhost
Password: dev123
Pod Root: http://localhost:3000/dev/
WebID: http://localhost:3000/dev/profile/card#me
```

## Project Structure

```
app/
├── config/
│   └── css-seeded-pods.json  # Seeded account configuration
├── data/
│   └── .solid-data/          # CSS data storage (gitignored)
├── src/
│   └── comunica-example.js   # SPARQL query examples
├── SOLID_SETUP.md            # Detailed setup documentation
└── SOLID_CREDENTIALS.md      # Credential management guide
```

## Usage

### Running Services Individually

```bash
npm run solid  # Just the Solid server
npm run dev    # Just Vite
```

### Querying with Comunica

```javascript
import { QueryEngine } from '@comunica/query-sparql';

const engine = new QueryEngine();

const bindingsStream = await engine.queryBindings(`
  SELECT * WHERE {
    ?s ?p ?o .
  } LIMIT 10
`, {
  sources: ['http://localhost:3000/dev/']
});

const bindings = await bindingsStream.toArray();
```

See `src/comunica-example.js` for more examples.

## Configuration

### Adding More Seeded Accounts

Edit `config/css-seeded-pods.json`:

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

### Alternative Configurations

Change the `-c` flag in package.json `solid` script:

- **Memory storage** (faster, no persistence):
  `-c @css:config/memory.json`

- **Unsafe mode** (no auth, testing only):
  `-c @css:config/unsafe.json`

See `SOLID_CREDENTIALS.md` for more options.

## Architecture

### Why npx for CSS?

CSS runs via `npx` to avoid dependency conflicts:
- CSS uses Comunica v2.x internally
- Your app uses Comunica v3.x
- Running CSS via npx keeps them separate

### Comunica in the Browser

The `@comunica/query-sparql` package works in both Node.js and browsers:
- Vite bundles it automatically
- Query any HTTP-accessible RDF source
- Works with Solid pods via standard HTTP

## Interoperability

This setup maintains compatibility with:
- Any Solid pod (not just your local one)
- Any RDF data source accessible via HTTP
- SPARQL endpoints
- Local files (in Node.js)

Comunica evaluates queries client-side, so it works even if the remote server doesn't support SPARQL.

## Next Steps

1. **Test the setup**: `npm run dev:all`
2. **Explore examples**: Check `src/comunica-example.js`
3. **Add data**: Upload RDF files to http://localhost:3000/dev/
4. **Query data**: Use Comunica in your app

## Documentation

- `SOLID_SETUP.md` - Complete setup guide
- `SOLID_CREDENTIALS.md` - Auth and config options
- https://communitysolidserver.github.io/ - CSS docs
- https://comunica.dev/ - Comunica docs
