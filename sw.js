const CACHE_NAME = 'aprendizagem-cache-v16';
const APP_ASSETS = [
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
  './data/countries.json',
  './data/world-map.js',
  './assets/maps/CC-BY-4.0.md',
  './icons/icon-192.png',
  './icons/icon-512.png',
  // Módulos JS
  './modules/state.js',
  './modules/deck.js',
  './modules/random.js',
  './modules/ui.js',
  './modules/audio.js',
  './modules/speech.js',
  './modules/scoring.js',
  './modules/render.js',
  './modules/writing.js',
  './modules/game.js',
  './modules/mode.js',
  './modules/flagsLogic.js',
  './modules/flagsMapLogic.js',
  './modules/flags.js',
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

const FLAG_ASSETS = [
  './assets/flags/ad.svg',
  './assets/flags/ae.svg',
  './assets/flags/af.svg',
  './assets/flags/ag.svg',
  './assets/flags/al.svg',
  './assets/flags/am.svg',
  './assets/flags/ao.svg',
  './assets/flags/ar.svg',
  './assets/flags/at.svg',
  './assets/flags/au.svg',
  './assets/flags/az.svg',
  './assets/flags/ba.svg',
  './assets/flags/bb.svg',
  './assets/flags/bd.svg',
  './assets/flags/be.svg',
  './assets/flags/bf.svg',
  './assets/flags/bg.svg',
  './assets/flags/bh.svg',
  './assets/flags/bi.svg',
  './assets/flags/bj.svg',
  './assets/flags/bn.svg',
  './assets/flags/bo.svg',
  './assets/flags/br.svg',
  './assets/flags/bs.svg',
  './assets/flags/bt.svg',
  './assets/flags/bw.svg',
  './assets/flags/by.svg',
  './assets/flags/bz.svg',
  './assets/flags/ca.svg',
  './assets/flags/cd.svg',
  './assets/flags/cf.svg',
  './assets/flags/cg.svg',
  './assets/flags/ch.svg',
  './assets/flags/ci.svg',
  './assets/flags/cl.svg',
  './assets/flags/cm.svg',
  './assets/flags/cn.svg',
  './assets/flags/co.svg',
  './assets/flags/cr.svg',
  './assets/flags/cu.svg',
  './assets/flags/cv.svg',
  './assets/flags/cy.svg',
  './assets/flags/cz.svg',
  './assets/flags/de.svg',
  './assets/flags/dj.svg',
  './assets/flags/dk.svg',
  './assets/flags/dm.svg',
  './assets/flags/do.svg',
  './assets/flags/dz.svg',
  './assets/flags/ec.svg',
  './assets/flags/ee.svg',
  './assets/flags/eg.svg',
  './assets/flags/er.svg',
  './assets/flags/es.svg',
  './assets/flags/et.svg',
  './assets/flags/fi.svg',
  './assets/flags/fj.svg',
  './assets/flags/fm.svg',
  './assets/flags/fr.svg',
  './assets/flags/ga.svg',
  './assets/flags/gb.svg',
  './assets/flags/gd.svg',
  './assets/flags/ge.svg',
  './assets/flags/gh.svg',
  './assets/flags/gm.svg',
  './assets/flags/gn.svg',
  './assets/flags/gq.svg',
  './assets/flags/gr.svg',
  './assets/flags/gt.svg',
  './assets/flags/gw.svg',
  './assets/flags/gy.svg',
  './assets/flags/hn.svg',
  './assets/flags/hr.svg',
  './assets/flags/ht.svg',
  './assets/flags/hu.svg',
  './assets/flags/id.svg',
  './assets/flags/ie.svg',
  './assets/flags/il.svg',
  './assets/flags/in.svg',
  './assets/flags/iq.svg',
  './assets/flags/ir.svg',
  './assets/flags/is.svg',
  './assets/flags/it.svg',
  './assets/flags/jm.svg',
  './assets/flags/jo.svg',
  './assets/flags/jp.svg',
  './assets/flags/ke.svg',
  './assets/flags/kg.svg',
  './assets/flags/kh.svg',
  './assets/flags/ki.svg',
  './assets/flags/km.svg',
  './assets/flags/kn.svg',
  './assets/flags/kp.svg',
  './assets/flags/kr.svg',
  './assets/flags/kw.svg',
  './assets/flags/kz.svg',
  './assets/flags/la.svg',
  './assets/flags/lb.svg',
  './assets/flags/lc.svg',
  './assets/flags/li.svg',
  './assets/flags/lk.svg',
  './assets/flags/lr.svg',
  './assets/flags/ls.svg',
  './assets/flags/lt.svg',
  './assets/flags/lu.svg',
  './assets/flags/lv.svg',
  './assets/flags/ly.svg',
  './assets/flags/ma.svg',
  './assets/flags/mc.svg',
  './assets/flags/md.svg',
  './assets/flags/me.svg',
  './assets/flags/mg.svg',
  './assets/flags/mh.svg',
  './assets/flags/mk.svg',
  './assets/flags/ml.svg',
  './assets/flags/mm.svg',
  './assets/flags/mn.svg',
  './assets/flags/mr.svg',
  './assets/flags/mt.svg',
  './assets/flags/mu.svg',
  './assets/flags/mv.svg',
  './assets/flags/mw.svg',
  './assets/flags/mx.svg',
  './assets/flags/my.svg',
  './assets/flags/mz.svg',
  './assets/flags/na.svg',
  './assets/flags/ne.svg',
  './assets/flags/ng.svg',
  './assets/flags/ni.svg',
  './assets/flags/nl.svg',
  './assets/flags/no.svg',
  './assets/flags/np.svg',
  './assets/flags/nr.svg',
  './assets/flags/nz.svg',
  './assets/flags/om.svg',
  './assets/flags/pa.svg',
  './assets/flags/pe.svg',
  './assets/flags/pg.svg',
  './assets/flags/ph.svg',
  './assets/flags/pk.svg',
  './assets/flags/pl.svg',
  './assets/flags/pt.svg',
  './assets/flags/pw.svg',
  './assets/flags/py.svg',
  './assets/flags/qa.svg',
  './assets/flags/ro.svg',
  './assets/flags/rs.svg',
  './assets/flags/ru.svg',
  './assets/flags/rw.svg',
  './assets/flags/sa.svg',
  './assets/flags/sb.svg',
  './assets/flags/sc.svg',
  './assets/flags/sd.svg',
  './assets/flags/se.svg',
  './assets/flags/sg.svg',
  './assets/flags/si.svg',
  './assets/flags/sk.svg',
  './assets/flags/sl.svg',
  './assets/flags/sm.svg',
  './assets/flags/sn.svg',
  './assets/flags/so.svg',
  './assets/flags/sr.svg',
  './assets/flags/ss.svg',
  './assets/flags/st.svg',
  './assets/flags/sv.svg',
  './assets/flags/sy.svg',
  './assets/flags/sz.svg',
  './assets/flags/td.svg',
  './assets/flags/tg.svg',
  './assets/flags/th.svg',
  './assets/flags/tj.svg',
  './assets/flags/tl.svg',
  './assets/flags/tm.svg',
  './assets/flags/tn.svg',
  './assets/flags/to.svg',
  './assets/flags/tr.svg',
  './assets/flags/tt.svg',
  './assets/flags/tv.svg',
  './assets/flags/tz.svg',
  './assets/flags/ua.svg',
  './assets/flags/ug.svg',
  './assets/flags/us.svg',
  './assets/flags/uy.svg',
  './assets/flags/uz.svg',
  './assets/flags/vc.svg',
  './assets/flags/ve.svg',
  './assets/flags/vn.svg',
  './assets/flags/vu.svg',
  './assets/flags/ws.svg',
  './assets/flags/ye.svg',
  './assets/flags/za.svg',
  './assets/flags/zm.svg',
  './assets/flags/zw.svg'
];

const FLAG_PATH_PREFIX = new URL('./assets/flags/', self.location).pathname;
let flagFetchQueue = Promise.resolve();

function cacheResponse(request, response) {
  if (!response.ok) return response;

  return caches.open(CACHE_NAME)
    .then(cache => cache.put(request, response.clone()))
    .then(() => response);
}

function fetchAndCache(request) {
  return fetch(request).then(response => cacheResponse(request, response));
}

async function precacheFlags(cache) {
  for (const asset of FLAG_ASSETS) {
    await cache.add(asset);
  }
}

function fetchFlagSequentially(request) {
  const fetchTask = () => caches.match(request, { ignoreSearch: true })
    .then(cached => cached || fetchAndCache(request));
  const queuedRequest = flagFetchQueue.then(fetchTask, fetchTask);
  flagFetchQueue = queuedRequest.catch(() => undefined);
  return queuedRequest;
}

function isFlagRequest(url) {
  return url.pathname.startsWith(FLAG_PATH_PREFIX);
}

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      await cache.addAll(APP_ASSETS);
      await precacheFlags(cache);
      self.skipWaiting();
    })
  );
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
  const isFlag = isFlagRequest(url);

  event.respondWith(
    // O index usa querystrings para cache busting; ignoreSearch mantém esses
    // recursos disponíveis offline mesmo quando o cache guarda o caminho base.
    caches.match(event.request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;

      const responsePromise = isFlag
        ? fetchFlagSequentially(event.request)
        : fetchAndCache(event.request);

      return responsePromise.catch(() => {
        if (isNavigate) {
          return caches.match('./index.html');
        }
      });
    })
  );
});
