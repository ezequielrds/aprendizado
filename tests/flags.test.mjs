import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import {
  FLAGS_MAX_SCORE,
  FLAGS_POINTS_PER_ROUND,
  FLAGS_ROUND_COUNT,
  answersMatch,
  applyRoundScore,
  buildFlagLetterPool,
  canBuildAnswerFromPool,
  getAvailablePoints,
  getHintIndex,
  getNormalizedLetters,
  getRoundPoints,
  isFullyRevealed,
  isLastFlagRound,
  normalizeCountryAnswer,
  selectFlagCountries,
  shouldShowFlagHint,
} from '../modules/flagsLogic.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const countries = JSON.parse(fs.readFileSync(path.join(root, 'data/countries.json'), 'utf8'));
const countryCuriositiesPath = path.join(root, 'data/country-curiosities.pt-BR.json');
const serviceWorkerSource = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

test('cada país tem uma curiosidade local, interessante e rastreável', () => {
  assert.equal(fs.existsSync(countryCuriositiesPath), true, 'a base de curiosidades precisa existir');
  if (!fs.existsSync(countryCuriositiesPath)) return;

  const curiosities = JSON.parse(fs.readFileSync(countryCuriositiesPath, 'utf8'));
  assert.deepEqual(Object.keys(curiosities).sort(), countries.map(country => country.code).sort());
  for (const country of countries) {
    const curiosity = curiosities[country.code];
    assert.equal(typeof curiosity?.text, 'string', `${country.code}: curiosidade deve ser texto`);
    assert.ok(curiosity.text.trim(), `${country.code}: curiosidade não pode ser vazia`);
    assert.ok(curiosity.text.length <= 110, `${country.code}: curiosidade deve ser curta`);
    assert.equal(typeof curiosity?.source, 'string', `${country.code}: fonte deve ser texto`);
    assert.match(curiosity.source, /^https:\/\//u, `${country.code}: fonte deve usar HTTPS`);
    assert.doesNotMatch(curiosity.text, /\bcapital\b/ui, `${country.code}: curiosidade não pode mencionar capital`);
  }
});

test('a base local contem exatamente 193 paises', () => {
  assert.equal(countries.length, 193);
});

test('os codigos e nomes nao se repetem', () => {
  assert.equal(new Set(countries.map(country => country.code)).size, 193);
  assert.equal(new Set(countries.map(country => country.namePtBr)).size, 193);
  assert.equal(new Set(countries.map(country => normalizeCountryAnswer(country.normalizedName))).size, 193);
});

test('cada pais possui uma bandeira SVG local associada ao proprio codigo', () => {
  for (const country of countries) {
    assert.match(country.code, /^[A-Z]{2}$/);
    assert.equal(normalizeCountryAnswer(country.namePtBr), normalizeCountryAnswer(country.normalizedName));
    assert.equal(country.flagAsset, `assets/flags/${country.code.toLowerCase()}.svg`);
    const svgPath = path.join(root, country.flagAsset);
    assert.equal(fs.existsSync(svgPath), true, country.code);
    assert.match(fs.readFileSync(svgPath, 'utf8'), /<svg\b/);
  }
  const svgFiles = fs.readdirSync(path.join(root, 'assets/flags')).filter(file => file.endsWith('.svg'));
  assert.equal(svgFiles.length, 193);
});

test('a bandeira do Peru usa o pavilhão nacional com escudo', () => {
  const peru = countries.find(country => country.code === 'PE');
  assert.ok(peru);

  const peruFlag = fs.readFileSync(path.join(root, peru.flagAsset), 'utf8');
  assert.match(peruFlag, /data-flag-variant="pavilhao-nacional-com-escudo"/u);
  assert.match(peruFlag, /<title[^>]*>Pavilhão nacional do Peru com escudo nacional<\/title>/u);
  assert.match(peruFlag, /<desc[^>]*>Faixas verticais vermelhas e branca com o escudo nacional centralizado\.<\/desc>/u);
  assert.ok((peruFlag.match(/<(?:path|g|use)\b/gu) || []).length > 4, 'o SVG deve incluir a geometria detalhada do escudo');
  assert.doesNotMatch(peruFlag, /(?:href|xlink:href)="https?:\/\//u, 'o SVG deve permanecer inteiramente local');
});

test('a bandeira do Peru declara um viewBox responsivo na proporção oficial de 3 por 2', () => {
  const peru = countries.find(country => country.code === 'PE');
  assert.ok(peru);

  const peruFlag = fs.readFileSync(path.join(root, peru.flagAsset), 'utf8');
  assert.match(peruFlag, /<svg\b[^>]*\bviewBox="0 0 900 600"/u);
});

test('uma partida seleciona exatamente 30 paises', () => {
  const selected = selectFlagCountries(countries, FLAGS_ROUND_COUNT, () => 0.42);
  assert.equal(selected.length, 30);
});

test('uma partida nao possui repeticao', () => {
  const selected = selectFlagCountries(countries, FLAGS_ROUND_COUNT, () => 0.42);
  assert.equal(new Set(selected.map(country => country.code)).size, 30);
});

test('dois sorteios deterministas podem produzir conjuntos diferentes', () => {
  const first = selectFlagCountries(countries, FLAGS_ROUND_COUNT, () => 0);
  const second = selectFlagCountries(countries, FLAGS_ROUND_COUNT, () => 0.999999);
  assert.notDeepEqual(first.map(country => country.code), second.map(country => country.code));
});

test('a rodada comeca em 40 pontos', () => {
  assert.equal(getAvailablePoints(0), FLAGS_POINTS_PER_ROUND);
  assert.equal(getRoundPoints({ hintsUsed: 0, status: 'correct' }), 40);
});

test('cada dica reduz 10 pontos', () => {
  assert.deepEqual([0, 1, 2, 3, 4].map(getAvailablePoints), [40, 30, 20, 10, 0]);
});

test('a pontuacao nunca fica negativa', () => {
  assert.equal(getAvailablePoints(5), 0);
  assert.equal(getAvailablePoints(100), 0);
  assert.equal(getRoundPoints({ hintsUsed: 100, status: 'correct' }), 0);
});

test('quatro dicas valem zero pontos', () => {
  assert.equal(getRoundPoints({ hintsUsed: 4, status: 'correct' }), 0);
});

test('o botao de dica desaparece depois de mostrar a resposta', () => {
  assert.equal(shouldShowFlagHint('playing'), true);
  assert.equal(shouldShowFlagHint('revealed'), false);
});

test('uma resposta totalmente revelada vale zero', () => {
  assert.equal(getRoundPoints({ hintsUsed: 1, status: 'revealed', fullyRevealed: true }), 0);
  assert.equal(getRoundPoints({ hintsUsed: 0, status: 'correct', fullyRevealed: true }), 0);
});

test('a primeira dica escolhe a primeira posicao disponivel', () => {
  const letters = getNormalizedLetters('BRASIL');
  assert.equal(getHintIndex({ letters, revealedIndices: new Set(), answerSlots: [], hintNumber: 1 }), 0);
});

test('a segunda dica escolhe a ultima posicao disponivel', () => {
  const letters = getNormalizedLetters('BRASIL');
  assert.equal(getHintIndex({ letters, revealedIndices: new Set([0]), answerSlots: [], hintNumber: 2 }), 5);
});

test('a terceira dica volta a escolher da esquerda', () => {
  const letters = getNormalizedLetters('BRASIL');
  assert.equal(getHintIndex({ letters, revealedIndices: new Set([0, 5]), answerSlots: [], hintNumber: 3 }), 1);
});

test('a quarta dica alterna novamente para a direita', () => {
  const letters = getNormalizedLetters('BRASIL');
  assert.equal(getHintIndex({ letters, revealedIndices: new Set([0, 5, 1]), answerSlots: [], hintNumber: 4 }), 4);
});

test('dicas ignoram posicoes ja corretamente preenchidas', () => {
  const letters = getNormalizedLetters('BRASIL');
  const slots = [{ letter: 'B' }, null, null, null, null, null];
  assert.equal(getHintIndex({ letters, revealedIndices: new Set(), answerSlots: slots, hintNumber: 1 }), 1);
});

test('espacos e hifens nao viram letras selecionaveis', () => {
  assert.deepEqual(getNormalizedLetters('Timor-Leste'), [...'TIMORLESTE']);
  assert.equal(normalizeCountryAnswer('  Costa   do - Marfim '), 'COSTADOMARFIM');
});

test('acentos e cedilha nao impedem a validacao', () => {
  assert.equal(answersMatch('IRÃ', 'Irã'), true);
  assert.equal(answersMatch('COSTA DO MARFIM', 'Costa do Marfim'), true);
  assert.equal(answersMatch('TIMOR LESTE', 'Timor-Leste'), true);
});

test('letras extras nao sao necessarias para montar a resposta', () => {
  const pool = buildFlagLetterPool('BRASIL', 6, () => 0.37);
  assert.equal(pool.length, 12);
  assert.equal(canBuildAnswerFromPool('BRASIL', pool), true);
  assert.equal(pool.filter(letter => !new Set('BRASIL'.split('')).has(letter)).length, 6);
});

test('a pontuacao de uma rodada nao duplica', () => {
  const first = applyRoundScore({ total: 0, points: 30, status: 'correct' });
  const second = applyRoundScore({
    total: first.total,
    points: 30,
    status: 'correct',
    alreadyScored: first.scored,
  });
  assert.equal(first.total, 30);
  assert.equal(second.total, 30);
  assert.equal(second.awarded, 0);
});

test('a partida termina depois da bandeira 30', () => {
  assert.equal(isLastFlagRound(28), false);
  assert.equal(isLastFlagRound(29), true);
});

test('o maximo e 1.200 pontos', () => {
  assert.equal(FLAGS_MAX_SCORE, 1200);
  assert.equal(30 * getRoundPoints({ hintsUsed: 0, status: 'correct' }), 1200);
});

test('a selecao local nao depende de URLs remotas em runtime', () => {
  const runtimeFiles = [
    'index.html',
    'script.js',
    'styles.css',
    'sw.js',
    ...fs.readdirSync(path.join(root, 'modules')).map(file => path.join('modules', file)),
  ];
  for (const relativeFile of runtimeFiles) {
    const source = fs.readFileSync(path.join(root, relativeFile), 'utf8');
    assert.doesNotMatch(source, /(?:fetch|import|src|href)\s*\(?\s*['"`]https?:\/\//, relativeFile);
  }
});

test('o install precacheia as 193 bandeiras em serie antes de solicitar a ativacao', async () => {
  const appAssets = serviceWorkerSource.match(/const APP_ASSETS = \[[\s\S]*?\n\];/u)?.[0] || '';
  const installHandler = serviceWorkerSource.match(/self\.addEventListener\('install',[\s\S]*?\n\}\);/u)?.[0] || '';
  assert.ok(appAssets);
  assert.ok(installHandler);
  assert.doesNotMatch(appAssets, /assets\/flags\//u);
  assert.match(installHandler, /cache\.addAll\(APP_ASSETS\)/u);
  assert.match(installHandler, /await precacheFlags\(cache\)/u);
  assert.match(serviceWorkerSource, /const FLAG_ASSETS = \[/u);
  assert.match(serviceWorkerSource, /for \(const asset of FLAG_ASSETS\)/u);
  assert.match(serviceWorkerSource, /await cache\.add\(asset\)/u);

  const listeners = new Map();
  const appCachedAssets = [];
  const cachedFlagUrls = [];
  let activeFlagAdds = 0;
  let maximumActiveFlagAdds = 0;
  let skipWaitingCalled = false;
  let allFlagsCachedWhenSkipWaiting = false;
  let installFinished = false;
  let activationOccurred = false;
  let activationBeforeInstallFinished = false;
  let installPromise;
  const self = {
    location: new URL('https://aprendizado.test/'),
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    skipWaiting() {
      skipWaitingCalled = true;
      allFlagsCachedWhenSkipWaiting = cachedFlagUrls.length === countries.length && activeFlagAdds === 0;
      Promise.resolve(installPromise).then(() => {
        activationBeforeInstallFinished = !installFinished;
        activationOccurred = true;
      });
    },
  };
  const cache = {
    async addAll(requests) {
      assert.ok(requests.every(asset => !asset.includes('/assets/flags/')));
      appCachedAssets.push(...requests);
    },
    add(request) {
      const url = new URL(request, self.location).href;
      activeFlagAdds++;
      maximumActiveFlagAdds = Math.max(maximumActiveFlagAdds, activeFlagAdds);
      return Promise.resolve().then(() => {
        cachedFlagUrls.push(url);
        activeFlagAdds--;
      });
    },
  };
  const caches = {
    async open() {
      return cache;
    },
  };

  vm.runInNewContext(serviceWorkerSource, {
    Promise,
    URL,
    caches,
    console,
    self,
    setTimeout,
  });

  const installHandlerFromContext = listeners.get('install');
  assert.equal(typeof installHandlerFromContext, 'function');
  const installEvent = {
    waitUntil(promise) {
      installPromise = Promise.resolve(promise).then(() => {
        installFinished = true;
      });
    },
  };

  installHandlerFromContext(installEvent);
  assert.ok(installPromise);
  assert.equal(skipWaitingCalled, false);
  await installPromise;
  await Promise.resolve();

  assert.equal(appCachedAssets.some(asset => asset.includes('/assets/flags/')), false);
  assert.equal(cachedFlagUrls.length, 193);
  assert.equal(new Set(cachedFlagUrls).size, 193);
  assert.deepEqual(
    cachedFlagUrls,
    countries.map(country => new URL(`./${country.flagAsset}`, self.location).href),
  );
  assert.equal(maximumActiveFlagAdds, 1);
  assert.equal(skipWaitingCalled, true);
  // Shell-first: o skipWaiting roda assim que o shell do app está em cache,
  // antes das 193 bandeiras terminarem (elas continuam em segundo plano).
  assert.equal(allFlagsCachedWhenSkipWaiting, false);
  assert.equal(activationOccurred, true);
  assert.equal(activationBeforeInstallFinished, false);
});

test('o precache nao inclui bandeiras no APP_ASSETS e o Service Worker serializa seus fetches', async () => {
  const appAssets = serviceWorkerSource.match(/const APP_ASSETS = \[[\s\S]*?\n\];/u)?.[0] || '';
  const installHandler = serviceWorkerSource.match(/self\.addEventListener\('install',[\s\S]*?\n\}\);/u)?.[0] || '';
  assert.ok(appAssets);
  assert.ok(installHandler);
  assert.doesNotMatch(appAssets, /assets\/flags\//u);
  assert.match(serviceWorkerSource, /cache\.addAll\(APP_ASSETS\)/u);
  assert.match(installHandler, /precacheFlags\(cache\)/u);
  assert.match(serviceWorkerSource, /let flagFetchQueue = Promise\.resolve\(\)/u);
  assert.match(serviceWorkerSource, /flagFetchQueue\.then\(fetchTask, fetchTask\)/u);

  const listeners = new Map();
  const cachedResponses = new Map();
  let activeFetches = 0;
  let maximumActiveFetches = 0;
  const fetchedUrls = [];
  const cache = {
    async addAll() {},
    async match(request) {
      return cachedResponses.get(request.url);
    },
    async put(request, response) {
      cachedResponses.set(request.url, response);
    },
  };
  const caches = {
    async open() {
      return cache;
    },
    async match(request) {
      return cache.match(request);
    },
    async keys() {
      return [];
    },
    async delete() {
      return true;
    },
  };
  const self = {
    location: new URL('https://aprendizado.test/'),
    clients: { claim() {} },
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    skipWaiting() {},
  };

  const fetchStub = request => {
    activeFetches++;
    maximumActiveFetches = Math.max(maximumActiveFetches, activeFetches);
    fetchedUrls.push(request.url);
    return new Promise(resolve => {
      setTimeout(() => {
        activeFetches--;
        resolve({ ok: true, clone: () => ({ ok: true }) });
      }, 5);
    });
  };

  vm.runInNewContext(serviceWorkerSource, {
    Promise,
    URL,
    caches,
    console,
    fetch: fetchStub,
    self,
    setTimeout,
  });

  const fetchHandler = listeners.get('fetch');
  assert.equal(typeof fetchHandler, 'function');

  const makeEvent = url => {
    const event = {
      request: { method: 'GET', mode: 'no-cors', url },
      respondWith(responsePromise) {
        event.responsePromise = responsePromise;
      },
    };
    return event;
  };
  const firstEvent = makeEvent('https://aprendizado.test/assets/flags/br.svg');
  const secondEvent = makeEvent('https://aprendizado.test/assets/flags/ca.svg');

  fetchHandler(firstEvent);
  fetchHandler(secondEvent);
  await Promise.all([firstEvent.responsePromise, secondEvent.responsePromise]);

  assert.equal(maximumActiveFetches, 1);
  assert.deepEqual(fetchedUrls, [
    'https://aprendizado.test/assets/flags/br.svg',
    'https://aprendizado.test/assets/flags/ca.svg',
  ]);
});

test('a UI pre-carrega no maximo a proxima bandeira', () => {
  const flagsSource = fs.readFileSync(path.join(root, 'modules/flags.js'), 'utf8');
  const preloadCount = Number(flagsSource.match(/const FLAGS_PRELOAD_COUNT = (\d+)/u)?.[1]);
  assert.ok(Number.isInteger(preloadCount));
  assert.ok(preloadCount >= 0 && preloadCount <= 2);
  assert.match(flagsSource, /state\.flagsCountries\.slice\(/u);
  assert.match(flagsSource, /state\.flagsIndex \+ 1/u);
});
