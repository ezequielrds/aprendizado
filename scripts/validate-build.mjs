import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import worldMap from '../data/world-map.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');
const countries = JSON.parse(read('data/countries.json'));
const flagsDirectory = path.join(root, 'assets/flags');
const mapLicense = read('assets/maps/CC-BY-4.0.md');

assert.equal(countries.length, 193, 'countries.json precisa ter 193 registros');
assert.equal(new Set(countries.map(country => country.code)).size, 193, 'codigos de pais devem ser unicos');
assert.equal(new Set(countries.map(country => country.namePtBr)).size, 193, 'nomes de pais devem ser unicos');
assert.equal(new Set(countries.map(country => country.normalizedName)).size, 193, 'nomes normalizados devem ser unicos');
assert.equal(worldMap.locations.length, 256, 'o atlas mundial esperado precisa ter 256 localizacoes');
const mapCodes = new Set(worldMap.locations.map(location => String(location.id).toUpperCase()));
for (const country of countries) {
  assert.equal(mapCodes.has(country.code), true, `${country.code}: pais ausente no atlas mundial`);
}
assert.match(mapLicense, /CC-BY-4\.0|Attribution 4\.0 International/u, 'a atribuicao do atlas precisa estar presente');

for (const country of countries) {
  const expectedAsset = `assets/flags/${country.code.toLowerCase()}.svg`;
  assert.equal(country.flagAsset, expectedAsset, `${country.code}: asset fora do padrao`);
  const svg = read(country.flagAsset);
  assert.match(svg, /<svg\b/, `${country.code}: SVG invalido`);
}

const svgFiles = fs.readdirSync(flagsDirectory).filter(file => file.endsWith('.svg'));
assert.equal(svgFiles.length, 193, 'a pasta de bandeiras precisa ter exatamente 193 SVGs');

const runtimeFiles = [
  'index.html',
  'script.js',
  'styles.css',
  'sw.js',
  'data/world-map.js',
  ...fs.readdirSync(path.join(root, 'modules')).map(file => path.join('modules', file)),
];
for (const relativeFile of runtimeFiles) {
  const source = read(relativeFile);
  assert.doesNotMatch(
    source,
    /(?:fetch|import|src|href)\s*\(?\s*['"`]https?:\/\//,
    `${relativeFile}: runtime nao pode acessar URL remota`,
  );
}

const moduleFiles = fs.readdirSync(path.join(root, 'modules')).filter(file => file.endsWith('.js'));
for (const moduleFile of moduleFiles) {
  execFileSync(process.execPath, ['--check', path.join(root, 'modules', moduleFile)], { stdio: 'ignore' });
}
execFileSync(process.execPath, ['--check', path.join(root, 'script.js')], { stdio: 'ignore' });
execFileSync(process.execPath, ['--check', path.join(root, 'sw.js')], { stdio: 'ignore' });
execFileSync(process.execPath, ['--check', path.join(root, 'data/world-map.js')], { stdio: 'ignore' });

const index = read('index.html');
const serviceWorker = read('sw.js');
const flagsModule = read('modules/flags.js');
const appAssets = serviceWorker.match(/const APP_ASSETS = \[[\s\S]*?\n\];/u)?.[0] || '';
const flagAssets = serviceWorker.match(/const FLAG_ASSETS = \[[\s\S]*?\n\];/u)?.[0] || '';
const installHandler = serviceWorker.match(/self\.addEventListener\('install',[\s\S]*?\n\}\);/u)?.[0] || '';
const preloadCount = Number(flagsModule.match(/const FLAGS_PRELOAD_COUNT = (\d+)/u)?.[1]);
assert.ok(appAssets, 'APP_ASSETS precisa existir');
assert.ok(flagAssets, 'FLAG_ASSETS precisa existir');
assert.ok(installHandler, 'o handler de install precisa existir');
for (const moduleFile of moduleFiles) {
  assert.ok(appAssets.includes(`./modules/${moduleFile}`), `${moduleFile}: modulo ausente do APP_ASSETS`);
}
assert.match(index, /id="modeFlagsBtn"/);
assert.match(index, /id="flagsMapTrigger"/);
assert.match(index, /id="flagsMapPanel"[^>]*role="dialog"/u);
assert.match(index, /script\.js\?v=2\.1\.8/);
assert.match(serviceWorker, /aprendizagem-cache-v15/);
assert.match(serviceWorker, /\.\/data\/countries\.json/);
assert.match(appAssets, /\.\/data\/world-map\.js/);
assert.match(appAssets, /\.\/assets\/maps\/CC-BY-4\.0\.md/);
assert.match(serviceWorker, /ignoreSearch:\s*true/);
assert.doesNotMatch(appAssets, /assets\/flags\//u, 'o precache nao deve listar bandeiras');
const listedFlagAssets = [...flagAssets.matchAll(/('\.\/assets\/flags\/[a-z]{2}\.svg')/gu)]
  .map(match => match[1].slice(1, -1));
assert.deepEqual(
  listedFlagAssets,
  countries.map(country => `./${country.flagAsset}`),
  'FLAG_ASSETS precisa listar as 193 bandeiras na ordem do catalogo',
);
assert.match(installHandler, /await precacheFlags\(cache\)/u);
assert.match(serviceWorker, /for \(const asset of FLAG_ASSETS\)/u);
assert.match(serviceWorker, /await cache\.add\(asset\)/u);
assert.match(serviceWorker, /let flagFetchQueue = Promise\.resolve\(\)/u);
assert.match(serviceWorker, /flagFetchQueue\.then\(fetchTask, fetchTask\)/u);
assert.ok(Number.isInteger(preloadCount) && preloadCount <= 2, 'preload deve limitar-se a uma ou duas bandeiras');

console.log(`Build valido: ${countries.length} paises, ${svgFiles.length} bandeiras locais, ${moduleFiles.length} modulos verificados.`);
