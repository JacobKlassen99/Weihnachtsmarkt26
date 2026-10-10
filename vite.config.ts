import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, Plugin} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

const GOOGLE_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbzPYXuXu8FSvtmRVaDywv8OxsDZZX45WfxpNBoPmdF29cnezThtfv2bxRxoELdTjUSz/exec';

function gasProxyPlugin(): Plugin {
  return {
    name: 'gas-dev-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';
        if (url.startsWith('/api/backend') || url.startsWith('/.netlify/functions/backend')) {
          if (req.method === 'OPTIONS') {
            res.writeHead(204, {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
            });
            res.end();
            return;
          }

          try {
            if (req.method === 'GET') {
              const query = url.includes('?') ? url.substring(url.indexOf('?')) : '';
              const targetUrl = `${GOOGLE_APPS_SCRIPT_URL}${query}`;
              const gasRes = await fetch(targetUrl, {
                method: 'GET',
                redirect: 'follow',
              });
              const text = await gasRes.text();
              res.writeHead(gasRes.status, {
                'Content-Type': 'application/json; charset=utf-8',
                'Access-Control-Allow-Origin': '*',
              });
              res.end(text);
              return;
            }

            if (req.method === 'POST') {
              const chunks: Buffer[] = [];
              req.on('data', (chunk) => {
                chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
              });
              req.on('end', async () => {
                try {
                  const body = Buffer.concat(chunks).toString('utf-8');
                  const gasRes = await fetch(GOOGLE_APPS_SCRIPT_URL, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'text/plain;charset=utf-8',
                    },
                    body: body || '{}',
                    redirect: 'follow',
                  });
                  const text = await gasRes.text();
                  res.writeHead(gasRes.status, {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Access-Control-Allow-Origin': '*',
                  });
                  res.end(text);
                } catch (postErr: any) {
                  res.writeHead(500, {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Access-Control-Allow-Origin': '*',
                  });
                  res.end(JSON.stringify({ ok: false, error: postErr.message }));
                }
              });
              return;
            }
          } catch (err: any) {
            res.writeHead(500, {
              'Content-Type': 'application/json; charset=utf-8',
              'Access-Control-Allow-Origin': '*',
            });
            res.end(JSON.stringify({ ok: false, error: err.message }));
            return;
          }
        }
        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      gasProxyPlugin(),
      VitePWA({
        registerType: 'prompt',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg'],
        manifest: {
          id: '/',
          name: 'Weihnachtsmarkt',
          short_name: 'Weihnacht',
          description: 'Administración y control de acceso del evento Weihnachtsmarkt',
          theme_color: '#9B1B30',
          background_color: '#1a0508',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          navigateFallbackDenylist: [/^\/api\//, /^\/\.netlify\//],
          runtimeCaching: [
            {
              urlPattern: /^\/api\/.*/i,
              handler: 'NetworkOnly',
            },
            {
              urlPattern: /^\/\.netlify\/.*/i,
              handler: 'NetworkOnly',
            },
          ],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
