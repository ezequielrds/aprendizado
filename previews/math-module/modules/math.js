import { state, el, mascots } from './state.js';
import { playEncouragement, playSuccessSound } from './audio.js';
import {
  MATH_LEVEL_COUNT,
  MATH_QUESTIONS_PER_LEVEL,
  buildMathChoices,
  generateMathProblem,
  getMathLevel,
  getMathQuestionType,
  isCorrectMathAnswer,
  isMathLevelComplete,
  mathProblemSignature,
} from './mathLogic.js';

// ── Estado e renderização do modo Matemática ──────────────────────────────

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
  const levelData = getMathLevel(state.mathLevel);
  const progress = state.mathCorrectInLevel / MATH_QUESTIONS_PER_LEVEL;
  const currentQuestion = Math.min(state.mathCorrectInLevel + 1, MATH_QUESTIONS_PER_LEVEL);

  el.mathLevelDisplay.textContent = `${state.mathLevel} / ${MATH_LEVEL_COUNT}`;
  el.mathMascot.textContent = mascots[state.mathLevel - 1] || '🏆';
  el.mathLevelTitle.textContent = levelData.title;
  el.mathLevelDescription.textContent = levelData.description;
  el.mathProgressFill.style.width = `${progress * 100}%`;
  el.mathProgressText.textContent = `${state.mathCorrectInLevel} / ${MATH_QUESTIONS_PER_LEVEL} acertos`;
  el.mathQuestionCount.textContent = `Desafio ${currentQuestion} de ${MATH_QUESTIONS_PER_LEVEL}`;
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
    level: state.mathLevel,
    questionIndex: state.mathCorrectInLevel,
    previousSignature: state.mathLastSignature,
  });

  state.mathQuestion = {
    type: getMathQuestionType(state.mathCorrectInLevel),
    problem,
  };
  state.mathLastSignature = mathProblemSignature(problem);
  state.mathQuestionStatus = 'answering';
  renderMathQuestion();
}

function finishMathGame() {
  state.mathGameStarted = false;
  state.mathQuestionStatus = 'finished';
  el.mathPlayingView.classList.add('hidden');
  el.mathResultView.classList.remove('hidden');
  el.mathResultScore.textContent = state.mathScore;
  el.mathResultMessage.textContent = `Você acertou as 80 contas necessárias e concluiu os 10 níveis. Que conquista!`;
  playEncouragement();
}

function advanceAfterCorrectAnswer() {
  if (isMathLevelComplete(state.mathCorrectInLevel)) {
    if (state.mathLevel === MATH_LEVEL_COUNT) {
      finishMathGame();
      return;
    }

    state.mathLevel++;
    state.mathCorrectInLevel = 0;
    loadNextMathQuestion();
    setMathFeedback(`Novo nível! Agora é a vez de ${getMathLevel(state.mathLevel).title.toLowerCase()}.`, 'level-up');
    playEncouragement();
    return;
  }

  loadNextMathQuestion();
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
    state.mathCorrectInLevel++;
    el.mathExpression.classList.add('correct');
    updateMathStatus();
    setMathFeedback('Muito bem! +1 acerto ⭐', 'correct');
    playSuccessSound();

    scheduleForActiveRun(advanceAfterCorrectAnswer, 700);
    return;
  }

  state.mathMistakes++;
  el.mathExpression.classList.add('wrong');
  setMathFeedback('Ainda não. Sem ponto desta vez — vamos para outra conta!', 'wrong');
  scheduleForActiveRun(loadNextMathQuestion, 900);
}

/**
 * Inicia uma nova partida de Matemática com dez níveis sequenciais.
 */
export function startMathGame() {
  state.mathRunId++;
  if (state.gameMode !== 'math') state.mathPreviousGameMode = state.gameMode;
  state.gameMode = 'math';
  state.mathLevel = 1;
  state.mathCorrectInLevel = 0;
  state.mathScore = 0;
  state.mathMistakes = 0;
  state.mathQuestion = null;
  state.mathLastSignature = '';
  state.mathQuestionStatus = 'answering';
  state.mathGameStarted = true;

  el.modeSelection.classList.add('hidden');
  el.mathGame.classList.remove('hidden');
  el.mathPlayingView.classList.remove('hidden');
  el.mathResultView.classList.add('hidden');
  loadNextMathQuestion();
}

function showModeSelection() {
  state.mathRunId++;
  state.mathGameStarted = false;
  state.mathQuestionStatus = 'idle';
  state.gameMode = state.mathPreviousGameMode || 'syllables';
  el.mathGame.classList.add('hidden');
  el.mathResultView.classList.add('hidden');
  el.modeSelection.classList.remove('hidden');
}

/**
 * Registra os controles do modo Matemática.
 */
export function initMathListeners() {
  el.modeMathBtn.addEventListener('click', startMathGame);
  el.mathHomeBtn.addEventListener('click', showModeSelection);
  el.mathNewGameBtn.addEventListener('click', startMathGame);
  el.mathResultHomeBtn.addEventListener('click', showModeSelection);
}
