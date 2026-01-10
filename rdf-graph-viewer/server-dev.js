import { createServer as createViteServer } from 'vite';
import { readFileSync, existsSync, statSync } from 'fs';
import { resolve } from 'path';

const PORT = 5173;

// Create Vite server in middleware mode
const vite = await createViteServer({
  server: { middlewareMode: true },
  appType: 'spa'
});

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const pathname = url.pathname;

    // API endpoint to fetch any file by absolute path
    if (pathname.startsWith('/api/file')) {
      const filePath = url.searchParams.get('path');
      if (!filePath) {
        return new Response('Missing path parameter', { status: 400 });
      }

      const absolutePath = filePath.startsWith('~')
        ? filePath.replace('~', process.env.HOME)
        : resolve(filePath);

      try {
        if (!existsSync(absolutePath)) {
          return new Response('File not found', { status: 404 });
        }

        const stats = statSync(absolutePath);
        if (!stats.isFile()) {
          return new Response('Not a file', { status: 400 });
        }

        const content = readFileSync(absolutePath, 'utf-8');
        return new Response(content, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Access-Control-Allow-Origin': '*'
          }
        });
      } catch (error) {
        return new Response(`Error reading file: ${error.message}`, { status: 500 });
      }
    }

    // Let Vite handle all other requests
    try {
      // Convert Bun Request to Node.js compatible request
      const nodeReq = {
        url: url.pathname + url.search,
        method: req.method,
        headers: Object.fromEntries(req.headers.entries())
      };

      const nodeRes = {
        statusCode: 200,
        headers: {},
        setHeader(name, value) {
          this.headers[name] = value;
        },
        end(body) {
          this.body = body;
        },
        write(chunk) {
          if (!this.body) this.body = '';
          this.body += chunk;
        }
      };

      await vite.middlewares(nodeReq, nodeRes, () => {});

      return new Response(nodeRes.body || '', {
        status: nodeRes.statusCode,
        headers: nodeRes.headers
      });
    } catch (error) {
      console.error('Error:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  },
});

console.log(`\nRDF Graph Viewer running at http://localhost:${PORT}`);
console.log('You can now watch any file on your filesystem!');
console.log('Set the RDF file path to something like: ~/aleph-wiki/index.ttl\n');
