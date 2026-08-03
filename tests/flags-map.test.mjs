import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import worldMap from '../data/world-map.js';
import * as flagMapLogic from '../modules/flagsMapLogic.js';
import {
  FLAG_MAP_INITIAL_PADDING,
  FLAG_MAP_ZOOM_MAX_LEVEL,
  FLAG_MAP_ZOOM_MIN_LEVEL,
  calculateFlagMapViewport,
  canOpenFlagMap,
  getFlagMapFocusPoint,
  selectFlagMapContext,
  zoomFlagMapViewport,
} from '../modules/flagsMapLogic.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const countries = JSON.parse(fs.readFileSync(path.join(root, 'data/countries.json'), 'utf8'));
const indexSource = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const flagsSource = fs.readFileSync(path.join(root, 'modules/flags.js'), 'utf8');
const serviceWorkerSource = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const stylesSource = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');

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

test('a renderizacao preserva todo o atlas e deixa somente o alvo por cima', () => {
  const orderLocations = flagMapLogic.orderFlagMapLocations;
  assert.equal(typeof orderLocations, 'function');

  const ordered = orderLocations('NZ', worldMap.locations);
  assert.equal(ordered.length, worldMap.locations.length);
  assert.deepEqual(locationCodes(ordered), locationCodes(worldMap.locations));
  assert.equal(ordered.at(-1)?.id, 'nz');
  assert.match(flagsSource, /const locationsToRender = orderFlagMapLocations\(targetCode, worldMap\.locations\);/u);
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

test('o mapa abre com uma margem inicial mais ampla para mostrar mais contexto', () => {
  const context = selectFlagMapContext('HU', worldMap.locations);
  const compactViewport = calculateFlagMapViewport(context, worldMap.viewBox, .12);
  const initialViewport = calculateFlagMapViewport(context, worldMap.viewBox, FLAG_MAP_INITIAL_PADDING);

  assert.ok(FLAG_MAP_INITIAL_PADDING > .12);
  assert.ok(initialViewport.width > compactViewport.width);
  assert.ok(initialViewport.height > compactViewport.height);
});

test('o zoom preserva o centro e respeita os limites do mapa', () => {
  const context = selectFlagMapContext('HU', worldMap.locations);
  const viewport = calculateFlagMapViewport(context, worldMap.viewBox, FLAG_MAP_INITIAL_PADDING);
  const closer = zoomFlagMapViewport(viewport, worldMap.viewBox, 1);
  const farther = zoomFlagMapViewport(viewport, worldMap.viewBox, -1);
  const minLevel = zoomFlagMapViewport(viewport, worldMap.viewBox, -99);
  const maxLevel = zoomFlagMapViewport(viewport, worldMap.viewBox, 99);
  const centerX = viewport.x + viewport.width / 2;
  const centerY = viewport.y + viewport.height / 2;

  assert.ok(closer.width < viewport.width);
  assert.ok(closer.height < viewport.height);
  assert.ok(farther.width > viewport.width);
  assert.ok(farther.height > viewport.height);
  assert.ok(Math.abs((closer.x + closer.width / 2) - centerX) < .01);
  assert.ok(Math.abs((closer.y + closer.height / 2) - centerY) < .01);
  assert.ok(farther.x >= 0);
  assert.ok(farther.y >= 0);
  assert.equal(minLevel.level, FLAG_MAP_ZOOM_MIN_LEVEL);
  assert.equal(maxLevel.level, FLAG_MAP_ZOOM_MAX_LEVEL);
});

test('o menor zoom sempre revela o mapa mundi completo', () => {
  const [x, y, width, height] = worldMap.viewBox.split(/\s+/u).map(Number);

  for (const country of countries) {
    const context = selectFlagMapContext(country.code, worldMap.locations);
    const baseViewport = calculateFlagMapViewport(context, worldMap.viewBox, FLAG_MAP_INITIAL_PADDING);
    const farthest = zoomFlagMapViewport(baseViewport, worldMap.viewBox, FLAG_MAP_ZOOM_MIN_LEVEL);

    assert.deepEqual(
      { x: farthest.x, y: farthest.y, width: farthest.width, height: farthest.height, viewBox: farthest.viewBox },
      { x, y, width, height, viewBox: worldMap.viewBox },
      `${country.code}: o limite de afastamento deve mostrar o mapa mundi`,
    );
  }
});

test('a cópia do atlas só aparece quando a viewport atravessa o antimeridiano', () => {
  const shouldShowContinuation = flagMapLogic.shouldShowFlagMapContinuation;
  assert.equal(typeof shouldShowContinuation, 'function');

  const [x, y, width, height] = worldMap.viewBox.split(/\s+/u).map(Number);
  assert.equal(shouldShowContinuation({ x, y, width, height }, worldMap.viewBox), false);
  assert.equal(shouldShowContinuation({ x: x - 10, y, width: 20, height }, worldMap.viewBox), false);
  assert.equal(shouldShowContinuation({ x: x + width - 10, y, width: 20, height }, worldMap.viewBox), true);
  assert.match(flagsSource, /shouldShowFlagMapContinuation\(viewport, worldMap\.viewBox\)/u);
  assert.match(flagsSource, /path\.style\.display = showMapContinuation \? '' : 'none';/u);
});

test('o zoom continua dentro dos limites para todos os contextos de paises', () => {
  const [worldX, worldY, worldWidth, worldHeight] = worldMap.viewBox.split(/\s+/u).map(Number);

  for (const country of countries) {
    const context = selectFlagMapContext(country.code, worldMap.locations);
    const baseViewport = calculateFlagMapViewport(context, worldMap.viewBox, FLAG_MAP_INITIAL_PADDING);

    for (const level of [FLAG_MAP_ZOOM_MIN_LEVEL, 0, FLAG_MAP_ZOOM_MAX_LEVEL]) {
      const viewport = zoomFlagMapViewport(baseViewport, worldMap.viewBox, level);
      assert.ok(Number.isFinite(viewport.x), `${country.code}: x deve ser finito`);
      assert.ok(Number.isFinite(viewport.y), `${country.code}: y deve ser finito`);
      assert.ok(viewport.width > 0, `${country.code}: largura deve ser positiva`);
      assert.ok(viewport.height > 0, `${country.code}: altura deve ser positiva`);
      assert.ok(viewport.x >= worldX, `${country.code}: nao pode ultrapassar a borda oeste`);
      assert.ok(viewport.y >= worldY, `${country.code}: nao pode ultrapassar a borda norte`);
      assert.ok(viewport.x + viewport.width <= worldX + worldWidth * 1.2 + .01, `${country.code}: nao pode se afastar demais a leste`);
      assert.ok(viewport.y + viewport.height <= worldY + worldHeight + .01, `${country.code}: nao pode ultrapassar a borda sul`);
    }
  }
});

test('o zoom mantem o foco do pais-alvo visivel em todos os niveis de aproximacao', () => {
  for (const country of countries) {
    const targetLocation = worldMap.locations.find(location => location.id === country.code.toLowerCase());
    const context = selectFlagMapContext(country.code, worldMap.locations);
    const baseViewport = calculateFlagMapViewport(context, worldMap.viewBox, FLAG_MAP_INITIAL_PADDING);
    const focusPoint = getFlagMapFocusPoint(targetLocation, worldMap.viewBox);

    assert.ok(focusPoint, `${country.code}: foco do alvo deve existir`);
    for (let level = 0; level <= FLAG_MAP_ZOOM_MAX_LEVEL; level += 1) {
      const viewport = zoomFlagMapViewport(baseViewport, worldMap.viewBox, level, focusPoint);
      assert.ok(
        focusPoint.x >= viewport.x - .01 && focusPoint.x <= viewport.x + viewport.width + .01,
        `${country.code}: alvo deve permanecer visivel no zoom ${level}`,
      );
      assert.ok(
        focusPoint.y >= viewport.y - .01 && focusPoint.y <= viewport.y + viewport.height + .01,
        `${country.code}: alvo deve permanecer visivel no zoom ${level}`,
      );
    }
  }
});

test('o mapa mostra somente o pais-alvo pintado, sem marcador circular extra', () => {
  assert.match(flagsSource, /isTarget \? 'flags-map-country target' : 'flags-map-country context'/u);
  assert.doesNotMatch(flagsSource, /createElementNS\(SVG_NAMESPACE, 'circle'\)/u);
  assert.doesNotMatch(flagsSource, /flags-map-target-marker/u);
  assert.doesNotMatch(stylesSource, /flags-map-target-marker/u);
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

test('o painel oferece controles acessiveis para aproximar e afastar o mapa', () => {
  assert.match(indexSource, /class="flags-map-zoom-controls"[^>]*role="group"[^>]*aria-label="Controles de zoom do mapa"/u);
  assert.match(indexSource, /id="flagsMapZoomOutBtn"[^>]*type="button"[^>]*aria-label="Afastar o mapa"[^>]*aria-controls="flagsMapSvg"/u);
  assert.match(indexSource, /id="flagsMapZoomInBtn"[^>]*type="button"[^>]*aria-label="Aproximar o mapa"[^>]*aria-controls="flagsMapSvg"/u);
  assert.match(indexSource, /id="flagsMapZoomStatus"[^>]*role="status"/u);
  assert.match(flagsSource, /calculateFlagMapViewport\([^)]*FLAG_MAP_INITIAL_PADDING/u);
  assert.match(flagsSource, /zoomFlagMapViewport\([^)]*state\.flagsMapZoomLevel/u);
  assert.match(flagsSource, /flagsMapZoomOutBtn\.addEventListener\('click', \(\) => changeFlagMapZoom\(-1\)\)/u);
  assert.match(flagsSource, /flagsMapZoomInBtn\.addEventListener\('click', \(\) => changeFlagMapZoom\(1\)\)/u);
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
