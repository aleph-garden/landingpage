import { extendConfig } from '@builder.io/qwik-city/vite';
import baseConfig from '../../vite.config';
import { staticAdapter } from '@builder.io/qwik-city/adapters/static/vite';
import { fileURLToPath } from 'node:url';

export default extendConfig(baseConfig, () => {
  return {
    build: {
      ssr: true,
      rollupOptions: {
        input: ['@qwik-city-plan'],
      },
    },
    plugins: [
      staticAdapter({
        origin: 'https://aleph.wiki',
        outDir: fileURLToPath(new URL('../../dist', import.meta.url)),
      }),
    ],
  };
});
