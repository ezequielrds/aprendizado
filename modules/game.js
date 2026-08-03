import { state, el,
         SYLLABLE_PATTERN, LETTER_PATTERN, NUMBER_PATTERN } from './state.js';
import { buildDeck, nextFromDeck }                           from './deck.js';
import { renderWord, stripHyphens,
         getWordDifficulty, getItemTypePlural }              from './render.js';
import { setMessage, renderStreak,
         animateMascot, updateProgress,
         getEncouragingMessage }                             from './ui.js';
import { updateHighScore, checkAchievements }                from './scoring.js';
import { playSuccessSound, playEncouragement }               from './audio.js';
import { getVoiceForLanguage }                               from './speech.js';

// ── Carregamento de nova palavra/item ─────────────────────────────────────

/**
 * Avança para o próximo item do deck, reseta o estado da rodada
 * e atualiza toda a interface.
 */
export function loadNewWord() {
  nextFromDeck();
  state.usedHelp = false;
  state.syllablesClicked.clear();
  el.speakBtn.style.display = 'none';

  if (state.gameMode === 'writing') {
    el.helpBtn.style.display  = 'none';
    el.correctBtn.style.display = 'none';
    el.nextBtn.style.display  = 'none';
    el.speakBtn.style.display = 'none';
  } else {
    el.correctBtn.style.display = '';
    el.nextBtn.style.display    = '';
  }

  const w = state.words[state.deck[state.idx]];
  renderWord(w, false);
  setMessage('');

  const difficulty = getWordDifficulty(w);
  if (difficulty.hidden) {
    el.wordDifficulty.style.display = 'none';
  } else {
    el.wordDifficulty.style.display   = 'block';
    el.wordDifficulty.textContent      = difficulty.text;
    el.wordDifficulty.style.color      = difficulty.color;
  }
}

// ── Listeners dos controles principais do jogo ────────────────────────────

/**
 * Registra todos os eventos dos botões e atalhos de teclado do jogo.
 */
export function initGameListeners() {

  // ── "Acertei sozinho(a)" ─────────────────────────────────────────────────
  el.correctBtn.addEventListener('click', () => {
    if (state.usedHelp) {
      state.streak = 0;
      renderStreak(state.streak);
      setMessage('Boa! Tente acertar a próxima sem ajuda para ganhar pontos. 🎯', 'muted');
      setTimeout(loadNewWord, 650);
      return;
    }
    state.streak++;
    state.totalWords++;
    state.sessionWords++;
    localStorage.setItem('learningTotalItems', String(state.totalWords));
    el.word.classList.add('bounce');
    setTimeout(() => el.word.classList.remove('bounce'), 600);
    animateMascot('happy');
    playSuccessSound();
    renderStreak(state.streak);
    updateProgress();
    let message = getEncouragingMessage() + ' +1 🎯';
    if (state.streak === 3)  message = '🔥 3 seguidas! Você está pegando fogo!';
    else if (state.streak === 5)  message = '⚡ 5 seguidas! Incrível!';
    else if (state.streak === 10) message = '💫 10 seguidas! FENOMENAL!';
    setMessage(message, 'win');
    updateHighScore();
    checkAchievements();
    setTimeout(loadNewWord, 650);
  });

  // ── "Próxima" ─────────────────────────────────────────────────────────────
  el.nextBtn.addEventListener('click', () => {
    // Modos em que "Próxima" equivale a acertar (não há resposta certa/errada explícita)
    if (state.gameMode === 'letters' || state.gameMode === 'numbers' || state.gameMode === 'colors') {
      state.streak++;
      state.totalWords++;
      state.sessionWords++;
      localStorage.setItem('learningTotalItems', String(state.totalWords));
      el.word.classList.add('bounce');
      setTimeout(() => el.word.classList.remove('bounce'), 600);
      animateMascot('happy');
      playSuccessSound();
      renderStreak(state.streak);
      updateProgress();
      let message = getEncouragingMessage() + ' +1 🎯';
      if (state.streak === 3)  message = '🔥 3 seguidas! Você está pegando fogo!';
      else if (state.streak === 5)  message = '⚡ 5 seguidas! Incrível!';
      else if (state.streak === 10) message = '💫 10 seguidas! FENOMENAL!';
      setMessage(message, 'win');
      updateHighScore();
      checkAchievements();
      setTimeout(loadNewWord, 650);
      return;
    }

    // Nos outros modos "Próxima" pula sem pontuar
    state.streak = 0;
    renderStreak(0);
    if (state.usedHelp) {
      setMessage('Sem estrela nesta, pois a ajuda foi usada. Você consegue na próxima!');
    } else {
      setMessage('Sequência zerada ao pular.');
    }
    loadNewWord();
  });

  // ── "Embaralhar novamente" ────────────────────────────────────────────────
  el.shuffleBtn.addEventListener('click', () => {
    buildDeck();
    loadNewWord();
    setMessage('Lista embaralhada novamente.');
  });

  // ── "Usar lista" (lista customizada) ─────────────────────────────────────
  el.loadBtn.addEventListener('click', () => {
    const raw   = el.wordsInput.value.trim();
    const parts = raw.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
    let onlyValid;

    if (state.gameMode === 'syllables') {
      onlyValid = parts.filter(w => SYLLABLE_PATTERN.test(w));
      if (!onlyValid.length) {
        setMessage('Nenhuma palavra válida encontrada. Use hífens para separar sílabas (ex.: ca-sa).', 'danger');
        return;
      }
    } else if (state.gameMode === 'letters') {
      onlyValid = parts.filter(w => LETTER_PATTERN.test(w));
      if (!onlyValid.length) {
        setMessage('Nenhuma letra válida encontrada. Digite apenas letras individuais.', 'danger');
        return;
      }
    } else if (state.gameMode === 'numbers') {
      onlyValid = parts.filter(w => NUMBER_PATTERN.test(w));
      if (!onlyValid.length) {
        setMessage('Nenhum número válido encontrado. Digite apenas números.', 'danger');
        return;
      }
    } else {
      onlyValid = parts.filter(w => w.length > 0);
      if (!onlyValid.length) {
        setMessage('Nenhuma frase válida encontrada. Digite pelo menos uma frase.', 'danger');
        return;
      }
    }

    state.words = onlyValid;
    buildDeck();
    loadNewWord();
    setMessage(`Carregado ${state.words.length} ${getItemTypePlural(state.gameMode)}.`, 'muted');
  });

  // ── Alternar maiúsculas/minúsculas ────────────────────────────────────────
  el.toggleCaseBtn.addEventListener('click', () => {
    document.body.classList.toggle('uppercase-mode');
  });

  // ── Botão "Ouvir" (palavra completa) ─────────────────────────────────────
  el.speakBtn.addEventListener('click', () => {
    if (!('speechSynthesis' in window)) {
      setMessage('Recurso de voz não suportado neste navegador.', 'warn');
      return;
    }
    const langToUse =
      state.gameMode === 'syllables' || state.gameMode === 'phrases'
        ? 'pt-BR'
        : state.selectedLanguage;
    const u = new SpeechSynthesisUtterance(stripHyphens(state.words[state.deck[state.idx]]));
    const v = getVoiceForLanguage(langToUse);
    if (v) u.voice = v;
    u.lang   = langToUse;
    u.rate   = 0.95;
    u.pitch  = 1.0;
    u.volume = 1.0;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  });

  // ── Atalhos de teclado ────────────────────────────────────────────────────
  window.addEventListener('keydown', e => {
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
    if (state.gameMode === 'writing' || state.gameMode === 'flags') return; // modos com interação própria
    if (e.key === 'Enter') {
      e.preventDefault();
      el.correctBtn.click();
    } else if (e.key === ' ') {
      e.preventDefault();
      el.nextBtn.click();
    } else if (e.key.toLowerCase() === 'h') {
      e.preventDefault();
      el.helpBtn.click();
    }
  });

  // ── Mascote (clique para encorajamento) ───────────────────────────────────
  el.mascot.addEventListener('click', () => {
    animateMascot('excited');
    playEncouragement();
  });
}
