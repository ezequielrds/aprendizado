import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const indexSource = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scriptSource = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
const serviceWorkerSource = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const buildValidatorSource = fs.readFileSync(path.join(root, 'scripts/validate-build.mjs'), 'utf8');

test('o app atualiza o Service Worker instalado sem exigir limpeza manual', () => {
  assert.match(indexSource, /script\.js\?v=2\.3\.3/u);
  assert.match(scriptSource, /SERVICE_WORKER_VERSION\s*=\s*['"]2\.3\.3['"]/u);
  assert.match(scriptSource, /serviceWorker\.register\([^)]*\?v=\$\{SERVICE_WORKER_VERSION\}/u);
  assert.match(scriptSource, /updateViaCache\s*:\s*['"]none['"]/u);
  assert.match(scriptSource, /registration\.update\(\)/u);
  assert.match(scriptSource, /serviceWorker\.addEventListener\(['"]controllerchange['"]/u);
  assert.match(scriptSource, /sessionStorage/u);
  assert.match(scriptSource, /registration\.waiting/u);
  assert.match(scriptSource, /registration\.installing/u);
  assert.match(scriptSource, /updatefound/u);
  assert.match(scriptSource, /statechange/u);
  assert.match(scriptSource, /if \(controllerChangeHandled\) return/u);
  assert.match(scriptSource, /window\.location\.reload\(\)/u);
  assert.match(serviceWorkerSource, /CACHE_NAME\s*=\s*['"]aprendizagem-cache-v32['"]/u);
  assert.match(serviceWorkerSource, /\.\/data\/country-curiosities\.pt-BR\.json/u);
  assert.match(buildValidatorSource, /script\\.js\\.?v=2\\.3\\.3/u);
  assert.match(buildValidatorSource, /aprendizagem-cache-v32/u);
  assert.match(serviceWorkerSource, /addEventListener\(['"]message['"]/u);
  assert.match(serviceWorkerSource, /skipWaiting\(\)/u);
});

test('a nova versão é aplicada por um botão visível, não por reload automático', () => {
  assert.match(indexSource, /id="updateAppBtn"/u);
  assert.match(indexSource, /id="updateAppBtn"[^>]*\bhidden\b/u);
  assert.match(scriptSource, /showUpdateButton\(registration\)/u);
  assert.match(scriptSource, /pendingUpdateRegistration/u);
  assert.match(scriptSource, /updateAppBtn\.addEventListener\(['"]click['"]/u);
  assert.match(scriptSource, /requestSkipWaiting\(pendingUpdateRegistration\)/u);
  assert.match(scriptSource, /worker\.state === ['"]installed['"]/u);
  assert.match(scriptSource, /navigator\.serviceWorker\.controller/u);
  assert.match(buildValidatorSource, /id="updateAppBtn"/u);
});
