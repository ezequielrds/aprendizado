import { fisherYates } from './random.js';

export const FLAGS_ROUND_COUNT = 30;
export const FLAGS_POINTS_PER_ROUND = 40;
export const FLAGS_MAX_HINTS = 4;
export const FLAGS_MAX_SCORE = FLAGS_ROUND_COUNT * FLAGS_POINTS_PER_ROUND;
export const FLAGS_EXTRA_OPTIONS = [0, 2, 4, 6];

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/**
 * Converte uma resposta para a forma usada pelo jogo: sem acentos, caixa,
 * espaços, hífens ou qualquer outro separador.
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeCountryAnswer(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
}

/**
 * Retorna as letras que ocupam posições de resposta.
 * @param {string} value
 * @returns {string[]}
 */
export function getNormalizedLetters(value) {
  return normalizeCountryAnswer(value).split('');
}

/**
 * Sorteia uma partida sem repetir códigos de país.
 * @param {Array<{code: string}>} countries
 * @param {number} count
 * @param {() => number} random
 * @returns {Array<object>}
 */
export function selectFlagCountries(countries, count = FLAGS_ROUND_COUNT, random = Math.random) {
  const uniqueCountries = [...new Map(countries.map(country => [country.code, country])).values()];
  if (uniqueCountries.length < count) {
    throw new Error(`A partida precisa de pelo menos ${count} países distintos.`);
  }
  return fisherYates(uniqueCountries, random).slice(0, count);
}

/**
 * Cria o banco de letras corretas mais as letras distratoras.
 * As extras são escolhidas fora das letras da resposta sempre que possível.
 * @param {string} countryName
 * @param {number} extraCount
 * @param {() => number} random
 * @returns {string[]}
 */
export function buildFlagLetterPool(countryName, extraCount = 0, random = Math.random) {
  const answerLetters = getNormalizedLetters(countryName);
  if (!answerLetters.length) throw new Error('O país precisa ter pelo menos uma letra.');

  const amount = Math.max(0, Math.floor(Number(extraCount) || 0));
  const answerSet = new Set(answerLetters);
  const availableExtras = fisherYates(
    ALPHABET.filter(letter => !answerSet.has(letter)),
    random,
  );
  const extras = availableExtras.slice(0, amount);

  // Há sempre letras ausentes para as opções atuais (0, 2, 4 e 6).
  // O fallback mantém a função segura mesmo para nomes artificiais.
  while (extras.length < amount) {
    extras.push(ALPHABET[extras.length % ALPHABET.length]);
  }

  const pool = fisherYates([...answerLetters, ...extras], random);

  // Evita entregar a resposta pronta quando existe uma troca possível.
  if (pool.length > 1 && pool.join('') === answerLetters.join('')) {
    let differentIndex = pool.findIndex(letter => letter !== pool[0]);
    if (differentIndex > 0) {
      [pool[0], pool[differentIndex]] = [pool[differentIndex], pool[0]];
    }
  }

  return pool;
}

/**
 * Escolhe a posição da próxima dica, alternando esquerda e direita.
 * Posições já reveladas ou corretamente preenchidas pelo jogador são puladas.
 * @param {object} options
 * @param {string|string[]} options.letters
 * @param {Set<number>|number[]} options.revealedIndices
 * @param {Array<{letter: string, revealed?: boolean}|null>} options.answerSlots
 * @param {number} options.hintNumber Número da dica começando em 1
 * @returns {number}
 */
export function getHintIndex({ letters, revealedIndices = new Set(), answerSlots = [], hintNumber = 1 }) {
  const normalizedLetters = Array.isArray(letters)
    ? letters.map(letter => normalizeCountryAnswer(letter).charAt(0))
    : getNormalizedLetters(letters);
  const revealed = revealedIndices instanceof Set ? revealedIndices : new Set(revealedIndices);
  const candidates = normalizedLetters
    .map((letter, index) => ({ letter, index }))
    .filter(({ letter, index }) => {
      if (!letter || revealed.has(index)) return false;
      const slot = answerSlots[index];
      if (!slot || slot.revealed) return true;
      return normalizeCountryAnswer(slot.letter) !== letter;
    })
    .map(({ index }) => index);

  if (!candidates.length) return -1;
  const fromLeft = Number(hintNumber) % 2 === 1;
  return fromLeft ? candidates[0] : candidates[candidates.length - 1];
}

export function isFullyRevealed(revealedIndices, letterCount) {
  const revealed = revealedIndices instanceof Set ? revealedIndices : new Set(revealedIndices);
  return letterCount > 0 && revealed.size >= letterCount;
}

export function getAvailablePoints(hintsUsed) {
  return Math.max(0, FLAGS_POINTS_PER_ROUND - Math.max(0, Number(hintsUsed) || 0) * 10);
}

export function getRoundPoints({ hintsUsed = 0, status = 'correct', fullyRevealed = false } = {}) {
  if (status === 'revealed' || fullyRevealed) return 0;
  return getAvailablePoints(hintsUsed);
}

export function getAnswerFromSlots(answerSlots) {
  return answerSlots.map(slot => slot?.letter || '').join('');
}

export function answersMatch(answer, countryName) {
  return normalizeCountryAnswer(answer) === normalizeCountryAnswer(countryName);
}

export function canBuildAnswerFromPool(answer, pool) {
  const needed = getNormalizedLetters(answer);
  const available = getNormalizedLetters(pool.join(''));
  const neededCounts = new Map();
  const availableCounts = new Map();

  needed.forEach(letter => neededCounts.set(letter, (neededCounts.get(letter) || 0) + 1));
  available.forEach(letter => availableCounts.set(letter, (availableCounts.get(letter) || 0) + 1));

  return [...neededCounts].every(([letter, count]) => (availableCounts.get(letter) || 0) >= count);
}

export function applyRoundScore({ total = 0, points = 0, status = 'playing', alreadyScored = false } = {}) {
  if (alreadyScored || status !== 'correct') {
    return { total, awarded: 0, scored: alreadyScored };
  }
  const awarded = Math.max(0, Number(points) || 0);
  return { total: total + awarded, awarded, scored: true };
}

export function isLastFlagRound(index, roundCount = FLAGS_ROUND_COUNT) {
  return index >= roundCount - 1;
}

export function getScorePercentage(total, maximum = FLAGS_MAX_SCORE) {
  if (!maximum) return 0;
  return Math.round((Math.max(0, total) / maximum) * 1000) / 10;
}
