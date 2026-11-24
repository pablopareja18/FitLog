import * as esbuild from 'esbuild';
import fs from 'fs';

const out = 'dist';
fs.mkdirSync(out, { recursive: true });

const res = await esbuild.build({
  entryPoints: ['src/main.jsx'],
  bundle: true,
  minify: true,
  write: false,
  outdir: out,
  format: 'iife',
  target: ['safari15', 'chrome100'],
  jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' },
  loader: { '.js': 'jsx' },
  legalComments: 'none',
});

const js = res.outputFiles.find(f => f.path.endsWith('.js')).text;
const css = res.outputFiles.find(f => f.path.endsWith('.css')).text;

const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0b0b0c">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="FitLog">
<meta name="description" content="FitLog: registra tus entrenos de gimnasio y sigue tu progreso.">
<title>FitLog</title>
<link rel="manifest" href="manifest.json">
<link rel="icon" type="image/png" href="icon-192.png">
<link rel="apple-touch-icon" href="icon-512.png">
<style>${css}</style>
</head>
<body>
<div id="root"></div>
<noscript>FitLog necesita JavaScript.</noscript>
<script>${js.replace(/<\/script/g, '<\\/script')}</script>
</body>
</html>`;

fs.writeFileSync(`${out}/index.html`, html);

const version = 'fitlog-' + Date.now().toString(36);
fs.writeFileSync(`${out}/sw.js`, `// FitLog service worker: red primero (siempre la última versión), caché si no hay conexión
const CACHE = '${version}';
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req, { cache: 'no-store' }).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match('./index.html') || caches.match('./')))
  );
});
`);

fs.writeFileSync(`${out}/manifest.json`, JSON.stringify({
  name: 'FitLog', short_name: 'FitLog', description: 'Tu diario de entrenos',
  start_url: './', scope: './', display: 'standalone', orientation: 'portrait',
  background_color: '#0b0b0c', theme_color: '#0b0b0c', lang: 'es',
  icons: [
    { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
    { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
  ],
}, null, 2));

fs.copyFileSync('programa.json', `${out}/programa.json`);
console.log(`index.html ${(html.length / 1024).toFixed(0)} KB`);
