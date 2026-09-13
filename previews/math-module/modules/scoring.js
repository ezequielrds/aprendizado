import { state, el, mascots }                                from './state.js';
import { celebrate, setMessage, renderStreak,
         updateProgress, animateMascot }                    from './ui.js';
import { playSuccessSound, playEncouragement }              from './audio.js';

// ── Cálculo de nível ───────────────────────────────────────────────────────

/**
 * Recalcula o nível do jogador com base no total de acertos (a cada 4 palavras)
 * e atualiza o mascote e o display de nível na tela.
 */
export function calculateLevel() {
  state.level = Math.floor(state.totalWords / 4) + 1;
  const mascotIndex = (state.level - 1) % mascots.length;
  el.levelDisplay.textContent = state.level;
  el.mascot.textContent       = mascots[mascotIndex];
}

// ── Recorde de sequência ───────────────────────────────────────────────────

/**
 * Verifica se a sequência atual supera o recorde e, em caso positivo,
 * salva o novo recorde e dispara a celebração.
 */
export function updateHighScore() {
  if (state.streak > state.high) {
    state.high = state.streak;
    el.highScore.textContent = state.high;
    sessionStorage.setItem('learningStarsHighScore', String(state.high));
    celebrate();
  }
}

// ── Popup de conquista ─────────────────────────────────────────────────────

/**
 * Exibe o popup de conquista por 3 segundos.
 * @param {string} icon  Emoji de destaque
 * @param {string} text  Texto descritivo da conquista
 */
export function showAchievement(icon, text) {
  el.achievementPopup.innerHTML = `<div class="achievement-icon">${icon}</div>${text}`;
  el.achievementPopup.classList.add('show');
  playSuccessSound();
  setTimeout(() => {
    el.achievementPopup.classList.remove('show');
  }, 3000);
}

// ── Verificação de conquistas e level-up ──────────────────────────────────

/**
 * Verifica marcos de acertos e mudanças de nível,
 * exibindo conquistas e encorajamento quando necessário.
 */
export function checkAchievements() {
  if (state.totalWords === 5) {
    showAchievement('🌟', 'Primeira Conquista!<br/>5 acertos!');
  } else if (state.totalWords === 20) {
    showAchievement('🏆', 'Incrível!<br/>20 acertos!');
  } else if (state.totalWords === 50) {
    showAchievement('👑', 'Campeão de Aprendizagem!<br/>50 acertos!');
  }

  const oldLevel = state.level;
  calculateLevel();
  if (state.level > oldLevel) {
    showAchievement('🎊', `Subiu para o Nível ${state.level}!`);
    animateMascot('excited');
    playEncouragement();
  }
}

// ── Listeners de pontuação ─────────────────────────────────────────────────

/**
 * Registra os eventos dos botões de reset de sessão e de recorde total.
 */
export function initScoringListeners() {
  // Zerar apenas a pontuação da sessão atual
  el.resetBtn.addEventListener('click', () => {
    state.streak      = 0;
    state.sessionWords = 0;
    renderStreak(0);
    updateProgress();
    setMessage('Pontuações da sessão zeradas.');
  });

  // Zerar tudo: nível, recorde e sequência
  el.resetRecordBtn.addEventListener('click', () => {
    if (confirm('Tem certeza? Isso zerará TUDO: nível, recorde e sequência.')) {
      state.high        = 0;
      state.streak      = 0;
      state.level       = 1;
      state.totalWords  = 0;
      state.sessionWords = 0;
      sessionStorage.removeItem('learningStarsHighScore');
      sessionStorage.removeItem('readingStarsHighScore');
      localStorage.removeItem('learningTotalItems');
      localStorage.removeItem('readingTotalWords');
      el.highScore.textContent = '0';
      renderStreak(0);
      calculateLevel();
      updateProgress();
      setMessage('Tudo zerado! Começando do zero! 🔥', 'warn');
    }
  });
}
