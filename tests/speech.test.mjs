import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

test('module speech exports getVoiceForLanguage', () => {
  const source = fs.readFileSync(path.join(root, 'modules/speech.js'), 'utf8');
  assert.match(source, /export function getVoiceForLanguage/u);
});

test('getVoiceForLanguage nao deixa voz pt-BR roubar o russo (ru-RU)', () => {
  const source = fs.readFileSync(path.join(root, 'modules/speech.js'), 'utf8');
  assert.match(source, /'ru-RU':\s*\/ru\[-_\]ru\|russian\/i/u);
  // Busca estrita: retorna a voz exata do idioma pedido antes do fallback.
  assert.match(source, /const exact = voices\.find/u);
  // Para ru-RU sem voz russa disponível, retorna undefined (deixa o SO usar a voz padrão ru-RU).
  assert.match(source, /if \(lang === 'ru-RU'\) return undefined/u);
});

test('modo Letras em ru-RU fala a letra em minusculo (som puro, nao o nome)', () => {
  const source = fs.readFileSync(path.join(root, 'modules/render.js'), 'utf8');
  // No branch letters, quando o idioma e ru-RU, o texto falado vira minusculo.
  assert.match(source, /gameMode === 'letters'/u);
  assert.match(source, /state\.selectedLanguage === 'ru-RU'/u);
  assert.match(source, /syllable = syllable\.toLocaleLowerCase\('ru'\)/u);
});
