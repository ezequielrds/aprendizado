import { setMessage } from './ui.js';

// ── Efeito sonoro de acerto ────────────────────────────────────────────────

/**
 * Toca um breve som de acerto via Web Audio API.
 */
export function playSuccessSound() {
  if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx        = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const gainNode   = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = 800;
    oscillator.type            = 'sine';
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
  }
}

// ── Áudios de encorajamento ────────────────────────────────────────────────

const encouragements = [
  { text: 'Você está indo muito bem! 🎉',          audio: 'audio/Você está indo muito bem.mp3' },
  { text: 'Eu acredito em você! 💪',               audio: 'audio/Eu acredito em você.mp3' },
  { text: 'Vamos aprender mais uma? 📚',            audio: 'audio/Vamos ler mais uma.mp3' },
  { text: 'Você é incrível! 🌟',                   audio: 'audio/Você é incrível.mp3' },
  { text: 'Cada tentativa te deixa mais forte! 🚀', audio: 'audio/Cada tentativa te deixa mais forte.mp3' },
  { text: 'Que orgulho de você! 😄',               audio: 'audio/Que orgulho de você.mp3' },
  { text: 'Você aprende rápido demais! 🧠',         audio: 'audio/Você aprende rápido demais.mp3' },
  { text: 'Aprender com você é divertido! 😊',      audio: 'audio/Aprender com você é divertido.mp3' },
];

/**
 * Sorteia uma frase de encorajamento, exibe no feedback e toca o áudio
 * correspondente (se disponível).
 */
export function playEncouragement() {
  const item = encouragements[Math.floor(Math.random() * encouragements.length)];
  setMessage(item.text, 'win');
  try {
    const audio = new Audio(item.audio);
    audio.play().catch(e => console.warn('Autoplay prevented or audio missing:', e));
  } catch (e) {
    console.warn('Audio error:', e);
  }
}
