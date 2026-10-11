import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MATH_CELEBRATION_EVERY,
  MATH_OPERATIONS,
  buildMathChoices,
  generateMathProblem,
  getMathLevel,
  getMathLevelCount,
  getMathOperation,
  getMathQuestionType,
  isCorrectMathAnswer,
  mathProblemSignature,
} from '../modules/mathLogic.js';

const deterministicRandom = () => 0.37;

test('as quatro operações existem com seus níveis próprios', () => {
  assert.deepEqual(MATH_OPERATIONS.map(operation => operation.id), [
    'addition',
    'subtraction',
    'multiplication',
    'division',
  ]);
  assert.equal(getMathLevelCount('addition'), 5);
  assert.equal(getMathLevelCount('subtraction'), 5);
  assert.equal(getMathLevelCount('multiplication'), 10);
  assert.equal(getMathLevelCount('division'), 10);
  assert.equal(getMathOperation('multiplication').levels[0].title, 'Tabuada do 2');
  assert.equal(getMathOperation('division').levels[0].title, 'Dividindo por 2');
  assert.deepEqual(MATH_OPERATIONS.map(operation => operation.symbol), ['+', '-', '×', '÷']);
  for (const operation of MATH_OPERATIONS) {
    assert.match(operation.color, /^#[0-9a-f]{6}$/u);
    assert.match(operation.softColor, /^rgba\(/u);
  }
});

test('operação ou nível inválido cai para a soma inicial', () => {
  assert.equal(getMathOperation('inventada').id, 'addition');
  assert.equal(getMathLevel('addition', 99).index, 0);
  assert.equal(getMathLevel('addition', 'inexistente').index, 0);
  const fallback = generateMathProblem({ operation: 'inventada', level: 99, random: deterministicRandom });
  assert.equal(fallback.operator, '+');
});

test('cada pergunta alterna entre escolha e digitada', () => {
  assert.deepEqual(
    [0, 1, 2, 3].map(index => getMathQuestionType(index)),
    ['choice', 'input', 'choice', 'input'],
  );
});

test('os níveis de soma sobem a dificuldade sem misturar operação', () => {
  const upTo5 = generateMathProblem({ operation: 'addition', level: 0, random: deterministicRandom });
  assert.equal(upTo5.operator, '+');
  assert.ok(upTo5.answer <= 5);

  const upTo10 = generateMathProblem({ operation: 'addition', level: 1, random: deterministicRandom });
  assert.equal(upTo10.operator, '+');
  assert.ok(upTo10.answer <= 10);

  const tenAndUnit = generateMathProblem({ operation: 'addition', level: 2, random: deterministicRandom });
  assert.equal(tenAndUnit.operator, '+');
  assert.ok([tenAndUnit.left, tenAndUnit.right].some(value => value % 10 === 0 && value >= 10));
  assert.ok([tenAndUnit.left, tenAndUnit.right].some(value => value >= 1 && value <= 9));

  const noCarry = generateMathProblem({ operation: 'addition', level: 3, random: deterministicRandom });
  assert.equal(noCarry.operator, '+');
  assert.ok((noCarry.left % 10) + (noCarry.right % 10) <= 9);

  const carry = generateMathProblem({ operation: 'addition', level: 4, random: deterministicRandom });
  assert.equal(carry.operator, '+');
  assert.ok((carry.left % 10) + (carry.right % 10) >= 10);
});

test('os níveis de subtração nunca dão resultado negativo', () => {
  for (let level = 0; level < 5; level++) {
    const problem = generateMathProblem({ operation: 'subtraction', level, random: deterministicRandom });
    assert.equal(problem.operator, '-');
    assert.ok(problem.answer >= 0);
  }

  const roundTens = generateMathProblem({ operation: 'subtraction', level: 2, random: deterministicRandom });
  assert.equal(roundTens.left % 10, 0);
  assert.equal(roundTens.right % 10, 0);

  const noBorrow = generateMathProblem({ operation: 'subtraction', level: 3, random: deterministicRandom });
  assert.ok(noBorrow.left % 10 >= noBorrow.right % 10);

  const borrow = generateMathProblem({ operation: 'subtraction', level: 4, random: deterministicRandom });
  assert.ok(borrow.left % 10 < borrow.right % 10);
});

test('cada tabuada treina só o seu número', () => {
  for (let level = 0; level < 9; level++) {
    const table = level + 2;
    for (const random of [() => 0.05, () => 0.37, () => 0.71, () => 0.99]) {
      const problem = generateMathProblem({ operation: 'multiplication', level, random });
      assert.equal(problem.operator, '×');
      assert.ok(
        problem.left === table || problem.right === table,
        `tabuada do ${table} gerou ${problem.left} × ${problem.right}`,
      );
      assert.ok(problem.left >= 0 && problem.left <= 10);
      assert.ok(problem.right >= 0 && problem.right <= 10);
      assert.equal(problem.answer, problem.left * problem.right);
    }
  }

  const mixed = generateMathProblem({ operation: 'multiplication', level: 9, random: deterministicRandom });
  assert.equal(mixed.operator, '×');
  assert.equal(mixed.answer, mixed.left * mixed.right);
});

test('cada nível de divisão é exato e usa só o seu divisor', () => {
  for (let level = 0; level < 9; level++) {
    const divisor = level + 2;
    for (const random of [() => 0.05, () => 0.37, () => 0.71, () => 0.99]) {
      const problem = generateMathProblem({ operation: 'division', level, random });
      assert.equal(problem.operator, '÷');
      assert.equal(problem.right, divisor);
      assert.equal(Number.isInteger(problem.answer), true);
      assert.equal(problem.left / problem.right, problem.answer);
    }
  }

  const mixed = generateMathProblem({ operation: 'division', level: 9, random: deterministicRandom });
  assert.equal(mixed.operator, '÷');
  assert.equal(Number.isInteger(mixed.answer), true);
});

test('um erro recebe uma conta diferente do mesmo nível', () => {
  const first = generateMathProblem({ operation: 'multiplication', level: 2, random: () => 0 });
  const next = generateMathProblem({
    operation: 'multiplication',
    level: 2,
    previousSignature: mathProblemSignature(first),
    random: () => 0,
  });
  assert.equal(next.operator, '×');
  assert.notEqual(mathProblemSignature(next), mathProblemSignature(first));
});

test('as alternativas são únicas e sempre incluem o resultado correto', () => {
  const problem = { left: 7, operator: '×', right: 6, answer: 42 };
  const choices = buildMathChoices(problem, deterministicRandom);
  assert.equal(choices.length, 4);
  assert.equal(new Set(choices).size, 4);
  assert.equal(choices.includes(42), true);
});

test('a validação aceita somente o resultado inteiro correto', () => {
  const problem = { answer: 42 };
  assert.equal(isCorrectMathAnswer('42', problem), true);
  assert.equal(isCorrectMathAnswer(' 0042 ', problem), true);
  assert.equal(isCorrectMathAnswer('41', problem), false);
  assert.equal(isCorrectMathAnswer('', problem), false);
  assert.equal(isCorrectMathAnswer('42,0', problem), false);
});

test('a festa acontece a cada dez acertos sem encerrar o treino', () => {
  assert.equal(MATH_CELEBRATION_EVERY, 10);
});
