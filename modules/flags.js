import { state, el } from './state.js';
import { setMessage } from './ui.js';
import {
  FLAGS_MAX_HINTS,
  FLAGS_ROUND_COUNT,
  FLAGS_MAX_SCORE,
  applyRoundScore,
  answersMatch,
  buildFlagLetterPool,
  getAnswerFromSlots,
  getAvailablePoints,
  getHintIndex,
  getNormalizedLetters,
  getRoundPoints,
  getScorePercentage,
  isFullyRevealed,
  isLastFlagRound,
  selectFlagCountries,
  shouldShowFlagHint,
} from './flagsLogic.js';

const LETTER_CHARACTER = /\p{L}/u;
const FLAGS_PRELOAD_COUNT = 1;

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getCountryLetters() {
  return getNormalizedLetters(state.flagsCurrentCountry?.normalizedName || state.flagsCurrentCountry?.namePtBr);
}

function syncUsedLetterIndices() {
  state.flagsUsedIndices = new Set(
    state.flagsAnswerSlots
      .map(slot => slot?.poolIndex)
      .filter(poolIndex => Number.isInteger(poolIndex) && poolIndex >= 0),
  );
}

function setFeedback(message = '', kind = '') {
  el.flagsFeedback.textContent = message;
  el.flagsFeedback.className = `flags-feedback${kind ? ` ${kind}` : ''}`;
}

function getSelectedExtraLetters() {
  const selected = el.flagsConfig.querySelector('input[name="flagsExtraLetters"]:checked');
  return selected ? Number(selected.value) : state.flagsExtraLetters;
}

function renderAnswerSlots() {
  const name = state.flagsCurrentCountry.namePtBr;
  let letterIndex = 0;

  el.flagsAnswer.innerHTML = [...name].map(character => {
    if (!LETTER_CHARACTER.test(character)) {
      const visualCharacter = character === ' ' ? '&nbsp;' : escapeHtml(character);
      return `<span class="flags-separator" aria-hidden="true">${visualCharacter}</span>`;
    }

    const slot = state.flagsAnswerSlots[letterIndex];
    const isRevealed = state.flagsRevealedIndices.has(letterIndex) || slot?.revealed;
    const isFilled = Boolean(slot);
    const classNames = [
      'flags-answer-slot',
      isFilled ? 'filled' : '',
      isRevealed ? 'revealed' : '',
      state.flagsStatus !== 'playing' ? 'locked' : '',
    ].filter(Boolean).join(' ');
    const label = isRevealed
      ? 'Letra revelada e bloqueada'
      : isFilled
        ? 'Letra colocada; toque para remover'
        : `Posição ${letterIndex + 1}, vazia`;
    const disabled = isRevealed || state.flagsStatus !== 'playing' ? ' disabled' : '';
    const content = slot ? escapeHtml(slot.letter) : '';
    const html = `<button type="button" class="${classNames}" data-answer-index="${letterIndex}" aria-label="${label}"${disabled}>${content}</button>`;
    letterIndex++;
    return html;
  }).join('');
}

function renderLetterPool() {
  el.flagsLetters.innerHTML = state.flagsLetterPool.map((letter, poolIndex) => {
    const used = state.flagsUsedIndices.has(poolIndex);
    const disabled = used || state.flagsStatus !== 'playing' ? ' disabled' : '';
    const classNames = ['flags-letter-btn', used ? 'used' : ''].filter(Boolean).join(' ');
    return `<button type="button" class="${classNames}" data-pool-index="${poolIndex}" aria-label="Letra ${letter}"${disabled}>${letter}</button>`;
  }).join('');
}

function renderFlagsControls() {
  const playing = state.flagsStatus === 'playing';
  const showHint = shouldShowFlagHint(state.flagsStatus);
  const hintsAvailable = state.flagsHintsUsed < FLAGS_MAX_HINTS;
  const lastRound = isLastFlagRound(state.flagsIndex, state.flagsCountries.length);

  el.flagsRoundPoints.textContent = state.flagsRoundPoints;
  el.flagsHintsUsed.textContent = `${state.flagsHintsUsed} / ${FLAGS_MAX_HINTS}`;
  el.flagsHintBtn.innerHTML = `💡 Usar dica <span>(${state.flagsHintsUsed}/${FLAGS_MAX_HINTS})</span>`;
  el.flagsHintBtn.disabled = !showHint || !hintsAvailable;
  el.flagsHintBtn.classList.toggle('hidden', !showHint);
  el.flagsRevealBtn.disabled = !playing;
  el.flagsRevealBtn.classList.toggle('hidden', !playing);
  el.flagsDeleteBtn.disabled = !playing || !state.flagsAnswerSlots.some(slot => slot && !slot.revealed);
  el.flagsClearBtn.disabled = !playing || !state.flagsAnswerSlots.some(slot => slot && !slot.revealed);
  el.flagsNextBtn.classList.toggle('hidden', playing);
  el.flagsNextBtn.textContent = lastRound ? 'Ver resultado 🏁' : 'Próxima bandeira ➜';
}

function preloadUpcomingFlags() {
  const upcomingCountries = state.flagsCountries.slice(
    state.flagsIndex + 1,
    state.flagsIndex + 1 + FLAGS_PRELOAD_COUNT,
  );

  if (typeof Image === 'undefined') return;

  upcomingCountries.forEach(country => {
    if (!country?.flagAsset || state.flagsPreloadedAssets.has(country.flagAsset)) return;

    const image = new Image();
    image.decoding = 'async';
    image.src = country.flagAsset;
    state.flagsPreloadedAssets.add(country.flagAsset);
  });
}

function renderFlagsRound() {
  const country = state.flagsCurrentCountry;
  if (!country) return;

  el.flagsProgress.textContent = `Bandeira ${state.flagsIndex + 1} de ${FLAGS_ROUND_COUNT}`;
  el.flagsTotal.textContent = state.flagsTotal;
  el.flagsImage.src = country.flagAsset;
  preloadUpcomingFlags();
  el.flagsImage.alt = state.flagsStatus === 'playing'
    ? 'Bandeira do país a descobrir'
    : `Bandeira do ${country.namePtBr}`;
  el.flagsPrompt.textContent = state.flagsStatus === 'playing'
    ? 'Monte o nome do país'
    : state.flagsStatus === 'correct'
      ? `Muito bem! É ${country.namePtBr}.`
      : `A resposta era ${country.namePtBr}.`;

  renderAnswerSlots();
  renderLetterPool();
  renderFlagsControls();
}

function resetFlagRound() {
  const letters = getCountryLetters();
  state.flagsRoundPoints = getAvailablePoints(0);
  state.flagsHintsUsed = 0;
  state.flagsRevealedIndices = new Set();
  state.flagsAnswerSlots = new Array(letters.length).fill(null);
  state.flagsLetterPool = buildFlagLetterPool(
    state.flagsCurrentCountry.normalizedName || state.flagsCurrentCountry.namePtBr,
    state.flagsExtraLetters,
  );
  state.flagsUsedIndices = new Set();
  state.flagsStatus = 'playing';
  state.flagsRoundScored = false;
  setFeedback();
}

function loadNextFlag() {
  if (state.flagsGameStarted && state.flagsIndex >= 0 && state.flagsStatus === 'playing') return;
  if (state.flagsIndex + 1 >= state.flagsCountries.length) {
    finishFlagsGame();
    return;
  }

  state.flagsIndex++;
  state.flagsCurrentCountry = state.flagsCountries[state.flagsIndex];
  resetFlagRound();
  renderFlagsRound();
}

function clearAnswerSlot(slotIndex) {
  const slot = state.flagsAnswerSlots[slotIndex];
  if (!slot || slot.revealed) return false;
  state.flagsAnswerSlots[slotIndex] = null;
  syncUsedLetterIndices();
  return true;
}

function handlePoolLetter(poolIndex) {
  if (state.flagsStatus !== 'playing' || state.flagsUsedIndices.has(poolIndex)) return;
  const slotIndex = state.flagsAnswerSlots.indexOf(null);
  if (slotIndex < 0) {
    validateFlagAnswer();
    return;
  }

  state.flagsAnswerSlots[slotIndex] = {
    letter: state.flagsLetterPool[poolIndex],
    poolIndex,
    revealed: false,
  };
  state.flagsUsedIndices.add(poolIndex);
  renderFlagsRound();

  if (!state.flagsAnswerSlots.includes(null)) validateFlagAnswer();
}

function handleAnswerSlot(slotIndex) {
  if (state.flagsStatus !== 'playing') return;
  if (clearAnswerSlot(slotIndex)) {
    setFeedback();
    renderFlagsRound();
  }
}

function clearPlayerLetters() {
  if (state.flagsStatus !== 'playing') return;
  state.flagsAnswerSlots = state.flagsAnswerSlots.map(slot => slot?.revealed ? slot : null);
  syncUsedLetterIndices();
  setFeedback();
  renderFlagsRound();
}

function deleteLastPlayerLetter() {
  if (state.flagsStatus !== 'playing') return;
  for (let i = state.flagsAnswerSlots.length - 1; i >= 0; i--) {
    if (clearAnswerSlot(i)) {
      setFeedback();
      renderFlagsRound();
      return;
    }
  }
}

function reserveHintLetter(targetIndex) {
  const correctLetter = getCountryLetters()[targetIndex];
  clearAnswerSlot(targetIndex);

  let poolIndex = state.flagsLetterPool.findIndex(
    (letter, index) => letter === correctLetter && !state.flagsUsedIndices.has(index),
  );

  // Se o jogador usou a única ocorrência em posição errada, devolva-a para
  // que a dica possa ocupar a posição correta sem duplicar letras do banco.
  if (poolIndex < 0) {
    const occupiedSlotIndex = state.flagsAnswerSlots.findIndex(
      slot => slot && !slot.revealed && state.flagsLetterPool[slot.poolIndex] === correctLetter,
    );
    if (occupiedSlotIndex >= 0) {
      clearAnswerSlot(occupiedSlotIndex);
      poolIndex = state.flagsLetterPool.findIndex(
        (letter, index) => letter === correctLetter && !state.flagsUsedIndices.has(index),
      );
    }
  }

  state.flagsAnswerSlots[targetIndex] = {
    letter: correctLetter,
    poolIndex,
    revealed: true,
  };
  state.flagsRevealedIndices.add(targetIndex);
  syncUsedLetterIndices();
}

function handleHint() {
  if (state.flagsStatus !== 'playing' || state.flagsHintsUsed >= FLAGS_MAX_HINTS) return;
  const letters = getCountryLetters();
  const hintIndex = getHintIndex({
    letters,
    revealedIndices: state.flagsRevealedIndices,
    answerSlots: state.flagsAnswerSlots,
    hintNumber: state.flagsHintsUsed + 1,
  });

  if (hintIndex < 0) return;
  reserveHintLetter(hintIndex);
  state.flagsHintsUsed++;
  state.flagsHintCount++;
  state.flagsRoundPoints = getAvailablePoints(state.flagsHintsUsed);

  if (isFullyRevealed(state.flagsRevealedIndices, letters.length)) {
    state.flagsStatus = 'revealed';
    state.flagsRoundPoints = 0;
    state.flagsRevealedCount++;
    setFeedback(`Resposta revelada: ${state.flagsCurrentCountry.namePtBr}.`, 'revealed');
  } else {
    setFeedback(`Dica ${state.flagsHintsUsed} usada. Continue tentando!`, 'hint');
  }
  renderFlagsRound();
  if (state.flagsStatus === 'playing' && !state.flagsAnswerSlots.includes(null)) {
    validateFlagAnswer();
  }
}

function resolveCorrectAnswer() {
  if (state.flagsStatus !== 'playing' || state.flagsRoundScored) return;
  state.flagsStatus = 'correct';
  const score = getRoundPoints({ hintsUsed: state.flagsHintsUsed, status: 'correct' });
  const result = applyRoundScore({
    total: state.flagsTotal,
    points: score,
    status: state.flagsStatus,
    alreadyScored: state.flagsRoundScored,
  });
  state.flagsTotal = result.total;
  state.flagsRoundPoints = result.awarded;
  state.flagsRoundScored = result.scored;
  state.flagsCorrectCount++;
  renderFlagsRound();
  setFeedback(`Muito bem! É ${state.flagsCurrentCountry.namePtBr}. +${result.awarded} pontos`, 'correct');
}

function validateFlagAnswer() {
  if (state.flagsStatus !== 'playing') return;
  const answer = getAnswerFromSlots(state.flagsAnswerSlots);
  if (answersMatch(answer, state.flagsCurrentCountry.namePtBr)) {
    resolveCorrectAnswer();
  } else {
    setFeedback('Quase! Tente novamente.', 'wrong');
  }
}

function revealAnswer() {
  if (state.flagsStatus !== 'playing') return;
  const letters = getCountryLetters();
  state.flagsAnswerSlots = letters.map(letter => ({ letter, poolIndex: -1, revealed: true }));
  state.flagsRevealedIndices = new Set(letters.map((_, index) => index));
  state.flagsUsedIndices = new Set();
  state.flagsStatus = 'revealed';
  state.flagsRoundPoints = getRoundPoints({ status: 'revealed', fullyRevealed: true });
  state.flagsRevealedCount++;
  renderFlagsRound();
  setFeedback(`Resposta revelada: ${state.flagsCurrentCountry.namePtBr}.`, 'revealed');
}

function finishFlagsGame() {
  state.flagsGameStarted = false;
  el.flagsPlayingView.classList.add('hidden');
  el.flagsResultView.classList.remove('hidden');
  el.flagsResultTotal.textContent = state.flagsTotal;
  el.flagsCorrectCount.textContent = state.flagsCorrectCount;
  el.flagsRevealedCount.textContent = state.flagsRevealedCount;
  el.flagsHintCount.textContent = state.flagsHintCount;
  el.flagsPercent.textContent = `${getScorePercentage(state.flagsTotal, FLAGS_MAX_SCORE)}%`;

  const percentage = getScorePercentage(state.flagsTotal, FLAGS_MAX_SCORE);
  el.flagsResultMessage.textContent = percentage >= 80
    ? 'Excelente! Você reconheceu muitas bandeiras.'
    : percentage >= 50
      ? 'Muito bem! Cada rodada deixou você mais preparado.'
      : 'Boa jornada! Continue praticando para conhecer o mundo inteiro.';
}

export function startFlagsGame(extraLetters = state.flagsExtraLetters) {
  if (!state.dbCountries.length) {
    setFeedback('As bandeiras ainda estão carregando. Tente novamente em instantes.', 'wrong');
    return;
  }

  state.gameMode = 'flags';
  state.flagsExtraLetters = Number(extraLetters);
  state.flagsCountries = selectFlagCountries(state.dbCountries, FLAGS_ROUND_COUNT);
  state.flagsIndex = -1;
  state.flagsCurrentCountry = null;
  state.flagsTotal = 0;
  state.flagsHintCount = 0;
  state.flagsCorrectCount = 0;
  state.flagsRevealedCount = 0;
  state.flagsGameStarted = true;
  el.modeSelection.classList.add('hidden');
  el.flagsConfig.classList.add('hidden');
  el.flagsGame.classList.remove('hidden');
  el.flagsPlayingView.classList.remove('hidden');
  el.flagsResultView.classList.add('hidden');
  loadNextFlag();
}

function showModeSelection() {
  state.flagsGameStarted = false;
  state.gameMode = 'syllables';
  el.flagsGame.classList.add('hidden');
  el.flagsConfig.classList.add('hidden');
  el.modeSelection.classList.remove('hidden');
}

function openFlagsConfig() {
  if (!state.dbCountries.length) {
    setMessage('As bandeiras ainda estão carregando. Tente novamente em instantes.', 'warn');
    return;
  }
  const input = el.flagsConfig.querySelector(`input[value="${state.flagsExtraLetters}"]`);
  if (input) input.checked = true;
  el.modeSelection.classList.add('hidden');
  el.flagsConfig.classList.remove('hidden');
}

function handleFlagsKeydown(event) {
  if (!state.flagsGameStarted || state.flagsStatus !== 'playing') return;
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;

  if (event.key === 'Backspace' || event.key === 'Delete') {
    event.preventDefault();
    deleteLastPlayerLetter();
    return;
  }

  const keyLetter = getNormalizedLetters(event.key)[0];
  if (!keyLetter) return;
  const poolIndex = state.flagsLetterPool.findIndex(
    (letter, index) => letter === keyLetter && !state.flagsUsedIndices.has(index),
  );
  if (poolIndex >= 0) {
    event.preventDefault();
    handlePoolLetter(poolIndex);
  }
}

export function initFlagsListeners() {
  el.modeFlagsBtn.addEventListener('click', openFlagsConfig);
  el.confirmFlagsBtn.addEventListener('click', () => startFlagsGame(getSelectedExtraLetters()));
  el.cancelFlagsBtn.addEventListener('click', showModeSelection);
  el.flagsHomeBtn.addEventListener('click', showModeSelection);
  el.flagsResultHomeBtn.addEventListener('click', showModeSelection);
  el.flagsNewGameBtn.addEventListener('click', () => startFlagsGame(state.flagsExtraLetters));
  el.flagsNextBtn.addEventListener('click', loadNextFlag);
  el.flagsHintBtn.addEventListener('click', handleHint);
  el.flagsRevealBtn.addEventListener('click', revealAnswer);
  el.flagsDeleteBtn.addEventListener('click', deleteLastPlayerLetter);
  el.flagsClearBtn.addEventListener('click', clearPlayerLetters);

  el.flagsLetters.addEventListener('click', event => {
    const button = event.target.closest('[data-pool-index]');
    if (button) handlePoolLetter(Number(button.dataset.poolIndex));
  });
  el.flagsAnswer.addEventListener('click', event => {
    const button = event.target.closest('[data-answer-index]');
    if (button) handleAnswerSlot(Number(button.dataset.answerIndex));
  });
  window.addEventListener('keydown', handleFlagsKeydown);
}
