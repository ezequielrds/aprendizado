const MAP_NUMBER_PATTERN = /[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?|[a-zA-Z]/gu;
const LOCATION_BOUNDS_CACHE = new WeakMap();

export const FLAG_MAP_MIN_CONTEXT = 7;
export const FLAG_MAP_INITIAL_PADDING = .22;
export const FLAG_MAP_ZOOM_MIN_LEVEL = -2;
export const FLAG_MAP_ZOOM_MAX_LEVEL = 3;

const FLAG_MAP_ZOOM_SCALE_PER_LEVEL = .8;

const SMALL_ISLAND_CONTEXTS = {
  nz: ['au', 'fj', 'vu', 'nc', 'pg', 'sb', 'to', 'ws', 'as'],
  cv: ['sn', 'gm', 'mr', 'gw', 'sl', 'lr', 'ci'],
  fj: ['au', 'nz', 'vu', 'to', 'ws', 'sb', 'nc', 'pg'],
  mv: ['lk', 'in', 'bd', 'np', 'om', 'sc', 'so', 'ye'],
  sg: ['my', 'id', 'bn', 'th', 'kh', 'vn', 'la'],
  mt: ['it', 'tn', 'ly', 'gr', 'al'],
  cy: ['tr', 'gr', 'lb', 'sy', 'eg', 'il'],
  is: ['gb', 'ie', 'fo', 'no', 'dk'],
  sc: ['mg', 'mu', 'km', 'tz', 'so', 're'],
  mu: ['mg', 'sc', 'km', 'tz', 'za', 're'],
  km: ['mg', 'sc', 'tz', 'mz', 'mu'],
  st: ['ga', 'gq', 'cm', 'ng'],
  tl: ['id', 'au', 'pg', 'my'],
  sb: ['pg', 'vu', 'fj', 'to', 'ws', 'au'],
  vu: ['nc', 'fj', 'sb', 'to', 'au', 'nz'],
  to: ['fj', 'ws', 'vu', 'nz', 'tv'],
  ws: ['to', 'fj', 'as', 'nr', 'tv', 'vu'],
  tv: ['nr', 'fj', 'to', 'ws', 'mh'],
  nr: ['mh', 'tv', 'fm', 'pg', 'sb'],
  ki: ['nr', 'tv', 'mh', 'fj', 'sb', 'pg'],
  mh: ['fm', 'pw', 'nr', 'ph'],
  fm: ['pw', 'mh', 'pg', 'gu'],
  pw: ['ph', 'fm', 'id', 'pg', 'mh'],
  ag: ['dm', 'kn', 'lc', 'bb', 'gd', 'vc', 'tt'],
  bs: ['cu', 'us', 'ht', 'do', 'jm', 'tc'],
  bb: ['tt', 'gd', 'lc', 'vc', 'ag', 'dm'],
  dm: ['ag', 'kn', 'lc', 'gd', 'vc', 'tt'],
  gd: ['vc', 'lc', 'tt', 'bb', 'ag', 'dm'],
  jm: ['cu', 'ht', 'do', 'bs', 'us'],
  kn: ['ag', 'dm', 'ms', 'lc', 'vc', 'pr'],
  lc: ['dm', 'vc', 'gd', 'bb', 'tt', 'ag'],
  vc: ['gd', 'lc', 'bb', 'ag', 'dm', 'tt'],
  tt: ['ve', 'gd', 'bb', 'ag', 'lc', 'vc'],
  ad: ['es', 'fr', 'pt', 'it'],
  li: ['ch', 'at', 'de', 'it'],
  lu: ['be', 'fr', 'de', 'nl'],
  mc: ['fr', 'it', 'es'],
  sm: ['it', 'va', 'fr', 'ch'],
};

function normalizeCode(value) {
  return String(value ?? '').trim().toLowerCase();
}

function parseViewBox(viewBox) {
  const values = String(viewBox ?? '').trim().split(/[\s,]+/u).map(Number);
  if (values.length !== 4 || values.some(value => !Number.isFinite(value))) {
    return { x: 0, y: 0, width: 1010, height: 666 };
  }
  return { x: values[0], y: values[1], width: values[2], height: values[3] };
}

function addPoint(bounds, x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  bounds.minX = Math.min(bounds.minX, x);
  bounds.maxX = Math.max(bounds.maxX, x);
  bounds.minY = Math.min(bounds.minY, y);
  bounds.maxY = Math.max(bounds.maxY, y);
  bounds.hasPoint = true;
}

/**
 * Extrai os pontos das geometrias compactadas pelo atlas do svg-maps.
 * O atlas usa subcaminhos m/l relativos, portanto o cursor precisa ser acumulado.
 */
export function getFlagLocationBounds(location) {
  if (location && typeof location === 'object' && LOCATION_BOUNDS_CACHE.has(location)) {
    return LOCATION_BOUNDS_CACHE.get(location);
  }

  const tokens = [...String(location?.path ?? '').matchAll(MAP_NUMBER_PATTERN)].map(match => match[0]);
  let tokenIndex = 0;
  const bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, hasPoint: false };
  let command = '';
  let currentX = 0;
  let currentY = 0;
  let subpathX = 0;
  let subpathY = 0;

  const readNumber = () => {
    if (tokenIndex >= tokens.length) return null;
    const token = tokens[tokenIndex++];
    return /^[a-zA-Z]$/u.test(token) ? null : Number(token);
  };

  while (tokenIndex < tokens.length) {
    const token = tokens[tokenIndex];
    if (/^[a-zA-Z]$/u.test(token)) {
      command = tokens[tokenIndex++];
      if (command.toLowerCase() === 'z') {
        currentX = subpathX;
        currentY = subpathY;
      }
      continue;
    }

    if (!command || !['m', 'l'].includes(command.toLowerCase())) {
      tokenIndex++;
      continue;
    }

    const xValue = readNumber();
    const yValue = readNumber();
    if (xValue === null || yValue === null) continue;

    const relative = command === command.toLowerCase();
    if (relative) {
      currentX += xValue;
      currentY += yValue;
    } else {
      currentX = xValue;
      currentY = yValue;
    }
    addPoint(bounds, currentX, currentY);

    if (command.toLowerCase() === 'm') {
      subpathX = currentX;
      subpathY = currentY;
      command = relative ? 'l' : 'L';
    }
  }

  if (!bounds.hasPoint) {
    if (location && typeof location === 'object') LOCATION_BOUNDS_CACHE.set(location, null);
    return null;
  }
  const result = {
    minX: bounds.minX,
    maxX: bounds.maxX,
    minY: bounds.minY,
    maxY: bounds.maxY,
    width: Math.max(0, bounds.maxX - bounds.minX),
    height: Math.max(0, bounds.maxY - bounds.minY),
    centerX: (bounds.minX + bounds.maxX) / 2,
    centerY: (bounds.minY + bounds.maxY) / 2,
  };
  if (location && typeof location === 'object') LOCATION_BOUNDS_CACHE.set(location, result);
  return result;
}

/**
 * Retorna o ponto visual que representa o alvo no mapa. Países que cruzam o
 * antimeridiano são desenhados também à direita do atlas; o foco acompanha
 * essa cópia para que o país vermelho permaneça na viewport.
 */
export function getFlagMapFocusPoint(location, worldViewBox) {
  const bounds = getFlagLocationBounds(location);
  if (!bounds) return null;

  const world = parseViewBox(worldViewBox);
  if (isWrappedBounds(bounds)) {
    return {
      x: world.x + world.width + Math.min(bounds.minX - world.x, world.width * .2),
      y: bounds.centerY,
    };
  }

  return { x: bounds.centerX, y: bounds.centerY };
}

function distanceBetweenLocations(first, second) {
  const firstBounds = getFlagLocationBounds(first);
  const secondBounds = getFlagLocationBounds(second);
  if (!firstBounds || !secondBounds) return Number.POSITIVE_INFINITY;
  return (firstBounds.centerX - secondBounds.centerX) ** 2
    + (firstBounds.centerY - secondBounds.centerY) ** 2;
}

function isUsableContextLocation(location) {
  const bounds = getFlagLocationBounds(location);
  return !bounds || bounds.width <= 500;
}

function isWrappedBounds(bounds) {
  return Boolean(bounds && bounds.width > 500);
}

/**
 * Escolhe o alvo e uma vizinhanca geografica sem carregar uma geometria por pais.
 * As excecoes das ilhas pequenas mantem um continente ou arquipelago reconhecivel.
 */
export function selectFlagMapContext(targetCode, locations, minimum = FLAG_MAP_MIN_CONTEXT) {
  const uniqueLocations = [...new Map(
    (Array.isArray(locations) ? locations : [])
      .filter(location => location?.id)
      .map(location => [normalizeCode(location.id), location]),
  ).values()];
  const normalizedTarget = normalizeCode(targetCode);
  const target = uniqueLocations.find(location => normalizeCode(location.id) === normalizedTarget);
  if (!target) return [];

  const selectedCodes = new Set([normalizedTarget]);
  const selected = [target];
  const addLocation = location => {
    const code = normalizeCode(location?.id);
    if (!code || selectedCodes.has(code) || (location !== target && !isUsableContextLocation(location))) return;
    selectedCodes.add(code);
    selected.push(location);
  };

  for (const code of SMALL_ISLAND_CONTEXTS[normalizedTarget] || []) {
    const location = uniqueLocations.find(candidate => normalizeCode(candidate.id) === code);
    if (location) addLocation(location);
  }

  const targetDistance = uniqueLocations
    .filter(location => !selectedCodes.has(normalizeCode(location.id)) && isUsableContextLocation(location))
    .sort((first, second) => distanceBetweenLocations(target, first) - distanceBetweenLocations(target, second));
  const desiredSize = Math.max(1, Number(minimum) || FLAG_MAP_MIN_CONTEXT);
  for (const location of targetDistance) {
    if (selected.length >= desiredSize) break;
    addLocation(location);
  }

  return selected;
}

function roundCoordinate(value) {
  return Math.round(value * 100) / 100;
}

/**
 * Calcula uma viewBox regional, limitada ao mapa mundial e com margem visual.
 */
export function calculateFlagMapViewport(locations, worldViewBox, paddingRatio = 0.12) {
  const world = parseViewBox(worldViewBox);
  const locationBounds = (Array.isArray(locations) ? locations : [])
    .map(getFlagLocationBounds)
    .filter(Boolean);

  if (!locationBounds.length) {
    return {
      x: world.x,
      y: world.y,
      width: world.width,
      height: world.height,
      contentX: world.x,
      contentY: world.y,
      contentWidth: world.width,
      contentHeight: world.height,
      viewBox: `${world.x} ${world.y} ${world.width} ${world.height}`,
    };
  }

  const wrappedBounds = locationBounds.filter(isWrappedBounds);
  const regularBounds = locationBounds.filter(bounds => !wrappedBounds.includes(bounds));
  const contentBounds = regularBounds.length ? regularBounds : locationBounds;
  let contentX = Math.min(...contentBounds.map(bounds => bounds.minX));
  const contentY = Math.min(...contentBounds.map(bounds => bounds.minY));
  let contentRight = Math.max(...contentBounds.map(bounds => bounds.maxX));
  const contentBottom = Math.max(...contentBounds.map(bounds => bounds.maxY));
  if (wrappedBounds.length && regularBounds.length) {
    const wrapped = wrappedBounds[0];
    const wrappedMin = Math.min(wrapped.minX - world.x, world.width * .2);
    contentX = Math.min(contentX, world.x + world.width * .8);
    contentRight = Math.max(contentRight, world.x + world.width + wrappedMin);
  }
  const contentWidth = Math.max(1, contentRight - contentX);
  const contentHeight = Math.max(1, contentBottom - contentY);
  const ratio = Math.max(0.05, Math.min(0.3, Number(paddingRatio) || 0.12));
  const paddingX = Math.max(4, contentWidth * ratio);
  const paddingY = Math.max(4, contentHeight * ratio);
  const worldRight = world.x + world.width;
  const worldBottom = world.y + world.height;
  const x = Math.max(world.x, contentX - paddingX);
  const y = Math.max(world.y, contentY - paddingY);
  const rightLimit = wrappedBounds.length ? worldRight + world.width * .2 : worldRight;
  const right = Math.min(rightLimit, contentRight + paddingX);
  const bottom = Math.min(worldBottom, contentBottom + paddingY);
  const width = Math.max(1, right - x);
  const height = Math.max(1, bottom - y);

  return {
    x: roundCoordinate(x),
    y: roundCoordinate(y),
    width: roundCoordinate(width),
    height: roundCoordinate(height),
    contentX,
    contentY,
    contentWidth,
    contentHeight,
    viewBox: [x, y, width, height].map(roundCoordinate).join(' '),
  };
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

/**
 * Amplia ou afasta uma viewBox regional. Niveis negativos preservam o centro
 * regional; ao aproximar, um foco opcional mantem o alvo visivel sem pan.
 * Em ambos os casos, a viewport permanece limitada ao atlas mundial.
 */
export function zoomFlagMapViewport(viewport, worldViewBox, level = 0, focusPoint = null) {
  const world = parseViewBox(worldViewBox);
  const zoomLevel = clamp(
    Math.round(Number(level) || 0),
    FLAG_MAP_ZOOM_MIN_LEVEL,
    FLAG_MAP_ZOOM_MAX_LEVEL,
  );
  const baseX = Number(viewport?.x);
  const baseY = Number(viewport?.y);
  const baseWidth = Number(viewport?.width);
  const baseHeight = Number(viewport?.height);

  if (![baseX, baseY, baseWidth, baseHeight].every(Number.isFinite) || baseWidth <= 0 || baseHeight <= 0) {
    return {
      x: world.x,
      y: world.y,
      width: world.width,
      height: world.height,
      level: zoomLevel,
      viewBox: `${world.x} ${world.y} ${world.width} ${world.height}`,
    };
  }

  const worldRight = world.x + world.width;
  const worldBottom = world.y + world.height;
  const baseRight = baseX + baseWidth;
  const focusX = Number(focusPoint?.x);
  const focusY = Number(focusPoint?.y);
  const hasFocus = Number.isFinite(focusX) && Number.isFinite(focusY);
  const needsExtendedRightLimit = baseRight > worldRight + .01 || (hasFocus && focusX > worldRight + .01);
  const rightLimit = needsExtendedRightLimit ? worldRight + world.width * .2 : worldRight;
  const maximumScale = Math.min(
    (rightLimit - world.x) / baseWidth,
    (worldBottom - world.y) / baseHeight,
  );
  const requestedScale = FLAG_MAP_ZOOM_SCALE_PER_LEVEL ** zoomLevel;
  const scale = Math.min(requestedScale, maximumScale);
  const width = baseWidth * scale;
  const height = baseHeight * scale;
  const centerX = zoomLevel > 0 && hasFocus ? focusX : baseX + baseWidth / 2;
  const centerY = zoomLevel > 0 && hasFocus ? focusY : baseY + baseHeight / 2;
  const x = clamp(centerX - width / 2, world.x, Math.max(world.x, rightLimit - width));
  const y = clamp(centerY - height / 2, world.y, Math.max(world.y, worldBottom - height));

  return {
    x: roundCoordinate(x),
    y: roundCoordinate(y),
    width: roundCoordinate(width),
    height: roundCoordinate(height),
    level: zoomLevel,
    viewBox: [x, y, width, height].map(roundCoordinate).join(' '),
  };
}

export function canOpenFlagMap(status) {
  return status === 'correct' || status === 'revealed';
}

export function isWrappedFlagLocation(location) {
  return isWrappedBounds(getFlagLocationBounds(location));
}

export function isTinyFlagLocation(location) {
  const bounds = getFlagLocationBounds(location);
  return Boolean(bounds && (bounds.width < 12 || bounds.height < 8));
}
