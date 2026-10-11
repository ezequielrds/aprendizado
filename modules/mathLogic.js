import { fisherYates } from './random.js';

// ── Regras puras do modo Matemática ───────────────────────────────────────
// As quatro operações são separadas (soma, subtração, multiplicação e
// divisão) e cada uma tem seus próprios níveis. A criança escolhe uma
// operação e um nível, e treina somente contas daquele nível — sem
// progressão automática para outros conteúdos.

function tableLevels(prefix, titleFor, descriptionFor, tables) {
  return tables.map(number => ({
    id: `${prefix}-${number}`,
    table: number,
    title: titleFor(number),
    description: descriptionFor(number),
  }));
}

const MULTIPLICATION_TABLES = [2, 3, 4, 5, 6, 7, 8, 9, 10];
const DIVISION_TABLES = [2, 3, 4, 5, 6, 7, 8, 9, 10];

export const MATH_OPERATIONS = [
  {
    id: 'addition',
    symbol: '+',
    title: 'Soma',
    color: '#22c55e',
    softColor: 'rgba(34, 197, 94, .16)',
    description: 'Juntar quantidades com o sinal de mais.',
    levels: [
      { id: 'up-to-5', title: 'Somando até 5', description: 'Somas pequenas, que cabem numa mão.' },
      { id: 'up-to-10', title: 'Somando até 10', description: 'Somas com resultado até 10.' },
      { id: 'ten-and-unit', title: 'Dezena + unidade', description: 'Uma dezena junto com uma unidade, como 30 + 4.' },
      { id: 'no-carry', title: 'Sem vai-um', description: 'Dois números sem precisar levar para a dezena.' },
      { id: 'carry', title: 'Com vai-um', description: 'Somas em que a unidade passa de 10.' },
    ],
  },
  {
    id: 'subtraction',
    symbol: '-',
    title: 'Subtração',
    color: '#f59e0b',
    softColor: 'rgba(245, 158, 11, .16)',
    description: 'Tirar quantidades com o sinal de menos.',
    levels: [
      { id: 'up-to-5', title: 'Tirando até 5', description: 'Subtrações pequenas, com números até 5.' },
      { id: 'up-to-10', title: 'Tirando até 10', description: 'Subtrações com números até 10.' },
      { id: 'round-tens', title: 'Dezenas exatas', description: 'Dezenas cheias, como 50 − 20.' },
      { id: 'no-borrow', title: 'Sem empréstimo', description: 'Subtrações sem precisar pedir emprestado.' },
      { id: 'borrow', title: 'Com empréstimo', description: 'Subtrações pedindo uma dezena emprestada.' },
    ],
  },
  {
    id: 'multiplication',
    symbol: '×',
    title: 'Multiplicação',
    color: '#8b5cf6',
    softColor: 'rgba(139, 92, 246, .18)',
    description: 'Treine uma tabuada de cada vez.',
    levels: [
      ...tableLevels('table', number => `Tabuada do ${number}`, number => `Só contas com o número ${number}, como ${number} × 4.`, MULTIPLICATION_TABLES),
      { id: 'mixed', title: 'Tabuada misturada', description: 'Tabuadas de 2 a 10 misturadas.' },
    ],
  },
  {
    id: 'division',
    symbol: '÷',
    title: 'Divisão',
    color: '#ec4899',
    softColor: 'rgba(236, 72, 153, .16)',
    description: 'Divisões sempre exatas, sem resto.',
    levels: [
      ...tableLevels('by', number => `Dividindo por ${number}`, number => `Só divisões por ${number}, sempre exatas.`, DIVISION_TABLES),
      { id: 'mixed', title: 'Divisão misturada', description: 'Divisores de 2 a 10 misturados, sempre exatos.' },
    ],
  },
];

/** Quantos pontos disparam uma festa sem interromper o treino. */
export const MATH_CELEBRATION_EVERY = 10;

/** Pontos ganhos por acerto. */
export const MATH_POINTS_CORRECT = 1;

/** Pontos perdidos por erro (nunca abaixo de zero). */
export const MATH_POINTS_WRONG = 2;

/**
 * Aplica o resultado de uma resposta à pontuação: acerto soma um ponto,
 * erro tira dois, com piso em zero.
 * @param {number} score Pontuação atual
 * @param {boolean} wasCorrect Se a resposta estava correta
 * @returns {number}
 */
export function scoreMathAnswer(score, wasCorrect) {
  const current = Number(score) || 0;
  return wasCorrect
    ? current + MATH_POINTS_CORRECT
    : Math.max(0, current - MATH_POINTS_WRONG);
}

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

function sumUpTo(max, random) {
  const left = randomInt(0, max, random);
  const right = randomInt(0, max - left, random);
  return orderedAddition(left, right, random);
}

function subtractUpTo(max, random) {
  const left = randomInt(0, max, random);
  const right = randomInt(0, left, random);
  return makeProblem(left, '-', right);
}

function tenAndUnitAddition(random) {
  const ten = randomInt(1, 9, random) * 10;
  const unit = randomInt(1, 9, random);
  return orderedAddition(ten, unit, random);
}

function roundTensSubtraction(random) {
  const leftTens = randomInt(1, 9, random);
  const rightTens = randomInt(0, leftTens - 1, random);
  return makeProblem(leftTens * 10, '-', rightTens * 10);
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

function fixedTableMultiplication(table, random) {
  const other = randomInt(0, 10, random);
  return normalizedRandom(random) < 0.5
    ? makeProblem(table, '×', other)
    : makeProblem(other, '×', table);
}

function exactDivision(random, minDivisor = 2, maxDivisor = 10, maxQuotient = 10) {
  const divisor = randomInt(minDivisor, maxDivisor, random);
  const quotient = randomInt(1, maxQuotient, random);
  return makeProblem(divisor * quotient, '÷', divisor);
}

function fixedDivisorDivision(divisor, random) {
  const quotient = randomInt(0, 10, random);
  return makeProblem(divisor * quotient, '÷', divisor);
}

function additionForLevel(levelId, random) {
  switch (levelId) {
    case 'up-to-5': return sumUpTo(5, random);
    case 'up-to-10': return sumUpTo(10, random);
    case 'ten-and-unit': return tenAndUnitAddition(random);
    case 'no-carry': return noCarryAddition(random);
    case 'carry': return carryAddition(random);
    default: return sumUpTo(10, random);
  }
}

function subtractionForLevel(levelId, random) {
  switch (levelId) {
    case 'up-to-5': return subtractUpTo(5, random);
    case 'up-to-10': return subtractUpTo(10, random);
    case 'round-tens': return roundTensSubtraction(random);
    case 'no-borrow': return noBorrowSubtraction(random);
    case 'borrow': return borrowingSubtraction(random);
    default: return subtractUpTo(10, random);
  }
}

function multiplicationForLevel(levelId, table, random) {
  if (levelId === 'mixed') return multiplication(random, 2, 10);
  return fixedTableMultiplication(table, random);
}

function divisionForLevel(levelId, table, random) {
  if (levelId === 'mixed') return exactDivision(random, 2, 10, 10);
  return fixedDivisorDivision(table, random);
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
 * Tipo de resposta de cada posição do treino. Alternar os formatos torna a
 * prática mais leve: posições pares são múltipla escolha, ímpares digitadas.
 * @param {number} questionIndex Índice de pontos no treino (0, 1, 2, …)
 * @returns {'choice'|'input'}
 */
export function getMathQuestionType(questionIndex) {
  return Number(questionIndex) % 2 === 0 ? 'choice' : 'input';
}

/**
 * Retorna a definição de uma operação, com fallback para a soma.
 * @param {string} operationId
 * @returns {{id: string, symbol: string, title: string, color: string, softColor: string, description: string, levels: Array}}
 */
export function getMathOperation(operationId) {
  return MATH_OPERATIONS.find(operation => operation.id === operationId)
    || MATH_OPERATIONS[0];
}

/**
 * Quantos níveis a operação informada possui.
 * @param {string} operationId
 * @returns {number}
 */
export function getMathLevelCount(operationId) {
  return getMathOperation(operationId).levels.length;
}

/**
 * Retorna a definição visual e pedagógica de um nível dentro da operação.
 * @param {string} operationId
 * @param {number|string} level Índice do nível (ou id do nível)
 * @returns {{index: number, id: string, title: string, description: string}}
 */
export function getMathLevel(operationId, level) {
  const operation = getMathOperation(operationId);
  let index = typeof level === 'string'
    ? operation.levels.findIndex(entry => entry.id === level)
    : Math.floor(Number(level));
  if (!Number.isInteger(index) || index < 0 || index >= operation.levels.length) index = 0;
  const entry = operation.levels[index];
  return { index, id: entry.id, title: entry.title, description: entry.description, table: entry.table };
}

function createProblemForLevel(operationId, levelId, table, random) {
  switch (operationId) {
    case 'addition': return additionForLevel(levelId, random);
    case 'subtraction': return subtractionForLevel(levelId, random);
    case 'multiplication': return multiplicationForLevel(levelId, table, random);
    case 'division': return divisionForLevel(levelId, table, random);
    default: return additionForLevel(levelId, random);
  }
}

/**
 * Gera uma conta do nível escolhido. Se o jogador acabou de errar, tenta
 * entregar uma conta diferente, mantendo o mesmo nível.
 * @param {object} options
 * @param {string} [options.operation]
 * @param {number|string} [options.level]
 * @param {string} [options.previousSignature]
 * @param {() => number} [options.random]
 * @returns {{left: number, operator: string, right: number, answer: number}}
 */
export function generateMathProblem({
  operation = 'addition',
  level = 0,
  previousSignature = '',
  random = Math.random,
} = {}) {
  const operationId = getMathOperation(operation).id;
  const resolved = getMathLevel(operationId, level);

  for (let attempt = 0; attempt < 24; attempt++) {
    const problem = createProblemForLevel(operationId, resolved.id, resolved.table, random);
    if (mathProblemSignature(problem) !== previousSignature) return problem;
  }

  // Fallback determinístico para geradores de teste ou ambientes que devolvem
  // sempre o mesmo número aleatório.
  for (const fallbackRandom of [() => 0.13, () => 0.71, () => 0.97]) {
    const problem = createProblemForLevel(operationId, resolved.id, resolved.table, fallbackRandom);
    if (mathProblemSignature(problem) !== previousSignature) return problem;
  }

  return createProblemForLevel(operationId, resolved.id, resolved.table, () => 0.5);
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
