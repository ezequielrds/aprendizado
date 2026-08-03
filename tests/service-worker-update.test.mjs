import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const indexSource = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scriptSource = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
const serviceWorkerSource = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

test('o app atualiza o Service Worker instalado sem exigir limpeza manual', () => {
  assert.match(indexSource, /script\.js\?v=2\.1\.10/u);
  assert.match(scriptSource, /SERVICE_WORKER_VERSION\s*=\s*['"]2\.1\.10['"]/u);
  assert.match(scriptSource, /serviceWorker\.register\([^)]*\?v=\$\{SERVICE_WORKER_VERSION\}/u);
  assert.match(scriptSource, /updateViaCache\s*:\s*['"]none['"]/u);
  assert.match(scriptSource, /registration\.update\(\)/u);
  assert.match(scriptSource, /serviceWorker\.addEventListener\(['"]controllerchange['"]/u);
  assert.match(scriptSource, /sessionStorage/u);
  assert.match(scriptSource, /registration\.waiting/u);
  assert.match(scriptSource, /registration\.installing/u);
  assert.match(scriptSource, /updatefound/u);
  assert.match(scriptSource, /statechange/u);
  assert.match(
    scriptSource,
    /const observeInstallingWorker = \(\) => \{\s*requestSkipWaiting\(registration\);\s*const worker = registration\.installing/u,
  );
  assert.match(scriptSource, /if \(controllerChangeHandled\) return/u);
  assert.match(scriptSource, /window\.location\.reload\(\)/u);
  assert.match(serviceWorkerSource, /CACHE_NAME\s*=\s*['"]aprendizagem-cache-v17['"]/u);
  assert.match(serviceWorkerSource, /addEventListener\(['"]message['"]/u);
  assert.match(serviceWorkerSource, /skipWaiting\(\)/u);
});
