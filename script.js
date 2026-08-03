/**
 * script.js — Ponto de entrada da aplicação Aprendizado.
 *
 * Responsabilidades deste arquivo:
 *  1. Inicializar a UI com os valores persistidos
 *  2. Registrar todos os listeners (via funções init* dos módulos)
 *  3. Carregar os dados dos JSONs de forma assíncrona
 *  4. Registrar o Service Worker
 */

import { state, el }          from './modules/state.js';
import { setMessage }          from './modules/ui.js';
import { initSpeechListeners } from './modules/speech.js';
import { initScoringListeners }from './modules/scoring.js';
import { initRenderListeners } from './modules/render.js';
import { initGameListeners }   from './modules/game.js';
import { initModeListeners }   from './modules/mode.js';
import { initWritingGlobals }  from './modules/writing.js';
import { initFlagsListeners }  from './modules/flags.js';

// ── 1. Inicialização imediata da UI ───────────────────────────────────────

el.highScore.textContent      = state.high;
el.speakBtn.style.display     = 'none';
el.languageSelector.value     = state.selectedLanguage;
document.body.classList.add('uppercase-mode');

// ── 2. Registro de listeners de todos os módulos ──────────────────────────

initSpeechListeners();    // Vozes TTS + expõe window.speakWord
initScoringListeners();   // Reset de sessão e recorde total
initRenderListeners();    // Botão de ajuda (Mostrar/Esconder sílabas)
initGameListeners();      // correctBtn, nextBtn, shuffleBtn, loadBtn, speakBtn, teclado, mascote
initModeListeners();      // Seleção de modo, config Números, config Escrita, idioma
initWritingGlobals();     // Expõe window.handleLetterClick e window.handleSlotClick
initFlagsListeners();     // Configuração e partida Bandeiras do Mundo

// ── 3. Carregamento assíncrono dos dados ──────────────────────────────────

async function initGame() {
  try {
    const [resWords, resPhrases, resLetters, resColors, resWriting, resCountries] = await Promise.all([
      fetch('words.json'),
      fetch('phrases.json'),
      fetch('letters.json'),
      fetch('colors.json'),
      fetch('writing.json'),
      fetch('data/countries.json'),
    ]);

    if (!resWords.ok || !resPhrases.ok || !resLetters.ok || !resColors.ok || !resWriting.ok || !resCountries.ok) {
      throw new Error('Erro ao carregar dados');
    }

    state.dbSyllables = await resWords.json();
    state.dbPhrases   = await resPhrases.json();
    state.dbLetters   = await resLetters.json();
    state.dbColors    = await resColors.json();
    state.dbWriting   = await resWriting.json();
    state.dbCountries = await resCountries.json();
    el.modeFlagsBtn.disabled = false;

    el.wordsInput.value = state.dbSyllables.join(', ');
  } catch (error) {
    console.error(error);
    setMessage('Erro ao carregar dados: ' + error.message, 'danger');
  }
}

initGame();

// ── 4. Service Worker ─────────────────────────────────────────────────────

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.warn('Service worker registration failed:', err);
    });
  });
}
