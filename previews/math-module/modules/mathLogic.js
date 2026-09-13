import { fisherYates } from './random.js';

// ── Regras puras do modo Matemática ───────────────────────────────────────

export const MATH_LEVEL_COUNT = 10;
export const MATH_QUESTIONS_PER_LEVEL = 8;
export const MATH_QUESTIONS_PER_TYPE = 4;

export const MATH_LEVELS = [
  {
    title: 'Somas iguais',
    description: 'Comece somando números iguais.',
  },
  {
    title: 'Somas diferentes',
    description: 'Agora some números diferentes de um algarismo.',
  },
  {
    title: 'Dezenas e unidades',
    description: 'Uma dezena junto com uma unidade.',
  },
  {
    title: 'Somas sem vai-um',
    description: 'Some números de dois algarismos com calma.',
  },
  {
    title: 'Somas com vai-um',
    description: 'Hora de levar uma unidade para a dezena.',
  },
  {
    title: 'Subtração simples',
    description: 'Tire quantidades sem precisar pedir emprestado.',
  },
  {
    title: 'Subtração com empréstimo',
    description: 'Desafie-se a pedir uma dezena emprestada.',
  },
  {
    title: 'Multiplicação',
    description: 'Pratique as tabuadas de 2 até 5.',
  },
  {
    title: 'Divisão exata',
    description: 'Divida em partes iguais, sem resto.',
  },
  {
    title: 'Grande desafio',
    description: 'Misture as quatro operações para chegar ao topo!',
  },
];

function normalizedRandom(random) {
  const value = Number(random());
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), 0.999999999);
}

function randomInt(min, max, random) {
  return min + Math.floor(normalizedRandom(random) * (max - min + 1));
}

function makeProblem(left, operator, right) {
  const answer = operator === '+' ? left + right
    : operator === '-' ? left - right
      : operator === '×' ? left * right
        : left / right;

  return { left, operator, right, answer };
}

function orderedAddition(left, right, random) {
  return normalizedRandom(random) < 0.5
    ? makeProblem(left, '+', right)
    : makeProblem(right, '+', left);
}

function equalAddition(random) {
  const value = randomInt(1, 5, random);
  return makeProblem(value, '+', value);
}

function differentAddition(random) {
  const left = randomInt(1, 9, random);
  let right = randomInt(1, 9, random);
  if (right === left) right = right === 9 ? 1 : right + 1;
  return orderedAddition(left, right, random);
}

function tenAndUnitAddition(random) {
  const ten = randomInt(1, 9, random) * 10;
  const unit = randomInt(1, 9, random);
  return orderedAddition(ten, unit, random);
}

function noCarryAddition(random) {
  const leftTens = randomInt(1, 5, random);
  const rightTens = randomInt(1, 4, random);
  const leftUnits = randomInt(0, 8, random);
  const rightUnits = randomInt(0, 9 - leftUnits, random);
  return orderedAddition(leftTens * 10 + leftUnits, rightTens * 10 + rightUnits, random);
}

function carryAddition(random) {
  const leftTens = randomInt(1, 7, random);
  const rightTens = randomInt(1, 7, random);
  const leftUnits = randomInt(1, 9, random);
  const rightUnits = randomInt(10 - leftUnits, 9, random);
  return orderedAddition(leftTens * 10 + leftUnits, rightTens * 10 + rightUnits, random);
}

function noBorrowSubtraction(random) {
  const leftTens = randomInt(1, 7, random);
  const rightTens = randomInt(0, leftTens - 1, random);
  const leftUnits = randomInt(1, 9, random);
  const rightUnits = randomInt(1, leftUnits, random);
  return makeProblem(leftTens * 10 + leftUnits, '-', rightTens * 10 + rightUnits);
}

function borrowingSubtraction(random) {
  const leftTens = randomInt(2, 9, random);
  const rightTens = randomInt(1, leftTens - 1, random);
  const leftUnits = randomInt(0, 8, random);
  const rightUnits = randomInt(leftUnits + 1, 9, random);
  return makeProblem(leftTens * 10 + leftUnits, '-', rightTens * 10 + rightUnits);
}

function multiplication(random, minFactor = 2, maxFactor = 5) {
  const left = randomInt(minFactor, maxFactor, random);
  const right = randomInt(2, 10, random);
  return normalizedRandom(random) < 0.5
    ? makeProblem(left, '×', right)
    : makeProblem(right, '×', left);
}

function exactDivision(random, minDivisor = 2, maxDivisor = 10, maxQuotient = 10) {
  const divisor = randomInt(minDivisor, maxDivisor, random);
  const quotient = randomInt(2, maxQuotient, random);
  return makeProblem(divisor * quotient, '÷', divisor);
}

function challengeAddition(random) {
  const left = randomInt(20, 89, random);
  const right = randomInt(11, 89, random);
  return orderedAddition(left, right, random);
}

/**
 * Assinatura estável para impedir que um erro entregue exatamente a mesma
 * conta outra vez.
 * @param {{left: number, operator: string, right: number}} problem
 * @returns {string}
 */
export function mathProblemSignature(problem) {
  return `${problem.left}${problem.operator}${problem.right}`;
}

/**
 * Tipo de resposta de cada posição do nível. Alternar os formatos torna a
 * partida mais leve e garante quatro perguntas de cada tipo.
 * @param {number} questionIndex Índice de acertos no nível (0–7)
 * @returns {'choice'|'input'}
 */
export function getMathQuestionType(questionIndex) {
  return Number(questionIndex) % 2 === 0 ? 'choice' : 'input';
}

/**
 * Retorna a definição visual e pedagógica de um nível.
 * @param {number} level
 * @returns {{title: string, description: string}}
 */
export function getMathLevel(level) {
  const normalizedLevel = Math.min(Math.max(Math.floor(Number(level) || 1), 1), MATH_LEVEL_COUNT);
  return MATH_LEVELS[normalizedLevel - 1];
}

function createProblemForLevel(level, questionIndex, previousSignature, random) {
  switch (level) {
    case 1: return equalAddition(random);
    case 2: return differentAddition(random);
    case 3: return tenAndUnitAddition(random);
    case 4: return noCarryAddition(random);
    case 5: return carryAddition(random);
    case 6: return noBorrowSubtraction(random);
    case 7: return borrowingSubtraction(random);
    case 8: return multiplication(random);
    case 9: return exactDivision(random);
    case 10: {
      // O primeiro desafio do último nível entrega explicitamente a progressão
      // pedida: 37 + 86. Em uma nova tentativa ele vira outra soma difícil.
      if (questionIndex === 0 && previousSignature !== '37+86') {
        return makeProblem(37, '+', 86);
      }

      switch (questionIndex % 4) {
        case 0: return challengeAddition(random);
        case 1: return borrowingSubtraction(random);
        case 2: return multiplication(random, 6, 10);
        default: return exactDivision(random, 4, 10, 12);
      }
    }
    default: return equalAddition(random);
  }
}

/**
 * Gera uma conta adequada ao nível. Se o jogador acabou de errar, tenta
 * entregar uma conta diferente, mantendo o mesmo tipo de resposta.
 * @param {object} options
 * @param {number} options.level
 * @param {number} options.questionIndex
 * @param {string} [options.previousSignature]
 * @param {() => number} [options.random]
 * @returns {{left: number, operator: string, right: number, answer: number}}
 */
export function generateMathProblem({
  level,
  questionIndex = 0,
  previousSignature = '',
  random = Math.random,
} = {}) {
  const normalizedLevel = Math.min(Math.max(Math.floor(Number(level) || 1), 1), MATH_LEVEL_COUNT);

  for (let attempt = 0; attempt < 24; attempt++) {
    const problem = createProblemForLevel(normalizedLevel, questionIndex, previousSignature, random);
    if (mathProblemSignature(problem) !== previousSignature) return problem;
  }

  // Fallback determinístico para geradores de teste ou ambientes que devolvem
  // sempre o mesmo número aleatório.
  const fallback = createProblemForLevel(normalizedLevel, questionIndex + 1, '', () => 0.73);
  if (mathProblemSignature(fallback) !== previousSignature) return fallback;
  return makeProblem(19, '+', 28);
}

/**
 * Produz quatro alternativas diferentes, incluindo necessariamente a correta.
 * @param {{left: number, right: number, answer: number}} problem
 * @param {() => number} [random]
 * @returns {number[]}
 */
export function buildMathChoices(problem, random = Math.random) {
  const answer = Number(problem.answer);
  const options = new Set([answer]);
  const scale = Math.max(1, Math.min(10, Math.round(Math.max(problem.left, problem.right) / 10)));
  const candidates = [
    answer - 1,
    answer + 1,
    answer - 2,
    answer + 2,
    answer - scale,
    answer + scale,
    answer - problem.left,
    answer + problem.right,
  ];

  for (const candidate of candidates) {
    if (Number.isInteger(candidate) && candidate >= 0 && candidate !== answer) {
      options.add(candidate);
    }
    if (options.size === 4) break;
  }

  let offset = 3;
  while (options.size < 4) {
    options.add(Math.max(0, answer + offset));
    offset += 2;
  }

  return fisherYates([...options], random);
}

/**
 * Verifica se a resposta digitada é um inteiro exatamente igual ao resultado.
 * @param {unknown} value
 * @param {{answer: number}} problem
 * @returns {boolean}
 */
export function isCorrectMathAnswer(value, problem) {
  const text = String(value ?? '').trim();
  return /^-?\d+$/u.test(text) && Number(text) === Number(problem.answer);
}

export function isMathLevelComplete(correctAnswers) {
  return Number(correctAnswers) >= MATH_QUESTIONS_PER_LEVEL;
}
