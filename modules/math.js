import { state, el, mascots } from './state.js';
import { playEncouragement, playSuccessSound } from './audio.js';
import {
  MATH_CELEBRATION_EVERY,
  MATH_OPERATIONS,
  buildMathChoices,
  generateMathProblem,
  getMathLevel,
  getMathOperation,
  getMathQuestionType,
  isCorrectMathAnswer,
  mathProblemSignature,
} from './mathLogic.js';

// ── Estado e renderização do modo Matemática ──────────────────────────────
// A criança escolhe operação + nível na tela de configuração; o treino gera
// contas somente daquele nível, sem fim e sem trocar de conteúdo sozinho.

let pendingOperation = 'addition';
let pendingLevel = 0;

function setMathFeedback(message = '', kind = '') {
  el.mathFeedback.textContent = message;
  el.mathFeedback.className = `math-feedback${kind ? ` ${kind}` : ''}`;
}

function currentRunIsActive(runId) {
  return state.mathGameStarted && state.mathRunId === runId;
}

function scheduleForActiveRun(callback, delay) {
  const runId = state.mathRunId;
  window.setTimeout(() => {
    if (currentRunIsActive(runId)) callback();
  }, delay);
}

function updateMathStatus() {
  const operation = getMathOperation(state.mathOperation);
  const level = getMathLevel(operation.id, state.mathLevel);
  const answered = state.mathScore + state.mathMistakes;
  const cycle = state.mathScore % MATH_CELEBRATION_EVERY;

  el.mathLevelDisplay.textContent = `${operation.title} ${level.index + 1}/${operation.levels.length}`;
  el.mathMascot.textContent = mascots[Math.floor(state.mathScore / MATH_CELEBRATION_EVERY) % mascots.length];
  el.mathLevelTitle.textContent = level.title;
  el.mathLevelDescription.textContent = level.description;
  el.mathProgressFill.style.width = `${(state.mathScore === 0 ? 0 : cycle === 0 ? 100 : cycle * (100 / MATH_CELEBRATION_EVERY))}%`;
  el.mathProgressText.textContent = `${state.mathScore} acerto${state.mathScore === 1 ? '' : 's'}`;
  el.mathQuestionCount.textContent = `Pergunta ${answered + 1}`;
  el.mathScoreDisplay.textContent = state.mathScore;

  const typeText = state.mathQuestion?.type === 'choice'
    ? 'Escolha a resposta correta'
    : 'Digite o resultado';
  el.mathQuestionType.textContent = typeText;
}

function disableMathAnswers() {
  el.mathAnswerZone.querySelectorAll('button, input').forEach(control => {
    control.disabled = true;
  });
}

function renderMathAnswers(question) {
  el.mathAnswerZone.replaceChildren();

  if (question.type === 'choice') {
    const choices = buildMathChoices(question.problem);
    const grid = document.createElement('div');
    grid.className = 'math-choice-grid';

    for (const option of choices) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'math-choice-btn';
      button.textContent = option;
      button.setAttribute('aria-label', `Responder ${option}`);
      button.addEventListener('click', () => submitMathAnswer(option));
      grid.append(button);
    }

    el.mathAnswerZone.append(grid);
    return;
  }

  const form = document.createElement('form');
  form.className = 'math-input-form';
  form.noValidate = true;

  const input = document.createElement('input');
  input.className = 'math-answer-input';
  input.type = 'text';
  input.inputMode = 'numeric';
  input.autocomplete = 'off';
  input.pattern = '-?[0-9]*';
  input.placeholder = 'Resultado';
  input.setAttribute('aria-label', 'Digite o resultado da conta');

  const button = document.createElement('button');
  button.type = 'submit';
  button.className = 'btn-primary math-submit-btn';
  button.textContent = 'Conferir ✓';

  form.addEventListener('submit', event => {
    event.preventDefault();
    submitMathAnswer(input.value);
  });
  form.append(input, button);
  el.mathAnswerZone.append(form);
  input.focus();
}

function renderMathQuestion() {
  const question = state.mathQuestion;
  if (!question) return;

  updateMathStatus();
  el.mathExpression.textContent = `${question.problem.left} ${question.problem.operator} ${question.problem.right} = ?`;
  el.mathExpression.classList.remove('correct', 'wrong');
  renderMathAnswers(question);
  setMathFeedback('');
}

function loadNextMathQuestion() {
  const problem = generateMathProblem({
    operation: state.mathOperation,
    level: state.mathLevel,
    previousSignature: state.mathLastSignature,
  });

  state.mathQuestion = {
    type: getMathQuestionType(state.mathScore),
    problem,
  };
  state.mathLastSignature = mathProblemSignature(problem);
  state.mathQuestionStatus = 'answering';
  renderMathQuestion();
}

function submitMathAnswer(value) {
  if (!state.mathGameStarted || state.mathQuestionStatus !== 'answering') return;

  const isEmptyAnswer = typeof value === 'string' && !value.trim();
  if (isEmptyAnswer) {
    setMathFeedback('Digite um número para conferir a resposta.', 'warn');
    return;
  }

  const isCorrect = isCorrectMathAnswer(value, state.mathQuestion.problem);
  state.mathQuestionStatus = 'transitioning';
  disableMathAnswers();

  if (isCorrect) {
    state.mathScore++;
    el.mathExpression.classList.add('correct');
    updateMathStatus();

    if (state.mathScore % MATH_CELEBRATION_EVERY === 0) {
      setMathFeedback(`Demais! ${state.mathScore} acertos treinando ${getMathLevel(state.mathOperation, state.mathLevel).title.toLowerCase()}! 🎉`, 'level-up');
      playEncouragement();
    } else {
      setMathFeedback('Muito bem! +1 acerto ⭐', 'correct');
      playSuccessSound();
    }

    scheduleForActiveRun(loadNextMathQuestion, 700);
    return;
  }

  state.mathMistakes++;
  el.mathExpression.classList.add('wrong');
  setMathFeedback('Ainda não. Sem problema — vem aí outra conta desse nível!', 'wrong');
  scheduleForActiveRun(loadNextMathQuestion, 900);
}

// ── Tela de configuração (operação + nível) ───────────────────────────────

function renderMathOperationButtons() {
  el.mathOperationGrid.replaceChildren();
  for (const operation of MATH_OPERATIONS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'math-operation-btn';
    button.dataset.operation = operation.id;
    button.setAttribute('aria-pressed', 'false');
    const icon = document.createElement('span');
    icon.className = 'math-operation-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = operation.icon;
    const label = document.createElement('strong');
    label.textContent = operation.title;
    button.append(icon, label);
    button.addEventListener('click', () => {
      pendingOperation = operation.id;
      pendingLevel = 0;
      renderMathConfig();
    });
    el.mathOperationGrid.append(button);
  }
}

function renderMathConfig() {
  const operation = getMathOperation(pendingOperation);
  pendingOperation = operation.id;
  if (pendingLevel < 0 || pendingLevel >= operation.levels.length) pendingLevel = 0;
  const selected = operation.levels[pendingLevel];

  el.mathOperationGrid.querySelectorAll('.math-operation-btn').forEach(button => {
    const isSelected = button.dataset.operation === operation.id;
    button.classList.toggle('selected', isSelected);
    button.setAttribute('aria-pressed', String(isSelected));
  });

  el.mathConfigOperationDescription.textContent = operation.description;
  el.mathLevelGrid.replaceChildren();
  operation.levels.forEach((entry, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `math-level-btn${index === pendingLevel ? ' selected' : ''}`;
    button.setAttribute('aria-pressed', String(index === pendingLevel));
    button.innerHTML = `<strong></strong><small></small>`;
    button.querySelector('strong').textContent = entry.title;
    button.querySelector('small').textContent = entry.description;
    button.addEventListener('click', () => {
      pendingLevel = index;
      renderMathConfig();
    });
    el.mathLevelGrid.append(button);
  });

  el.confirmMathBtn.textContent = `Começar: ${operation.title} · ${selected.title} ✓`;
}

/**
 * Abre a escolha de operação e nível. Se um treino estiver em andamento, o
 * botão "Voltar" retorna ao treino em vez de ir ao menu inicial.
 */
export function openMathConfig() {
  pendingOperation = state.mathOperation;
  pendingLevel = state.mathLevel;
  state.mathRunId++;
  el.modeSelection.classList.add('hidden');
  el.mathGame.classList.add('hidden');
  el.mathConfig.classList.remove('hidden');
  renderMathOperationButtons();
  renderMathConfig();
}

function closeMathConfig() {
  el.mathConfig.classList.add('hidden');
  if (state.mathGameStarted && state.mathQuestion) {
    el.mathGame.classList.remove('hidden');
  } else {
    state.gameMode = state.mathPreviousGameMode || 'syllables';
    el.modeSelection.classList.remove('hidden');
  }
}

/**
 * Inicia um treino contínuo somente com contas do nível escolhido.
 * @param {string} operationId
 * @param {number} levelIndex
 */
export function startMathGame(operationId, levelIndex) {
  const operation = getMathOperation(operationId);
  const level = getMathLevel(operation.id, levelIndex);

  state.mathRunId++;
  if (state.gameMode !== 'math') state.mathPreviousGameMode = state.gameMode;
  state.gameMode = 'math';
  state.mathOperation = operation.id;
  state.mathLevel = level.index;
  state.mathScore = 0;
  state.mathMistakes = 0;
  state.mathQuestion = null;
  state.mathLastSignature = '';
  state.mathQuestionStatus = 'answering';
  state.mathGameStarted = true;

  el.modeSelection.classList.add('hidden');
  el.mathConfig.classList.add('hidden');
  el.mathGame.classList.remove('hidden');
  loadNextMathQuestion();
}

function showModeSelection() {
  state.mathRunId++;
  state.mathGameStarted = false;
  state.mathQuestionStatus = 'idle';
  state.gameMode = state.mathPreviousGameMode || 'syllables';
  el.mathGame.classList.add('hidden');
  el.mathConfig.classList.add('hidden');
  el.modeSelection.classList.remove('hidden');
}

/**
 * Registra os controles do modo Matemática.
 */
export function initMathListeners() {
  el.modeMathBtn.addEventListener('click', openMathConfig);
  el.confirmMathBtn.addEventListener('click', () => startMathGame(pendingOperation, pendingLevel));
  el.cancelMathBtn.addEventListener('click', closeMathConfig);
  el.mathHomeBtn.addEventListener('click', showModeSelection);
  el.mathLevelsBtn.addEventListener('click', openMathConfig);
}
