import { state, el } from './state.js';
import { setMessage }      from './ui.js';

// ── Gestão de vozes disponíveis ────────────────────────────────────────────

let voices = [];

/**
 * Retorna a voz do SpeechSynthesis mais adequada para o idioma informado.
 * Faz fallback para a primeira voz disponível caso nenhuma seja compatível.
 * @param {string} lang  Código BCP-47 (ex.: 'pt-BR')
 * @returns {SpeechSynthesisVoice|undefined}
 */
export function getVoiceForLanguage(lang) {
  if (!voices.length) voices = speechSynthesis.getVoices();
  const langMap = {
    'pt-BR': /pt[-_]br|portuguese.*brazil/i,
    'en-US': /en[-_]us|english.*united.*states/i,
    'es-ES': /es[-_]es|spanish.*spain/i,
    'de-DE': /de[-_]de|german.*germany/i,
    'ru-RU': /ru[-_]ru|russian/i,
  };
  const pattern = langMap[lang] || /pt/i;
  return voices.find(v => pattern.test(v.lang) || pattern.test(v.name)) || voices[0];
}

/**
 * Atalho: retorna a voz para o idioma atualmente selecionado.
 * @returns {SpeechSynthesisVoice|undefined}
 */
export function getPtVoice() {
  return getVoiceForLanguage(state.selectedLanguage);
}

// ── Falar uma palavra em português ────────────────────────────────────────

/**
 * Fala a palavra fornecida em pt-BR (usado pelo modo Escrita).
 * Exposto em `window.speakWord` para os handlers inline de onclick.
 * @param {string} word
 */
export function speakWord(word) {
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(word);
  const v = getVoiceForLanguage('pt-BR');
  if (v) u.voice = v;
  u.lang   = 'pt-BR';
  u.rate   = 0.85;
  u.pitch  = 1.0;
  u.volume = 1.0;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

// ── Inicialização ──────────────────────────────────────────────────────────

/**
 * Configura o listener de vozes e expõe speakWord globalmente
 * (necessário para os onclick inline gerados dinamicamente no modo Escrita).
 */
export function initSpeechListeners() {
  if ('speechSynthesis' in window) {
    speechSynthesis.onvoiceschanged = () => {
      voices = speechSynthesis.getVoices();
    };
  }

  // Expõe para uso em onclick="speakWord(...)" nos botões gerados em renderWritingUI
  window.speakWord = speakWord;
}
