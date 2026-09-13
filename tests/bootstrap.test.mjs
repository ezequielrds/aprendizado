import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function makeEl() {
  return new Proxy({ style: {}, classList: { add() {}, remove() {} } }, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (prop === 'addEventListener' || prop === 'setAttribute' || prop === 'removeEventListener') return () => {};
      if (prop === 'disabled' || prop === 'value' || prop === 'textContent') return target[prop] ?? '';
      return undefined;
    },
    set(target, prop, value) { target[prop] = value; return true; },
  });
}

function def(obj, key, value) {
  Object.defineProperty(obj, key, { value, configurable: true, writable: true });
}

def(globalThis, 'localStorage', { getItem: () => null, setItem() {}, removeItem() {} });
def(globalThis, 'sessionStorage', { getItem: () => null, setItem() {} });
def(globalThis, 'document', {
  getElementById: () => makeEl(),
  body: { classList: { add() {}, remove() {} } },
  addEventListener() {},
});
def(globalThis, 'window', { location: { reload() {} }, addEventListener() {} });
def(globalThis, 'navigator', {
  serviceWorker: {
    register: () => Promise.resolve({
      addEventListener() {}, installing: null, waiting: null, update: () => Promise.resolve(),
    }),
    addEventListener() {},
  },
});
def(globalThis, 'speechSynthesis', { getVoices: () => [], cancel() {}, speak() {}, onvoiceschanged: null });
def(globalThis, 'fetch', async () => ({ ok: true, json: async () => [] }));

test('script.js inicializa sem lançar (sem erro geral de bootstrap)', async () => {
  // Deve importar e executar até initGame() sem ReferenceError/TDZ.
  await assert.doesNotReject(async () => {
    await import(pathToFileURL(path.join(root, 'script.js')).href);
  });
});
