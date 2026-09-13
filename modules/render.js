import { state, el, numberTranslations } from './state.js';
import { shuffle }                        from './deck.js';
import { getVoiceForLanguage, speakWord } from './speech.js';
import { setMessage, renderStreak }       from './ui.js';

// ── Helpers de renderização ────────────────────────────────────────────────

/**
 * Retorna o nome da cor localizado para o idioma dado.
 * Suporta tanto `name` string quanto `name` objeto multilíngue.
 * @param {object} colorData
 * @param {string} language
 * @returns {string}
 */
export function getLocalizedColorName(colorData, language) {
  return typeof colorData.name === 'object'
    ? (colorData.name[language] || colorData.name['pt-BR'])
    : colorData.name;
}

/**
 * Retorna a label plural do tipo de item para o modo informado.
 * @param {string} mode
 * @returns {string}
 */
export function getItemTypePlural(mode) {
  const types = {
    phrases:   'frase(s)',
    letters:   'letra(s)',
    numbers:   'número(s)',
    colors:    'cor(es)',
    syllables: 'palavra(s)',
    writing:   'palavra(s)',
  };
  return types[mode] || 'item(s)';
}

/**
 * Calcula e retorna o nível de dificuldade do item atual.
 * @param {string} text  O item cru (com hífens para sílabas)
 * @returns {{ text: string, color: string, hidden: boolean }}
 */
export function getWordDifficulty(text) {
  if (state.gameMode === 'letters')
    return { text: '🔤 Letra', color: '#22c55e', hidden: false };
  if (state.gameMode === 'numbers' || state.gameMode === 'colors' || state.gameMode === 'writing')
    return { text: '', color: '', hidden: true };

  const count = state.gameMode === 'phrases' ? text.split(' ').length : text.split('-').length;
  if (state.gameMode === 'phrases') {
    if (count <= 3) return { text: '📖 Frase Curta', color: '#22c55e', hidden: false };
    if (count <= 5) return { text: '📗 Frase Média', color: '#3b82f6', hidden: false };
    return             { text: '📕 Frase Longa',  color: '#ef4444', hidden: false };
  } else {
    if (count === 1) return { text: '📖 Muito Fácil', color: '#22c55e', hidden: false };
    if (count === 2) return { text: '📗 Fácil',       color: '#3b82f6', hidden: false };
    if (count === 3) return { text: '📘 Médio',       color: '#f59e0b', hidden: false };
    return             { text: '📕 Desafio',      color: '#ef4444', hidden: false };
  }
}

/**
 * Remove hífens e espaços extras do texto para leitura contínua.
 * Nos modos que não usam hífens a string é devolvida intacta.
 * @param {string} text
 * @returns {string}
 */
export function stripHyphens(text) {
  if (
    state.gameMode === 'phrases' ||
    state.gameMode === 'letters' ||
    state.gameMode === 'numbers' ||
    state.gameMode === 'colors'  ||
    state.gameMode === 'writing'
  ) return text;
  return text.replace(/\s+/g, '').replace(/-/g, '');
}

// ── Handler de clique em sílaba / item ────────────────────────────────────

/**
 * Trata o clique em um botão de sílaba, palavra, letra, número ou cor.
 * Faz a síntese de voz do item clicado e verifica se todas as sílabas
 * foram clicadas para liberar o botão "Ouvir".
 * @param {Event} e
 */
export function handleSyllableClick(e) {
  const index = parseInt(e.target.dataset.index);
  const text  = state.words[state.deck[state.idx]];
  let parts;
  let syllable;

  if (state.gameMode === 'phrases') {
    parts    = text.split(' ');
    syllable = parts[index];
  } else if (state.gameMode === 'letters') {
    syllable = text;
    // No alfabeto cirílico (ru-RU), a voz TTS lê uma letra MAIÚSCULA isolada
    // como o *nome* da letra (ex.: "Е" vira "ye"/explicação) em vez do som.
    // Falando a minúscula, o motor entrega o fonema puro (só a letra).
    if (state.selectedLanguage === 'ru-RU') {
      syllable = syllable.toLocaleLowerCase('ru');
    }
  } else if (state.gameMode === 'numbers') {
    syllable = e.target.dataset.speak || text;
  } else if (state.gameMode === 'colors') {
    syllable = e.target.dataset.color;
    const nameDisplay = document.getElementById('colorNameDisplay');
    if (nameDisplay) nameDisplay.style.opacity = '1';
  } else {
    parts    = text.split('-');
    syllable = parts[index];
  }

  e.target.classList.add('clicked');
  setTimeout(() => e.target.classList.remove('clicked'), 400);

  const langToUse =
    state.gameMode === 'syllables' || state.gameMode === 'phrases'
      ? 'pt-BR'
      : state.selectedLanguage;

  const u = new SpeechSynthesisUtterance(syllable);
  const v = getVoiceForLanguage(langToUse);
  if (v) u.voice = v;
  u.lang   = langToUse;
  u.rate   = 0.95;
  u.pitch  = 1.0;
  u.volume = 1.0;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
  state.syllablesClicked.add(index);

  // Modos que não têm "Ouvir" após completar: retornar cedo
  if (state.gameMode === 'letters' || state.gameMode === 'numbers' || state.gameMode === 'colors') {
    return;
  }

  if (!parts) {
    parts = state.gameMode === 'phrases' ? text.split(' ') : text.split('-');
  }
  if (state.syllablesClicked.size === parts.length) {
    el.speakBtn.style.display = 'inline-block';
  }
}

// ── Helpers internos do modo Escrita (usados por renderWord) ───────────────

/**
 * Gera `count` letras aleatórias que preferencialmente não estejam em
 * `excludeLetters` (letras da palavra correta).
 * @param {number}   count
 * @param {string[]} excludeLetters
 * @returns {string[]}
 */
function getRandomLetters(count, excludeLetters) {
  const all    = 'AEIOU' + 'BCDFGHJKLMNPQRSTVWXYZ';
  const result = [];
  for (let i = 0; i < count; i++) {
    let letter;
    let attempts = 0;
    do {
      letter = all[Math.floor(Math.random() * all.length)];
      attempts++;
    } while (excludeLetters.includes(letter) && result.includes(letter) && attempts < 50);
    result.push(letter);
  }
  return result;
}

/**
 * Monta toda a interface do modo Escrita (slots + letras embaralhadas)
 * e injeta no container principal `el.word`.
 */
function renderWritingUI() {
  const raw  = state.words[state.deck[state.idx]];
  state.writingWordData = JSON.parse(raw);
  const word    = state.writingWordData.word;
  const letters = word.split('');

  // Resetar estado de escrita
  state.writingSlots = new Array(letters.length).fill(null);
  state.writingUsedIndices.clear();

  // Montar pool: letras corretas + letras distratoras embaralhadas
  const extraLetters  = getRandomLetters(state.writingExtraLetters, letters);
  state.writingPool   = shuffle([...letters, ...extraLetters]);

  let html = '<div style="display:flex; flex-direction:column; align-items:center; gap:16px;">';

  if (state.writingWordData.image) {
    html += `<div class="writing-image">${state.writingWordData.image}</div>`;
    html += `<button class="writing-speaker-mini" onclick="speakWord('${word}')" title="Ouvir a palavra">🔈</button>`;
  } else {
    html += `<button class="writing-listen-btn" onclick="speakWord('${word}')" title="Ouvir a palavra">🔈</button>`;
  }

  // Slots de resposta
  html += '<div class="writing-slots">';
  for (let i = 0; i < letters.length; i++) {
    html += `<div class="writing-slot" data-slot="${i}" onclick="handleSlotClick(${i})"></div>`;
  }
  html += '</div>';

  // Pool de letras disponíveis
  html += '<div class="writing-letters">';
  for (let i = 0; i < state.writingPool.length; i++) {
    html += `<button class="writing-letter-btn" data-pool="${i}" onclick="handleLetterClick(${i})">${state.writingPool[i]}</button>`;
  }
  html += '</div>';

  html += '</div>';

  el.word.innerHTML        = html;
  el.helpBtn.style.display = 'none';
}

// ── Renderização principal do item ─────────────────────────────────────────

/**
 * Renderiza o item atual de acordo com o modo de jogo.
 * @param {string}  text       O item cru (com hífens, JSON, etc.)
 * @param {boolean} showParts  Se verdadeiro, exibe as partes separadas (sílabas/palavras)
 */
export function renderWord(text, showParts) {
  let parts;
  let separator;

  if (state.gameMode === 'phrases') {
    parts     = text.split(' ');
    separator = '<span class="syllable" style="opacity:0"> </span>';

  } else if (state.gameMode === 'letters' || state.gameMode === 'numbers') {
    let displayText = text;
    let speakText   = text;

    if (state.gameMode === 'numbers') {
      const numValue = parseInt(text);
      if (numValue >= 0 && numValue <= 20) {
        speakText = numberTranslations[state.selectedLanguage]?.[numValue] ?? text;
      }
    }

    el.word.innerHTML        = `<button class="syllable-btn" data-index="0" data-speak="${speakText}">${displayText}</button>`;
    el.helpBtn.style.display = 'none';

    setTimeout(() => {
      document.querySelectorAll('.syllable-btn').forEach(btn => {
        btn.addEventListener('click', handleSyllableClick);
      });
    }, 0);
    return;

  } else if (state.gameMode === 'colors') {
    const colorData = JSON.parse(text);
    const colorName = getLocalizedColorName(colorData, state.selectedLanguage);
    el.word.innerHTML = `
      <div class="color-container" style="display:flex; flex-direction:column; align-items:center; gap:20px;">
        <button class="color-box" data-index="0" data-color="${colorName}"
          style="background-color: ${colorData.color}; width: 200px; height: 200px; border-radius: 20px;
                 border: 3px solid #fff; cursor: pointer; box-shadow: 0 10px 25px rgba(0,0,0,0.3);
                 transition: transform 0.2s;">
        </button>
        <div id="colorNameDisplay"
          style="font-size: 32px; font-weight: bold; min-height: 40px; color: var(--text);
                 opacity: 0; transition: opacity 0.3s;">${colorName}</div>
      </div>
    `;
    el.helpBtn.style.display = 'none';

    setTimeout(() => {
      document.querySelectorAll('.color-box').forEach(btn => {
        btn.addEventListener('click', handleSyllableClick);
        btn.addEventListener('mouseenter', e => { e.target.style.transform = 'scale(1.05)'; });
        btn.addEventListener('mouseleave', e => { e.target.style.transform = 'scale(1)'; });
      });
    }, 0);
    return;

  } else if (state.gameMode === 'writing') {
    renderWritingUI();
    return;

  } else {
    // Modo sílabas (padrão)
    parts     = text.split('-');
    separator = '<span class="syllable" style="opacity:.5">-</span>';
  }

  el.helpBtn.style.display = 'inline-block';

  if (showParts) {
    el.helpBtn.textContent = state.gameMode === 'phrases' ? 'Esconder palavras' : 'Esconder sílabas';
    el.word.innerHTML = parts
      .map((p, i) => `<button class="syllable-btn" data-index="${i}">${p}</button>`)
      .join(separator);

    setTimeout(() => {
      document.querySelectorAll('.syllable-btn').forEach(btn => {
        btn.addEventListener('click', handleSyllableClick);
      });
    }, 0);
  } else {
    el.helpBtn.textContent = state.gameMode === 'phrases' ? 'Separar palavras' : 'Mostrar sílabas';
    el.word.textContent    = stripHyphens(text);
  }
}

/**
 * Re-renderiza o item atual mantendo o estado de ajuda atual.
 * Usado quando o idioma muda sem trocar de palavra.
 */
export function updateCurrentItemUI() {
  if (state.idx < 0) return;
  const w = state.words[state.deck[state.idx]];
  renderWord(w, state.usedHelp);
}

// ── Listener do botão de ajuda ────────────────────────────────────────────

/**
 * Registra o evento do botão de ajuda (Mostrar/Esconder sílabas).
 */
export function initRenderListeners() {
  el.helpBtn.addEventListener('click', () => {
    if (!state.usedHelp) {
      state.streak = 0;
      renderStreak(0);
    }

    if (
      !state.usedHelp &&
      (el.helpBtn.textContent.startsWith('Mostrar') || el.helpBtn.textContent.startsWith('Ouvir'))
    ) {
      state.usedHelp = true;
      renderWord(state.words[state.deck[state.idx]], true);
      setMessage('Ajuda ativada: este item não vale estrela.', 'warn');
    } else if (el.helpBtn.textContent.startsWith('Esconder')) {
      renderWord(state.words[state.deck[state.idx]], false);
    } else {
      state.usedHelp = true;
      renderWord(state.words[state.deck[state.idx]], true);
      setMessage('Ajuda ativada: este item não vale ponto.', 'warn');
    }
  });
}
