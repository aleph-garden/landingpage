import { component$ } from '@builder.io/qwik';
import { QwikCityProvider, RouterOutlet, ServiceWorkerRegister } from '@builder.io/qwik-city';
import './global.css';

export default component$(() => {
  return (
    <QwikCityProvider>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Readex+Pro:wght@600&family=Rubik:wght@400;700&family=Noto+Serif:wght@400;700&family=Noto+Sans+Math&family=Google+Sans+Mono:wght@400;700&display=swap" rel="stylesheet" />
        <title>Aleph</title>
        <meta name="description" content="Building Memex II: A personal knowledge base that works like the brain thinks. Open source, self-hosted." />
      </head>
      <body>
        <RouterOutlet />
        <ServiceWorkerRegister />
      </body>
    </QwikCityProvider>
  );
});
