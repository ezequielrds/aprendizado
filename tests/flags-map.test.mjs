import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import worldMap from '../data/world-map.js';
import {
  calculateFlagMapViewport,
  canOpenFlagMap,
  selectFlagMapContext,
} from '../modules/flagsMapLogic.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const countries = JSON.parse(fs.readFileSync(path.join(root, 'data/countries.json'), 'utf8'));
const indexSource = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const flagsSource = fs.readFileSync(path.join(root, 'modules/flags.js'), 'utf8');
const serviceWorkerSource = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

function locationCodes(locations) {
  return new Set(locations.map(location => String(location.id).toUpperCase()));
}

test('o mapa so pode abrir depois de uma rodada concluida', () => {
  assert.equal(canOpenFlagMap('playing'), false);
  assert.equal(canOpenFlagMap('correct'), true);
  assert.equal(canOpenFlagMap('revealed'), true);
  assert.equal(canOpenFlagMap('unknown'), false);
});

test('o atlas local cobre os 193 codigos da base de paises', () => {
  assert.equal(worldMap.locations.length, 256);
  const atlasCodes = locationCodes(worldMap.locations);
  for (const country of countries) {
    assert.equal(atlasCodes.has(country.code), true, country.code);
  }
});

test('o contexto da Nova Zelandia inclui a Australia e varios paises', () => {
  const context = selectFlagMapContext('NZ', worldMap.locations);
  const codes = locationCodes(context);
  assert.equal(codes.has('NZ'), true);
  assert.equal(codes.has('AU'), true);
  assert.ok(context.length >= 7);
});

test('ilhas pequenas recebem contexto regional em vez de ficarem isoladas', () => {
  for (const code of ['CV', 'FJ', 'KI', 'MV', 'SG']) {
    const context = selectFlagMapContext(code, worldMap.locations);
    assert.ok(context.length >= 5, code);
    assert.equal(locationCodes(context).has(code), true, code);
  }
});

test('o viewport do contexto e regional e inclui margem', () => {
  const context = selectFlagMapContext('NZ', worldMap.locations);
  const viewport = calculateFlagMapViewport(context, worldMap.viewBox);
  const [, , worldWidth, worldHeight] = worldMap.viewBox.split(/\s+/u).map(Number);

  assert.ok(viewport.width < worldWidth);
  assert.ok(viewport.height < worldHeight);
  assert.ok(viewport.x <= viewport.contentX);
  assert.ok(viewport.y <= viewport.contentY);
  assert.ok(viewport.width > viewport.contentWidth);
  assert.ok(viewport.height > viewport.contentHeight);
});

test('cada pais possui um contexto minimo sem alterar o atlas', () => {
  const originalPaths = worldMap.locations.map(location => location.path);
  for (const country of countries) {
    const context = selectFlagMapContext(country.code, worldMap.locations);
    assert.ok(context.length >= 7, country.code);
    assert.equal(locationCodes(context).has(country.code), true, country.code);
  }
  assert.deepEqual(worldMap.locations.map(location => location.path), originalPaths);
});

test('o gatilho e o dialogo preservam o contrato de teclado e fechamento', () => {
  assert.match(indexSource, /<button id="flagsMapTrigger"[^>]*type="button"[^>]*disabled/u);
  assert.match(indexSource, /aria-label="Abrir mapa regional/u);
  assert.match(indexSource, /aria-controls="flagsMapPanel"/u);
  assert.match(indexSource, /id="flagsMapPanel"[^>]*role="dialog"/u);
  assert.match(indexSource, /id="flagsMapCloseBtn"[^>]*type="button"/u);
  assert.match(flagsSource, /canOpenFlagMap\(state\.flagsStatus\)/u);
  assert.match(flagsSource, /state\.flagsMapOpen = true/u);
  assert.match(flagsSource, /state\.flagsMapOpen = false/u);
  assert.match(flagsSource, /event\.key === 'Escape'/u);
  assert.match(flagsSource, /el\.flagsNextBtn\.addEventListener\('click', loadNextFlag\)/u);
});

test('o painel envia foco ao fechar e restaura foco somente em fechamentos do usuario', () => {
  assert.match(flagsSource, /state\.flagsMapReturnFocus\s*=\s*event\?\.currentTarget\s*\|\|\s*el\.flagsMapTrigger/u);
  assert.match(flagsSource, /el\.flagsMapPanel\.classList\.remove\('hidden'\)[\s\S]*?el\.flagsMapPanel\.setAttribute\('aria-hidden', 'false'\)[\s\S]*?el\.flagsMapCloseBtn\.focus\(\)/u);
  assert.match(flagsSource, /function closeFlagMap\(\{\s*restoreFocus = false\s*\}\s*=\s*\{\}\)/u);
  assert.match(flagsSource, /if \(\s*restoreFocus\b[\s\S]*?state\.flagsMapReturnFocus[\s\S]*?\.focus\(\)/u);
  assert.match(flagsSource, /el\.flagsMapCloseBtn\.addEventListener\('click', \(\) => closeFlagMap\(\{ restoreFocus: true \}\)\)/u);
  assert.match(flagsSource, /event\.key === 'Escape'[\s\S]*?closeFlagMap\(\{ restoreFocus: true \}\)/u);
  assert.match(flagsSource, /closeFlagMap\(\);/u);
});

test('o painel aberto confina Tab e bloqueia teclas do jogo subjacente', () => {
  assert.match(flagsSource, /function getFlagMapFocusableElements\(\)/u);
  assert.match(flagsSource, /flagsMapPanel\.querySelectorAll\([^)]+\)/u);
  assert.match(flagsSource, /if \(state\.flagsMapOpen\)[\s\S]*?event\.key === 'Tab'[\s\S]*?trapFlagMapFocus\(event\)/u);
  assert.match(flagsSource, /function trapFlagMapFocus\(event\)[\s\S]*?event\.preventDefault\(\)[\s\S]*?focus\(\)/u);
  assert.match(flagsSource, /if \(state\.flagsMapOpen\)[\s\S]*?event\.preventDefault\(\)[\s\S]*?return;/u);
});

test('o painel interno nao declara um segundo modal', () => {
  const mapPanelTag = indexSource.match(/<section id="flagsMapPanel"[^>]*>/u)?.[0] || '';
  assert.match(mapPanelTag, /role="dialog"/u);
  assert.match(mapPanelTag, /aria-labelledby="flagsMapTitle"/u);
  assert.match(mapPanelTag, /aria-describedby="flagsMapDescription"/u);
  assert.doesNotMatch(mapPanelTag, /aria-modal=/u);
});

test('o atlas e precacheado offline sem transformar cada pais em download separado', () => {
  const appAssets = serviceWorkerSource.match(/const APP_ASSETS = \[[\s\S]*?\n\];/u)?.[0] || '';
  assert.match(appAssets, /\.\/data\/world-map\.js/u);
  assert.doesNotMatch(appAssets, /assets\/maps\/world/u);
  assert.match(serviceWorkerSource, /assets\/maps\/CC-BY-4\.0\.md/u);
});

test('o mapa nao depende de runtime remoto', () => {
  const runtimeFiles = [
    'index.html',
    'script.js',
    'styles.css',
    'sw.js',
    'data/world-map.js',
    ...fs.readdirSync(path.join(root, 'modules')).map(file => path.join('modules', file)),
  ];
  for (const relativeFile of runtimeFiles) {
    const source = fs.readFileSync(path.join(root, relativeFile), 'utf8');
    assert.doesNotMatch(source, /(?:fetch|import|src|href)\s*\(?\s*['"`]https?:\/\//u, relativeFile);
  }
});
