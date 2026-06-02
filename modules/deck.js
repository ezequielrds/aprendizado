import { state } from './state.js';

// ── Utilitário de embaralhamento ───────────────────────────────────────────

/**
 * Embaralha um array in-place (Fisher-Yates) e retorna o próprio array.
 * @param {any[]} array
 * @returns {any[]}
 */
export function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// ── Gestão do deck de itens ────────────────────────────────────────────────

/**
 * Reconstrói o deck embaralhando os índices de state.words
 * e reseta o ponteiro idx.
 */
export function buildDeck() {
  state.deck = shuffle([...state.words.keys()]);
  state.idx = -1;
}

/**
 * Avança para o próximo item do deck.
 * Se o deck acabar, reconstrói e recomeça.
 * @returns {string} O item atual
 */
export function nextFromDeck() {
  state.idx++;
  if (state.idx >= state.deck.length) {
    buildDeck();
    state.idx = 0;
  }
  return state.words[state.deck[state.idx]];
}
