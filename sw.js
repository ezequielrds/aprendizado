const CACHE_NAME = 'aprendizagem-cache-v4';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './manifest.webmanifest',
  './words.json',
  './phrases.json',
  './letters.json',
  './colors.json',
  './writing.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  // Módulos JS
  './modules/state.js',
  './modules/deck.js',
  './modules/ui.js',
  './modules/audio.js',
  './modules/speech.js',
  './modules/scoring.js',
  './modules/render.js',
  './modules/writing.js',
  './modules/game.js',
  './modules/mode.js',
  // Áudios
  './audio/Aprender com você é divertido.mp3',
  './audio/Cada tentativa te deixa mais forte.mp3',
  './audio/Eu acredito em você.mp3',
  './audio/Que orgulho de você.mp3',
  './audio/Vamos ler mais uma.mp3',
  './audio/Você aprende rápido demais.mp3',
  './audio/Você está indo muito bem.mp3',
  './audio/Você é incrível.mp3'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      }))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const isNavigate = event.request.mode === 'navigate';

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      }).catch(() => {
        if (isNavigate) {
          return caches.match('./index.html');
        }
      });
    })
  );
});
