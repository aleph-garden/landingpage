import { readFileSync, existsSync, statSync } from 'fs';
import { join, resolve } from 'path';

const PORT = 5173;

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    let pathname = url.pathname;

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

    // Serve static files from dist (for production) or proxy to Vite (for dev)
    if (pathname === '/') {
      pathname = '/index.html';
    }

    // Try to serve from public first
    const publicPath = join(process.cwd(), 'public', pathname);
    if (existsSync(publicPath) && statSync(publicPath).isFile()) {
      const file = Bun.file(publicPath);
      return new Response(file);
    }

    // Try to serve from root
    const rootPath = join(process.cwd(), pathname);
    if (existsSync(rootPath) && statSync(rootPath).isFile()) {
      const file = Bun.file(rootPath);
      return new Response(file);
    }

    // Serve index.html for SPA routes
    const indexPath = join(process.cwd(), 'index.html');
    if (existsSync(indexPath)) {
      const file = Bun.file(indexPath);
      return new Response(file, {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    return new Response('Not found', { status: 404 });
  },
});

console.log(`Server running at http://localhost:${PORT}`);
console.log('You can now watch any file on your filesystem!');
