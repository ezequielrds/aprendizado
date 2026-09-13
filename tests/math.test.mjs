import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MATH_LEVEL_COUNT,
  MATH_QUESTIONS_PER_LEVEL,
  MATH_QUESTIONS_PER_TYPE,
  buildMathChoices,
  generateMathProblem,
  getMathLevel,
  getMathQuestionType,
  isCorrectMathAnswer,
  isMathLevelComplete,
  mathProblemSignature,
} from '../modules/mathLogic.js';

const deterministicRandom = () => 0.37;

test('a missão tem 10 níveis e cada nível exige oito acertos', () => {
  assert.equal(MATH_LEVEL_COUNT, 10);
  assert.equal(MATH_QUESTIONS_PER_LEVEL, 8);
  assert.equal(isMathLevelComplete(7), false);
  assert.equal(isMathLevelComplete(8), true);
  assert.equal(getMathLevel(1).title, 'Somas iguais');
  assert.equal(getMathLevel(10).title, 'Grande desafio');
});

test('cada nível intercala quatro perguntas de escolha e quatro digitadas', () => {
  const formats = Array.from({ length: MATH_QUESTIONS_PER_LEVEL }, (_, index) => getMathQuestionType(index));
  assert.equal(formats.filter(type => type === 'choice').length, MATH_QUESTIONS_PER_TYPE);
  assert.equal(formats.filter(type => type === 'input').length, MATH_QUESTIONS_PER_TYPE);
  assert.deepEqual(formats, ['choice', 'input', 'choice', 'input', 'choice', 'input', 'choice', 'input']);
});

test('os níveis iniciais seguem a progressão de soma proposta', () => {
  const equal = generateMathProblem({ level: 1, random: deterministicRandom });
  assert.equal(equal.operator, '+');
  assert.equal(equal.left, equal.right);

  const different = generateMathProblem({ level: 2, random: deterministicRandom });
  assert.equal(different.operator, '+');
  assert.notEqual(different.left, different.right);

  const tenAndUnit = generateMathProblem({ level: 3, random: deterministicRandom });
  assert.equal(tenAndUnit.operator, '+');
  assert.ok([tenAndUnit.left, tenAndUnit.right].some(value => value % 10 === 0 && value >= 10));
  assert.ok([tenAndUnit.left, tenAndUnit.right].some(value => value >= 1 && value <= 9));
});

test('os níveis de soma distinguem conta sem e com vai-um', () => {
  const noCarry = generateMathProblem({ level: 4, random: deterministicRandom });
  assert.equal(noCarry.operator, '+');
  assert.ok((noCarry.left % 10) + (noCarry.right % 10) <= 9);

  const carry = generateMathProblem({ level: 5, random: deterministicRandom });
  assert.equal(carry.operator, '+');
  assert.ok((carry.left % 10) + (carry.right % 10) >= 10);
});

test('subtração, multiplicação e divisão têm níveis próprios', () => {
  const simpleSubtraction = generateMathProblem({ level: 6, random: deterministicRandom });
  assert.equal(simpleSubtraction.operator, '-');
  assert.ok(simpleSubtraction.left % 10 >= simpleSubtraction.right % 10);
  assert.ok(simpleSubtraction.answer >= 0);

  const borrowingSubtraction = generateMathProblem({ level: 7, random: deterministicRandom });
  assert.equal(borrowingSubtraction.operator, '-');
  assert.ok(borrowingSubtraction.left % 10 < borrowingSubtraction.right % 10);
  assert.ok(borrowingSubtraction.answer >= 0);

  const multiplication = generateMathProblem({ level: 8, random: deterministicRandom });
  assert.equal(multiplication.operator, '×');
  assert.equal(multiplication.answer, multiplication.left * multiplication.right);

  const division = generateMathProblem({ level: 9, random: deterministicRandom });
  assert.equal(division.operator, '÷');
  assert.equal(Number.isInteger(division.answer), true);
  assert.equal(division.left / division.right, division.answer);
});

test('o nível final abre com 37 + 86 e mistura as quatro operações', () => {
  const opening = generateMathProblem({ level: 10, questionIndex: 0, random: deterministicRandom });
  assert.deepEqual(opening, { left: 37, operator: '+', right: 86, answer: 123 });

  const operations = Array.from({ length: 4 }, (_, questionIndex) => (
    generateMathProblem({ level: 10, questionIndex, previousSignature: questionIndex === 0 ? '37+86' : '', random: deterministicRandom }).operator
  ));
  assert.deepEqual(operations, ['+', '-', '×', '÷']);
});

test('um erro recebe uma conta diferente em vez de repetir a mesma', () => {
  const first = generateMathProblem({ level: 1, random: () => 0 });
  const next = generateMathProblem({
    level: 1,
    previousSignature: mathProblemSignature(first),
    random: () => 0,
  });
  assert.notEqual(mathProblemSignature(next), mathProblemSignature(first));
});

test('as alternativas são únicas e sempre incluem o resultado correto', () => {
  const problem = { left: 37, operator: '+', right: 86, answer: 123 };
  const choices = buildMathChoices(problem, deterministicRandom);
  assert.equal(choices.length, 4);
  assert.equal(new Set(choices).size, 4);
  assert.equal(choices.includes(123), true);
});

test('a validação aceita somente o resultado inteiro correto', () => {
  const problem = { answer: 123 };
  assert.equal(isCorrectMathAnswer('123', problem), true);
  assert.equal(isCorrectMathAnswer(' 00123 ', problem), true);
  assert.equal(isCorrectMathAnswer('122', problem), false);
  assert.equal(isCorrectMathAnswer('', problem), false);
  assert.equal(isCorrectMathAnswer('123,0', problem), false);
});
