import { state, el, getLettersForLanguage }              from './state.js';
import { buildDeck }               from './deck.js';
import { renderStreak, updateProgress, setMessage } from './ui.js';
import { loadNewWord }             from './game.js';
import { updateCurrentItemUI }     from './render.js';

// ── Visibilidade do seletor de idioma ─────────────────────────────────────

/**
 * Exibe ou esconde o seletor de idioma conforme o modo ativo.
 * Apenas Letras, Números e Cores precisam de seleção de idioma.
 */
export function updateLanguageSelectorVisibility() {
  const showFor = ['letters', 'numbers', 'colors'];
  el.languageSelector.style.display = showFor.includes(state.gameMode) ? 'inline-block' : 'none';
}

// ── Troca de modo de jogo ─────────────────────────────────────────────────

/**
 * Altera o modo de jogo, configura a lista de itens correspondente,
 * recria o deck e carrega o primeiro item.
 * @param {'syllables'|'phrases'|'letters'|'numbers'|'colors'|'writing'} mode
 */
export function setMode(mode) {
  state.gameMode = mode;

  // Modos que não usam lista customizável escondem o painel de config
  if (mode === 'colors' || mode === 'numbers' || mode === 'writing') {
    el.configSection.style.display = 'none';
    el.configSection.open          = false;
  } else {
    el.configSection.style.display = 'block';
  }

  if (mode === 'syllables') {
    state.words            = [...state.dbSyllables];
    el.wordsInput.value    = state.dbSyllables.join(', ');
    el.configSummary.textContent = 'Carregar/editar lista de palavras (sílabas separadas por "-")';
    el.configHelp.innerHTML =
      'Separe por vírgula, ponto-e-vírgula ou quebra de linha. Ex.: <code>ca-sa</code>, <code>ho-ra</code>, <code>so-fá</code>';
    el.nextBtn.textContent = 'Próxima palavra ➜';

  } else if (mode === 'letters') {
    state.words            = getLettersForLanguage(state.selectedLanguage);
    el.wordsInput.value    = state.words.join(', ');
    el.configSummary.textContent = 'Carregar/editar lista de letras';
    el.configHelp.innerHTML =
      'Separe por vírgula, ponto-e-vírgula ou quebra de linha. Ex.: <code>A</code>, <code>B</code>, <code>C</code>';
    el.nextBtn.textContent = 'Próxima letra ➜';

  } else if (mode === 'numbers') {
    state.words = [];
    for (let i = state.numbersRange.min; i <= state.numbersRange.max; i++) {
      state.words.push(String(i));
    }
    el.nextBtn.textContent = 'Próximo número ➜';

  } else if (mode === 'colors') {
    state.words            = state.dbColors.map(c => JSON.stringify(c));
    el.nextBtn.textContent = 'Próxima cor ➜';

  } else if (mode === 'writing') {
    state.words            = state.dbWriting.map(w => JSON.stringify(w));
    el.nextBtn.textContent = 'Próxima palavra ➜';

  } else {
    // phrases
    state.words            = [...state.dbPhrases];
    el.wordsInput.value    = state.dbPhrases.join('\n');
    el.configSummary.textContent = 'Carregar/editar lista de frases';
    el.configHelp.innerHTML =
      'Separe por quebra de linha. Ex.: <code>O gato mia</code>, <code>A lua brilha</code>';
    el.nextBtn.textContent = 'Próxima frase ➜';
  }

  state.streak       = 0;
  state.sessionWords = 0;
  buildDeck();
  loadNewWord();
  renderStreak(0);
  updateProgress();
  updateLanguageSelectorVisibility();
  el.modeSelection.classList.add('hidden');
}

// ── Listeners de seleção de modo ─────────────────────────────────────────

/**
 * Registra todos os eventos dos botões de seleção e configuração de modos,
 * incluindo configuração de Números, configuração de Escrita,
 * botão "Trocar" e seletor de idioma.
 */
export function initModeListeners() {

  // ── Botões de seleção de modo ─────────────────────────────────────────────
  el.modeSyllablesBtn.addEventListener('click', () => setMode('syllables'));
  el.modePhrasesBtn.addEventListener('click',   () => setMode('phrases'));
  el.modeLettersBtn.addEventListener('click',   () => setMode('letters'));
  el.modeColorsBtn.addEventListener('click',    () => setMode('colors'));

  // Números: abre painel de configuração antes de iniciar
  el.modeNumbersBtn.addEventListener('click', () => {
    el.modeSelection.classList.add('hidden');
    el.numbersConfig.classList.remove('hidden');
  });

  // ── Configuração de Números ───────────────────────────────────────────────
  el.minNumber.addEventListener('input', e => {
    const value = parseInt(e.target.value);
    el.minNumberValue.textContent = value;
    if (parseInt(el.maxNumber.value) < value) {
      el.maxNumber.value            = value;
      el.maxNumberValue.textContent = value;
    }
  });

  el.maxNumber.addEventListener('input', e => {
    const value = parseInt(e.target.value);
    el.maxNumberValue.textContent = value;
    if (parseInt(el.minNumber.value) > value) {
      el.minNumber.value            = value;
      el.minNumberValue.textContent = value;
    }
  });

  el.confirmNumbersBtn.addEventListener('click', () => {
    state.numbersRange.min = parseInt(el.minNumber.value);
    state.numbersRange.max = parseInt(el.maxNumber.value);
    el.numbersConfig.classList.add('hidden');
    setMode('numbers');
  });

  el.cancelNumbersBtn.addEventListener('click', () => {
    el.numbersConfig.classList.add('hidden');
    el.modeSelection.classList.remove('hidden');
  });

  // ── Configuração de Escrita ───────────────────────────────────────────────
  el.modeWritingBtn.addEventListener('click', () => {
    el.modeSelection.classList.add('hidden');
    el.writingConfig.classList.remove('hidden');
  });

  el.extraLetters.addEventListener('input', e => {
    el.extraLettersValue.textContent = e.target.value;
  });

  el.confirmWritingBtn.addEventListener('click', () => {
    state.writingExtraLetters = parseInt(el.extraLetters.value);
    el.writingConfig.classList.add('hidden');
    setMode('writing');
  });

  el.cancelWritingBtn.addEventListener('click', () => {
    el.writingConfig.classList.add('hidden');
    el.modeSelection.classList.remove('hidden');
  });

  // ── Botão "Trocar" ────────────────────────────────────────────────────────
  el.changeModeBtn.addEventListener('click', () => {
    el.modeSelection.classList.remove('hidden');
  });

  // ── Seletor de idioma ─────────────────────────────────────────────────────
  el.languageSelector.addEventListener('change', e => {
    state.selectedLanguage = e.target.value;
    localStorage.setItem('selectedLanguage', state.selectedLanguage);
    if (state.gameMode === 'letters' && state.idx >= 0) {
      // Troca o alfabeto inteiro (ex.: cirílico em russo) e reinicia o deck
      state.words = getLettersForLanguage(state.selectedLanguage);
      buildDeck();
      loadNewWord();
    } else if (
      (state.gameMode === 'colors' || state.gameMode === 'numbers') &&
      state.idx >= 0
    ) {
      updateCurrentItemUI();
    }
  });
}
