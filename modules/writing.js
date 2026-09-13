import { state }                                        from './state.js';
import { setMessage, renderStreak,
         animateMascot, getEncouragingMessage,
         updateProgress }                               from './ui.js';
import { playSuccessSound }                              from './audio.js';
import { updateHighScore, checkAchievements }            from './scoring.js';
import { loadNewWord }                                   from './game.js';

// ── Interação com os slots de resposta ────────────────────────────────────

/**
 * Coloca a letra do pool no próximo slot vazio.
 * Se todos os slots estiverem preenchidos, verifica a resposta.
 * Exposto em `window.handleLetterClick` para os onclick inline do HTML gerado.
 * @param {number} poolIndex  Índice da letra no pool
 */
export function handleLetterClick(poolIndex) {
  if (state.writingUsedIndices.has(poolIndex)) return;

  const slotIndex = state.writingSlots.indexOf(null);
  if (slotIndex === -1) return;

  state.writingSlots[slotIndex] = { letter: state.writingPool[poolIndex], poolIndex };
  state.writingUsedIndices.add(poolIndex);

  const slotEl = document.querySelector(`.writing-slot[data-slot="${slotIndex}"]`);
  if (slotEl) {
    slotEl.textContent = state.writingPool[poolIndex];
    slotEl.classList.add('filled');
  }
  const btnEl = document.querySelector(`.writing-letter-btn[data-pool="${poolIndex}"]`);
  if (btnEl) btnEl.classList.add('used');

  if (!state.writingSlots.includes(null)) {
    checkWritingAnswer();
  }
}

/**
 * Remove a letra de um slot, devolvendo-a ao pool.
 * Exposto em `window.handleSlotClick` para os onclick inline do HTML gerado.
 * @param {number} slotIndex  Índice do slot a limpar
 */
export function handleSlotClick(slotIndex) {
  const slotData = state.writingSlots[slotIndex];
  if (!slotData) return;

  state.writingUsedIndices.delete(slotData.poolIndex);
  const btnEl = document.querySelector(`.writing-letter-btn[data-pool="${slotData.poolIndex}"]`);
  if (btnEl) btnEl.classList.remove('used');

  state.writingSlots[slotIndex] = null;
  const slotEl = document.querySelector(`.writing-slot[data-slot="${slotIndex}"]`);
  if (slotEl) {
    slotEl.textContent = '';
    slotEl.classList.remove('filled');
  }
}

// ── Verificação da resposta ───────────────────────────────────────────────

/**
 * Compara a resposta montada nos slots com a palavra correta.
 * Em caso de acerto: pontua, anima e avança.
 * Em caso de erro: reinicia os slots após uma pequena pausa.
 */
function checkWritingAnswer() {
  const word   = state.writingWordData.word;
  const answer = state.writingSlots.map(s => s.letter).join('');
  const slots  = document.querySelectorAll('.writing-slot');

  if (answer === word) {
    slots.forEach(s => s.classList.add('correct'));
    playSuccessSound();
    animateMascot('happy');

    state.streak++;
    state.totalWords++;
    state.sessionWords++;
    localStorage.setItem('learningTotalItems', String(state.totalWords));
    renderStreak(state.streak);
    updateProgress();

    let message = getEncouragingMessage() + ' +1 🎯';
    if (state.streak === 3)  message = '🔥 3 seguidas! Você está pegando fogo!';
    else if (state.streak === 5)  message = '⚡ 5 seguidas! Incrível!';
    else if (state.streak === 10) message = '💫 10 seguidas! FENOMENAL!';
    setMessage(message, 'win');

    updateHighScore();
    checkAchievements();
    setTimeout(loadNewWord, 1200);
  } else {
    // Resposta errada: resetar sequência e limpar slots
    state.streak = 0;
    renderStreak(0);
    slots.forEach(s => s.classList.add('wrong'));
    setMessage('Tente novamente! 💪', 'warn');

    setTimeout(() => {
      state.writingSlots.fill(null);
      state.writingUsedIndices.clear();
      slots.forEach(s => {
        s.textContent = '';
        s.classList.remove('filled', 'wrong');
      });
      document.querySelectorAll('.writing-letter-btn').forEach(b => b.classList.remove('used'));
    }, 600);
  }
}

// ── Exposição global para onclick inline ──────────────────────────────────

/**
 * Expõe handleLetterClick e handleSlotClick no objeto window,
 * necessário porque renderWritingUI gera HTML com onclick inline.
 */
export function initWritingGlobals() {
  window.handleLetterClick = handleLetterClick;
  window.handleSlotClick   = handleSlotClick;
}
