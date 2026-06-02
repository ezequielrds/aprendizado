import { state, el } from './state.js';

// ── Mensagem de feedback ───────────────────────────────────────────────────

/**
 * Exibe uma mensagem de feedback para o jogador.
 * @param {string} msg   Texto a exibir
 * @param {'muted'|'win'|'warn'|'danger'} kind  Estilo visual
 */
export function setMessage(msg = '', kind = 'muted') {
  el.message.textContent = msg;
  if (kind === 'win')         el.message.style.color = 'var(--ok)';
  else if (kind === 'warn')   el.message.style.color = 'var(--warn)';
  else if (kind === 'danger') el.message.style.color = 'var(--danger)';
  else                        el.message.style.color = 'var(--muted)';
}

// ── Exibição da sequência ──────────────────────────────────────────────────

/**
 * Atualiza o contador de sequência com uma animação de pulso.
 * @param {number} n
 */
export function renderStreak(n) {
  el.streakDisplay.textContent = n;
  if (n > 0) {
    el.streakDisplay.classList.remove('pulse');
    void el.streakDisplay.offsetWidth; // força reflow para reiniciar a animação
    el.streakDisplay.classList.add('pulse');
  }
}

// ── Celebração de recorde ──────────────────────────────────────────────────

/**
 * Exibe a mensagem e lança confetti ao bater um recorde.
 */
export function celebrate() {
  setMessage('🎉 Uau! Você bateu seu recorde! Continue assim!', 'win');
  const colors = ['#fde047', '#60a5fa', '#f97316', '#22c55e', '#e879f9'];
  for (let i = 0; i < 60; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti';
    const size = 6 + Math.random() * 8;
    piece.style.left              = Math.random() * 100 + 'vw';
    piece.style.width             = size + 'px';
    piece.style.height            = (size * 1.4) + 'px';
    piece.style.background        = colors[Math.floor(Math.random() * colors.length)];
    piece.style.transform         = `rotate(${Math.random() * 360}deg)`;
    piece.style.animationDuration = (900 + Math.random() * 700) + 'ms';
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), 1600);
  }
}

// ── Barra de progresso do nível ────────────────────────────────────────────

/**
 * Atualiza a barra de progresso em direção ao próximo nível.
 * Cada nível requer 4 acertos.
 */
export function updateProgress() {
  const currentProgress = state.totalWords % 4;
  const percentage = (currentProgress / 4) * 100;
  el.progressFill.style.width  = percentage + '%';
  el.progressText.textContent  = `${currentProgress} / 4`;
}

// ── Animação do mascote ────────────────────────────────────────────────────

/**
 * Dispara uma animação no mascote.
 * @param {'happy'|'excited'} type
 */
export function animateMascot(type = 'happy') {
  el.mascot.classList.add(type);
  setTimeout(() => el.mascot.classList.remove(type), type === 'happy' ? 600 : 800);
}

// ── Mensagem de encorajamento aleatória ───────────────────────────────────

/**
 * Retorna uma mensagem de encorajamento aleatória.
 * @returns {string}
 */
export function getEncouragingMessage() {
  const messages = [
    '👏 Muito bem! Continue assim!',
    '🌟 Excelente trabalho!',
    '🎯 Você está arrasando!',
    '💪 Incrível! Você consegue!',
    '✨ Perfeito! Você é demais!',
    '🚀 Maravilhoso! Vamos continuar!',
    '🎨 Fantástico! Que aprendizagem linda!',
    '🦸 Você aprende super rápido!',
    '🌈 Brilhante! Parabéns!',
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}
