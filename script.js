// Dados carregados dos JSONs
let dbSyllables = [];
let dbPhrases = [];
let dbLetters = [];
let dbColors = [];
let dbWriting = [];
let gameMode = 'syllables'; // 'syllables' | 'phrases' | 'letters' | 'numbers' | 'colors' | 'writing'
let numbersRange = { min: 0, max: 10 }; // intervalo para números
let writingExtraLetters = 2; // letras extras no modo escrita
let writingSlots = []; // letras colocadas nos slots
let writingWordData = null; // dados da palavra atual no modo escrita
let writingPool = []; // pool de letras disponíveis
let writingUsedIndices = new Set(); // índices usados do pool
let selectedLanguage = localStorage.getItem('selectedLanguage') || 'pt-BR'; // idioma selecionado

// Traduções para números (0-100)
const numberTranslations = {
  'pt-BR': ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez',
            'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove', 'vinte'],
  'en-US': ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
            'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'],
  'es-ES': ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'siete', 'ocho', 'nueve', 'diez',
            'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte'],
  'de-DE': ['null', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn',
            'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn', 'zwanzig']
};

// Helper function to get localized color name
function getLocalizedColorName(colorData, language) {
  return typeof colorData.name === 'object' ? (colorData.name[language] || colorData.name['pt-BR']) : colorData.name;
}

// Regex patterns for validation
const SYLLABLE_PATTERN = /[a-zA-ZáàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]+-[a-zA-Z]/;
const LETTER_PATTERN = /^[a-zA-ZáàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]$/;
const NUMBER_PATTERN = /^-?\d+$/;

const el = {
  word: document.getElementById('word'),
  helpBtn: document.getElementById('helpBtn'),
  speakBtn: document.getElementById('speakBtn'),
  correctBtn: document.getElementById('correctBtn'),
  nextBtn: document.getElementById('nextBtn'),
  message: document.getElementById('message'),
  wordsInput: document.getElementById('wordsInput'),
  loadBtn: document.getElementById('loadBtn'),
  shuffleBtn: document.getElementById('shuffleBtn'),
  resetBtn: document.getElementById('resetBtn'),
  resetRecordBtn: document.getElementById('resetRecordBtn'),
  streakDisplay: document.getElementById('streakDisplay'),
  highScore: document.getElementById('highScore'),
  progressFill: document.getElementById('progressFill'),
  progressText: document.getElementById('progressText'),
  mascot: document.getElementById('mascot'),
  achievementPopup: document.getElementById('achievementPopup'),
  levelDisplay: document.getElementById('levelDisplay'),
  wordDifficulty: document.getElementById('wordDifficulty'),
  modeSelection: document.getElementById('modeSelection'),
  modeSyllablesBtn: document.getElementById('modeSyllablesBtn'),
  modePhrasesBtn: document.getElementById('modePhrasesBtn'),
  modeLettersBtn: document.getElementById('modeLettersBtn'),
  modeNumbersBtn: document.getElementById('modeNumbersBtn'),
  modeColorsBtn: document.getElementById('modeColorsBtn'),
  numbersConfig: document.getElementById('numbersConfig'),
  minNumber: document.getElementById('minNumber'),
  maxNumber: document.getElementById('maxNumber'),
  minNumberValue: document.getElementById('minNumberValue'),
  maxNumberValue: document.getElementById('maxNumberValue'),
  confirmNumbersBtn: document.getElementById('confirmNumbersBtn'),
  cancelNumbersBtn: document.getElementById('cancelNumbersBtn'),
  changeModeBtn: document.getElementById('changeModeBtn'),
  toggleCaseBtn: document.getElementById('toggleCaseBtn'),
  configSummary: document.getElementById('configSummary'),
  configHelp: document.getElementById('configHelp'),
  configSection: document.getElementById('configSection'),
  languageSelector: document.getElementById('languageSelector'),
  modeWritingBtn: document.getElementById('modeWritingBtn'),
  writingConfig: document.getElementById('writingConfig'),
  extraLetters: document.getElementById('extraLetters'),
  extraLettersValue: document.getElementById('extraLettersValue'),
  confirmWritingBtn: document.getElementById('confirmWritingBtn'),
  cancelWritingBtn: document.getElementById('cancelWritingBtn')
};

// Estado do jogo
let words = []; // sempre no formato com hífen
let deck = []; // índices embaralhados
let idx = -1; // índice atual no deck
let usedHelp = false; // se clicou ajuda na palavra atual
let streak = 0; // sequência de acertos sem ajuda
let high = Number(sessionStorage.getItem('readingStarsHighScore') || 0);
let syllablesClicked = new Set(); // sílabas clicadas
let totalWords = Number(localStorage.getItem('readingTotalWords') || 0); // total de palavras lidas corretamente
let sessionWords = 0; // palavras da sessão atual
let level = 1; // nível atual

// Mascotes que mudam com o nível
const mascots = ['🐶', '🐱', '🐷', '🐘', '🐬', '🐙', '🦉', '🐉', '🦄', '👑'];

el.highScore.textContent = high;
el.speakBtn.style.display = 'none'; // esconder botão de ouvir inicialmente

// Calcular nível baseado em palavras totais (a cada 4 palavras)
function calculateLevel() {
  level = Math.floor(totalWords / 4) + 1;
  // Ciclar mascotes se passar do limite
  const mascotIndex = (level - 1) % mascots.length;
  el.levelDisplay.textContent = level;
  el.mascot.textContent = mascots[mascotIndex];
}

// ---------------------- Utilidades ----------------------
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function buildDeck() {
  deck = shuffle([...words.keys()]);
  idx = -1;
}

function nextFromDeck() {
  idx++;
  if (idx >= deck.length) {
    buildDeck();
    idx = 0;
  }
  return words[deck[idx]];
}

function stripHyphens(text) {
  if (gameMode === 'phrases' || gameMode === 'letters' || gameMode === 'numbers' || gameMode === 'colors' || gameMode === 'writing') return text;
  return text.replace(/\s+/g, '').replace(/-/g, '');
}

function renderWord(text, showParts) {
  let parts;
  let separator;
  
  if (gameMode === 'phrases') {
    parts = text.split(' ');
    separator = '<span class="syllable" style="opacity:0"> </span>'; // espaço visível
  } else if (gameMode === 'letters' || gameMode === 'numbers') {
    // Para letras e números, sempre mostrar como botão clicável
    parts = [text];
    separator = '';
    
    // Para números, mostrar o número visual mas falar o nome
    let displayText = text;
    let speakText = text;
    
    if (gameMode === 'numbers') {
      const numValue = parseInt(text);
      if (numValue >= 0 && numValue <= 20) {
        if (numberTranslations[selectedLanguage] && numberTranslations[selectedLanguage][numValue]) {
          speakText = numberTranslations[selectedLanguage][numValue];
        } else {
          speakText = text;
        }
      } else {
        speakText = text;
      }
    }
    
    el.word.innerHTML = `<button class="syllable-btn" data-index="0" data-speak="${speakText}">${displayText}</button>`;
    el.helpBtn.style.display = 'none';
    
    setTimeout(() => {
      document.querySelectorAll('.syllable-btn').forEach(btn => {
        btn.addEventListener('click', handleSyllableClick);
      });
    }, 0);
    return;
  } else if (gameMode === 'colors') {
    const colorData = JSON.parse(text);
    const colorName = getLocalizedColorName(colorData, selectedLanguage);
    el.word.innerHTML = `
      <div class="color-container" style="display:flex; flex-direction:column; align-items:center; gap:20px;">
        <button class="color-box" data-index="0" data-color="${colorName}" style="background-color: ${colorData.color}; width: 200px; height: 200px; border-radius: 20px; border: 3px solid #fff; cursor: pointer; box-shadow: 0 10px 25px rgba(0,0,0,0.3); transition: transform 0.2s;"></button>
        <div id="colorNameDisplay" style="font-size: 32px; font-weight: bold; min-height: 40px; color: var(--text); opacity: 0; transition: opacity 0.3s;">${colorName}</div>
      </div>
    `;
    
    el.helpBtn.style.display = 'none';
    
    setTimeout(() => {
      document.querySelectorAll('.color-box').forEach(btn => {
        btn.addEventListener('click', handleSyllableClick);
        btn.addEventListener('mouseenter', (e) => {
          e.target.style.transform = 'scale(1.05)';
        });
        btn.addEventListener('mouseleave', (e) => {
          e.target.style.transform = 'scale(1)';
        });
      });
    }, 0);
    return;
  } else if (gameMode === 'writing') {
    renderWritingUI();
    return;
  } else {
    parts = text.split('-');
    separator = '<span class="syllable" style="opacity:.5">-</span>';
  }

  el.helpBtn.style.display = 'inline-block';

  if (showParts) {
    el.helpBtn.textContent = gameMode === 'phrases' ? 'Esconder palavras' : 'Esconder sílabas';
    el.word.innerHTML = parts.map((p, i) => `<button class="syllable-btn" data-index="${i}">${p}</button>`).join(separator);
    
    setTimeout(() => {
      document.querySelectorAll('.syllable-btn').forEach(btn => {
        btn.addEventListener('click', handleSyllableClick);
      });
    }, 0);
  } else {
    el.helpBtn.textContent = gameMode === 'phrases' ? 'Separar palavras' : 'Mostrar sílabas';
    el.word.textContent = stripHyphens(text);
  }
}

function handleSyllableClick(e) {
  const index = parseInt(e.target.dataset.index);
  const text = words[deck[idx]];
  let parts;
  let syllable;
  
  if (gameMode === 'phrases') {
    parts = text.split(' ');
    syllable = parts[index];
  } else if (gameMode === 'letters') {
    syllable = text;
  } else if (gameMode === 'numbers') {
    syllable = e.target.dataset.speak || text;
  } else if (gameMode === 'colors') {
    syllable = e.target.dataset.color;
    const nameDisplay = document.getElementById('colorNameDisplay');
    if (nameDisplay) {
      nameDisplay.style.opacity = '1';
    }
  } else {
    parts = text.split('-');
    syllable = parts[index];
  }
  
  e.target.classList.add('clicked');
  setTimeout(() => e.target.classList.remove('clicked'), 400);
  
  const langToUse = (gameMode === 'syllables' || gameMode === 'phrases') ? 'pt-BR' : selectedLanguage;
  const u = new SpeechSynthesisUtterance(syllable);
  const v = getVoiceForLanguage(langToUse);
  if (v) u.voice = v;
  u.lang = langToUse;
  u.rate = 0.95;
  u.pitch = 1.0;
  u.volume = 1.0;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
  syllablesClicked.add(index);
  
  if (gameMode === 'letters' || gameMode === 'numbers' || gameMode === 'colors') {
    return;
  }
  
  if (!parts) {
    parts = gameMode === 'phrases' ? text.split(' ') : text.split('-');
  }
  if (syllablesClicked.size === parts.length) {
    el.speakBtn.style.display = 'inline-block';
  }
}

function updateCurrentItemUI() {
  if (idx < 0) return;
  const w = words[deck[idx]];
  renderWord(w, usedHelp);
}

function setMessage(msg = '', kind = 'muted') {
  el.message.textContent = msg;
  if (kind === 'win') el.message.style.color = 'var(--ok)';
  else if (kind === 'warn') el.message.style.color = 'var(--warn)';
  else if (kind === 'danger') el.message.style.color = 'var(--danger)';
  else el.message.style.color = 'var(--muted)';
}

function renderStreak(n) {
  el.streakDisplay.textContent = n;
  if (n > 0) {
    el.streakDisplay.classList.remove('pulse');
    void el.streakDisplay.offsetWidth;
    el.streakDisplay.classList.add('pulse');
  }
}

function celebrate() {
  setMessage('🎉 Uau! Você bateu seu recorde! Continue assim!', 'win');
  const colors = ['#fde047', '#60a5fa', '#f97316', '#22c55e', '#e879f9'];
  for (let i = 0; i < 60; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti';
    const size = 6 + Math.random() * 8;
    piece.style.left = Math.random() * 100 + 'vw';
    piece.style.width = size + 'px';
    piece.style.height = (size * 1.4) + 'px';
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.transform = `rotate(${Math.random()*360}deg)`;
    piece.style.animationDuration = (900 + Math.random() * 700) + 'ms';
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), 1600);
  }
}

function updateProgress() {
  const currentProgress = totalWords % 4;
  const percentage = (currentProgress / 4) * 100;
  el.progressFill.style.width = percentage + '%';
  el.progressText.textContent = `${currentProgress} / 4`;
}

function showAchievement(icon, text) {
  el.achievementPopup.innerHTML = `<div class="achievement-icon">${icon}</div>${text}`;
  el.achievementPopup.classList.add('show');
  playSuccessSound();
  setTimeout(() => {
    el.achievementPopup.classList.remove('show');
  }, 3000);
}

function checkAchievements() {
  if (totalWords === 5) {
    showAchievement('🌟', 'Primeira Conquista!<br/>5 acertos!');
  } else if (totalWords === 20) {
    showAchievement('🏆', 'Incrível!<br/>20 acertos!');
  } else if (totalWords === 50) {
    showAchievement('👑', 'Campeão de Leitura!<br/>50 acertos!');
  }
  
  const oldLevel = level;
  calculateLevel();
  if (level > oldLevel) {
    showAchievement('🎊', `Subiu para o Nível ${level}!`);
    el.mascot.classList.add('excited');
    setTimeout(() => el.mascot.classList.remove('excited'), 800);
    playEncouragement();
  }
}

function animateMascot(type = 'happy') {
  el.mascot.classList.add(type);
  setTimeout(() => el.mascot.classList.remove(type), type === 'happy' ? 600 : 800);
}

function playSuccessSound() {
  if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
  }
}

function getEncouragingMessage() {
  const messages = [
    '👏 Muito bem! Continue assim!',
    '🌟 Excelente trabalho!',
    '🎯 Você está arrasando!',
    '💪 Incrível! Você consegue!',
    '✨ Perfeito! Você é demais!',
    '🚀 Maravilhoso! Vamos continuar!',
    '🎨 Fantástico! Que leitura linda!',
    '🦸 Você é um super leitor!',
    '🌈 Brilhante! Parabéns!'
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

function getItemTypePlural(mode) {
  const types = {
    'phrases': 'frase(s)',
    'letters': 'letra(s)',
    'numbers': 'número(s)',
    'colors': 'cor(es)',
    'syllables': 'palavra(s)',
    'writing': 'palavra(s)'
  };
  return types[mode] || 'item(s)';
}

function getWordDifficulty(text) {
  if (gameMode === 'letters') return { text: '🔤 Letra', color: '#22c55e', hidden: false };
  if (gameMode === 'numbers' || gameMode === 'colors' || gameMode === 'writing') return { text: '', color: '', hidden: true };
  
  const count = gameMode === 'phrases' ? text.split(' ').length : text.split('-').length;
  if (gameMode === 'phrases') {
     if (count <= 3) return { text: '📖 Frase Curta', color: '#22c55e', hidden: false };
     if (count <= 5) return { text: '📗 Frase Média', color: '#3b82f6', hidden: false };
     return { text: '📕 Frase Longa', color: '#ef4444', hidden: false };
  } else {
     if (count === 1) return { text: '📖 Muito Fácil', color: '#22c55e', hidden: false };
     if (count === 2) return { text: '📗 Fácil', color: '#3b82f6', hidden: false };
     if (count === 3) return { text: '📘 Médio', color: '#f59e0b', hidden: false };
     return { text: '📕 Desafio', color: '#ef4444', hidden: false };
  }
}

function loadNewWord() {
  const w = nextFromDeck();
  usedHelp = false;
  syllablesClicked.clear();
  el.speakBtn.style.display = 'none';

  if (gameMode === 'writing') {
    el.helpBtn.style.display = 'none';
    el.correctBtn.style.display = 'none';
    el.nextBtn.style.display = 'none';
    el.speakBtn.style.display = 'none';
  } else {
    el.correctBtn.style.display = '';
    el.nextBtn.style.display = '';
  }

  renderWord(w, false);
  setMessage('');

  const difficulty = getWordDifficulty(w);
  if (difficulty.hidden) {
    el.wordDifficulty.style.display = 'none';
  } else {
    el.wordDifficulty.style.display = 'block';
    el.wordDifficulty.textContent = difficulty.text;
    el.wordDifficulty.style.color = difficulty.color;
  }
}

function updateHighScore() {
  if (streak > high) {
    high = streak;
    el.highScore.textContent = high;
    sessionStorage.setItem('readingStarsHighScore', String(high));
    celebrate();
  }
}

el.helpBtn.addEventListener('click', () => {
  if (!usedHelp) {
     streak = 0;
     renderStreak(0);
  }
  if (!usedHelp && (el.helpBtn.textContent.startsWith('Mostrar') || el.helpBtn.textContent.startsWith('Ouvir'))) {
    usedHelp = true;
    renderWord(words[deck[idx]], true);
    setMessage('Ajuda ativada: este item não vale estrela.', 'warn');
  } else if (el.helpBtn.textContent.startsWith('Esconder')) {
    renderWord(words[deck[idx]], false);
  } else {
    usedHelp = true;
    renderWord(words[deck[idx]], true);
    setMessage('Ajuda ativada: este item não vale ponto.', 'warn');
  }
});

el.correctBtn.addEventListener('click', () => {
  if (usedHelp) {
    streak = 0;
    renderStreak(streak);
    setMessage('Boa! Tente ler a próxima sem ajuda para ganhar pontos. 🎯', 'muted');
    setTimeout(loadNewWord, 650);
    return;
  }
  streak++;
  totalWords++;
  sessionWords++;
  localStorage.setItem('readingTotalWords', String(totalWords));
  el.word.classList.add('bounce');
  setTimeout(() => el.word.classList.remove('bounce'), 600);
  animateMascot('happy');
  playSuccessSound();
  renderStreak(streak);
  updateProgress();
  let message = getEncouragingMessage() + ` +1 🎯`;
  if (streak === 3) message = '🔥 3 seguidas! Você está pegando fogo!';
  else if (streak === 5) message = '⚡ 5 seguidas! Incrível!';
  else if (streak === 10) message = '💫 10 seguidas! FENOMENAL!';
  setMessage(message, 'win');
  updateHighScore();
  checkAchievements();
  setTimeout(loadNewWord, 650);
});

el.nextBtn.addEventListener('click', () => {
  if (gameMode === 'letters' || gameMode === 'numbers' || gameMode === 'colors') {
    streak++;
    totalWords++;
    sessionWords++;
    localStorage.setItem('readingTotalWords', String(totalWords));
    el.word.classList.add('bounce');
    setTimeout(() => el.word.classList.remove('bounce'), 600);
    animateMascot('happy');
    playSuccessSound();
    renderStreak(streak);
    updateProgress();
    let message = getEncouragingMessage() + ` +1 🎯`;
    if (streak === 3) message = '🔥 3 seguidas! Você está pegando fogo!';
    else if (streak === 5) message = '⚡ 5 seguidas! Incrível!';
    else if (streak === 10) message = '💫 10 seguidas! FENOMENAL!';
    setMessage(message, 'win');
    updateHighScore();
    checkAchievements();
    setTimeout(loadNewWord, 650);
    return;
  }
  streak = 0;
  renderStreak(0);
  if (usedHelp) {
    setMessage('Sem estrela nesta, pois a ajuda foi usada. Você consegue na próxima!');
  } else {
    setMessage('Sequência zerada ao pular.');
  }
  loadNewWord();
});

el.shuffleBtn.addEventListener('click', () => {
  buildDeck();
  loadNewWord();
  setMessage('Lista embaralhada novamente.');
});

el.resetBtn.addEventListener('click', () => {
  streak = 0;
  renderStreak(0);
  sessionWords = 0;
  updateProgress();
  setMessage('Pontuações da sessão zeradas.');
});

el.resetRecordBtn.addEventListener('click', () => {
  if (confirm('Tem certeza? Isso zerará TUDO: nível, recorde e sequência.')) {
    high = 0;
    streak = 0;
    level = 1;
    totalWords = 0;
    sessionWords = 0;
    sessionStorage.removeItem('readingStarsHighScore');
    localStorage.removeItem('readingTotalWords');
    el.highScore.textContent = '0';
    renderStreak(0);
    calculateLevel();
    updateProgress();
    setMessage('Tudo zerado! Começando do zero! 🔥', 'warn');
  }
});

el.loadBtn.addEventListener('click', () => {
  const raw = el.wordsInput.value.trim();
  const parts = raw.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
  let onlyValid;
  if (gameMode === 'syllables') {
    onlyValid = parts.filter(w => SYLLABLE_PATTERN.test(w));
    if (!onlyValid.length) {
      setMessage('Nenhuma palavra válida encontrada. Use hífens para separar sílabas (ex.: ca-sa).', 'danger');
      return;
    }
  } else if (gameMode === 'letters') {
    onlyValid = parts.filter(w => LETTER_PATTERN.test(w));
    if (!onlyValid.length) {
      setMessage('Nenhuma letra válida encontrada. Digite apenas letras individuais.', 'danger');
      return;
    }
  } else if (gameMode === 'numbers') {
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
  words = onlyValid;
  buildDeck();
  loadNewWord();
  setMessage(`Carregado ${words.length} ${getItemTypePlural(gameMode)}.`, 'muted');
});

document.body.classList.add('uppercase-mode');
el.toggleCaseBtn.addEventListener('click', () => {
  document.body.classList.toggle('uppercase-mode');
});

function setMode(mode) {
  gameMode = mode;
  if (mode === 'colors' || mode === 'numbers' || mode === 'writing') {
    el.configSection.style.display = 'none';
    el.configSection.open = false;
  } else {
    el.configSection.style.display = 'block';
  }

  if (mode === 'syllables') {
    words = [...dbSyllables];
    el.wordsInput.value = dbSyllables.join(', ');
    el.configSummary.textContent = 'Carregar/editar lista de palavras (sílabas separadas por "-")';
    el.configHelp.innerHTML = 'Separe por vírgula, ponto-e-vírgula ou quebra de linha. Ex.: <code>ca-sa</code>, <code>ho-ra</code>, <code>so-fá</code>';
    el.nextBtn.textContent = 'Próxima palavra ➜';
  } else if (mode === 'letters') {
    words = [...dbLetters];
    el.wordsInput.value = dbLetters.join(', ');
    el.configSummary.textContent = 'Carregar/editar lista de letras';
    el.configHelp.innerHTML = 'Separe por vírgula, ponto-e-vírgula ou quebra de linha. Ex.: <code>A</code>, <code>B</code>, <code>C</code>';
    el.nextBtn.textContent = 'Próxima letra ➜';
  } else if (mode === 'numbers') {
    words = [];
    for (let i = numbersRange.min; i <= numbersRange.max; i++) {
      words.push(String(i));
    }
    el.nextBtn.textContent = 'Próximo número ➜';
  } else if (mode === 'colors') {
    words = dbColors.map(c => JSON.stringify(c));
    el.nextBtn.textContent = 'Próxima cor ➜';
  } else if (mode === 'writing') {
    words = dbWriting.map(w => JSON.stringify(w));
    el.nextBtn.textContent = 'Próxima palavra ➜';
  } else {
    words = [...dbPhrases];
    el.wordsInput.value = dbPhrases.join('\n');
    el.configSummary.textContent = 'Carregar/editar lista de frases';
    el.configHelp.innerHTML = 'Separe por quebra de linha. Ex.: <code>O gato mia</code>, <code>A lua brilha</code>';
    el.nextBtn.textContent = 'Próxima frase ➜';
  }
  streak = 0;
  sessionWords = 0;
  buildDeck();
  loadNewWord();
  renderStreak(0);
  updateProgress();
  updateLanguageSelectorVisibility();
  el.modeSelection.classList.add('hidden');
}

el.modeSyllablesBtn.addEventListener('click', () => setMode('syllables'));
el.modePhrasesBtn.addEventListener('click', () => setMode('phrases'));
el.modeLettersBtn.addEventListener('click', () => setMode('letters'));
el.modeColorsBtn.addEventListener('click', () => setMode('colors'));
el.modeNumbersBtn.addEventListener('click', () => {
  el.modeSelection.classList.add('hidden');
  el.numbersConfig.classList.remove('hidden');
});

el.minNumber.addEventListener('input', (e) => {
  const value = parseInt(e.target.value);
  el.minNumberValue.textContent = value;
  if (parseInt(el.maxNumber.value) < value) {
    el.maxNumber.value = value;
    el.maxNumberValue.textContent = value;
  }
});
el.maxNumber.addEventListener('input', (e) => {
  const value = parseInt(e.target.value);
  el.maxNumberValue.textContent = value;
  if (parseInt(el.minNumber.value) > value) {
    el.minNumber.value = value;
    el.minNumberValue.textContent = value;
  }
});
el.confirmNumbersBtn.addEventListener('click', () => {
  numbersRange.min = parseInt(el.minNumber.value);
  numbersRange.max = parseInt(el.maxNumber.value);
  el.numbersConfig.classList.add('hidden');
  setMode('numbers');
});
el.cancelNumbersBtn.addEventListener('click', () => {
  el.numbersConfig.classList.add('hidden');
  el.modeSelection.classList.remove('hidden');
});

// Writing mode config
el.modeWritingBtn.addEventListener('click', () => {
  el.modeSelection.classList.add('hidden');
  el.writingConfig.classList.remove('hidden');
});
el.extraLetters.addEventListener('input', (e) => {
  el.extraLettersValue.textContent = e.target.value;
});
el.confirmWritingBtn.addEventListener('click', () => {
  writingExtraLetters = parseInt(el.extraLetters.value);
  el.writingConfig.classList.add('hidden');
  setMode('writing');
});
el.cancelWritingBtn.addEventListener('click', () => {
  el.writingConfig.classList.add('hidden');
  el.modeSelection.classList.remove('hidden');
});

el.changeModeBtn.addEventListener('click', () => {
  el.modeSelection.classList.remove('hidden');
});

el.languageSelector.addEventListener('change', (e) => {
  selectedLanguage = e.target.value;
  localStorage.setItem('selectedLanguage', selectedLanguage);
  if ((gameMode === 'colors' || gameMode === 'numbers' || gameMode === 'letters') && idx >= 0) {
    updateCurrentItemUI();
  }
});
el.languageSelector.value = selectedLanguage;

function updateLanguageSelectorVisibility() {
  if (gameMode === 'letters' || gameMode === 'numbers' || gameMode === 'colors') {
    el.languageSelector.style.display = 'inline-block';
  } else {
    el.languageSelector.style.display = 'none';
  }
}

// ======================= WRITING MODE =======================

function speakWord(word) {
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(word);
  const v = getVoiceForLanguage('pt-BR');
  if (v) u.voice = v;
  u.lang = 'pt-BR';
  u.rate = 0.85;
  u.pitch = 1.0;
  u.volume = 1.0;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

function getRandomLetters(count, excludeLetters) {
  const vowels = 'AEIOU';
  const consonants = 'BCDFGHJKLMNPQRSTVWXYZ';
  const all = vowels + consonants;
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

function renderWritingUI() {
  const raw = words[deck[idx]];
  writingWordData = JSON.parse(raw);
  const word = writingWordData.word;
  const letters = word.split('');

  // Reset state
  writingSlots = new Array(letters.length).fill(null);
  writingUsedIndices.clear();

  // Build pool: word letters + extra random letters
  const extraLetters = getRandomLetters(writingExtraLetters, letters);
  writingPool = shuffle([...letters, ...extraLetters]);

  // Build HTML
  let html = '<div style="display:flex; flex-direction:column; align-items:center; gap:16px;">';

  // Image or listen button
  if (writingWordData.image) {
    html += `<div class="writing-image">${writingWordData.image}</div>`;
    html += `<button class="writing-speaker-mini" onclick="speakWord('${word}')" title="Ouvir a palavra">🔈</button>`;
  } else {
    html += `<button class="writing-listen-btn" onclick="speakWord('${word}')" title="Ouvir a palavra">🔈</button>`;
  }

  // Slots
  html += '<div class="writing-slots">';
  for (let i = 0; i < letters.length; i++) {
    html += `<div class="writing-slot" data-slot="${i}" onclick="handleSlotClick(${i})"></div>`;
  }
  html += '</div>';

  // Letter pool
  html += '<div class="writing-letters">';
  for (let i = 0; i < writingPool.length; i++) {
    html += `<button class="writing-letter-btn" data-pool="${i}" onclick="handleLetterClick(${i})">${writingPool[i]}</button>`;
  }
  html += '</div>';

  html += '</div>';

  el.word.innerHTML = html;
  el.helpBtn.style.display = 'none';
}

function handleLetterClick(poolIndex) {
  if (writingUsedIndices.has(poolIndex)) return;

  // Find first empty slot
  const slotIndex = writingSlots.indexOf(null);
  if (slotIndex === -1) return;

  // Place letter
  writingSlots[slotIndex] = { letter: writingPool[poolIndex], poolIndex };
  writingUsedIndices.add(poolIndex);

  // Update UI
  const slotEl = document.querySelector(`.writing-slot[data-slot="${slotIndex}"]`);
  if (slotEl) {
    slotEl.textContent = writingPool[poolIndex];
    slotEl.classList.add('filled');
  }
  const btnEl = document.querySelector(`.writing-letter-btn[data-pool="${poolIndex}"]`);
  if (btnEl) btnEl.classList.add('used');

  // Check if all slots are filled
  if (!writingSlots.includes(null)) {
    checkWritingAnswer();
  }
}

function handleSlotClick(slotIndex) {
  const slotData = writingSlots[slotIndex];
  if (!slotData) return;

  // Return letter to pool
  writingUsedIndices.delete(slotData.poolIndex);
  const btnEl = document.querySelector(`.writing-letter-btn[data-pool="${slotData.poolIndex}"]`);
  if (btnEl) btnEl.classList.remove('used');

  // Clear slot
  writingSlots[slotIndex] = null;
  const slotEl = document.querySelector(`.writing-slot[data-slot="${slotIndex}"]`);
  if (slotEl) {
    slotEl.textContent = '';
    slotEl.classList.remove('filled');
  }
}

function checkWritingAnswer() {
  const word = writingWordData.word;
  const answer = writingSlots.map(s => s.letter).join('');
  const slots = document.querySelectorAll('.writing-slot');

  if (answer === word) {
    // Correct!
    slots.forEach(s => s.classList.add('correct'));
    playSuccessSound();
    animateMascot('happy');

    streak++;
    totalWords++;
    sessionWords++;
    localStorage.setItem('readingTotalWords', String(totalWords));
    renderStreak(streak);
    updateProgress();

    let message = getEncouragingMessage() + ' +1 🎯';
    if (streak === 3) message = '🔥 3 seguidas! Você está pegando fogo!';
    else if (streak === 5) message = '⚡ 5 seguidas! Incrível!';
    else if (streak === 10) message = '💫 10 seguidas! FENOMENAL!';
    setMessage(message, 'win');

    updateHighScore();
    checkAchievements();

    setTimeout(loadNewWord, 1200);
  } else {
    // Wrong
    slots.forEach(s => s.classList.add('wrong'));
    setMessage('Tente novamente! 💪', 'warn');

    // Clear slots after shake animation
    setTimeout(() => {
      writingSlots.fill(null);
      writingUsedIndices.clear();
      slots.forEach(s => {
        s.textContent = '';
        s.classList.remove('filled', 'wrong');
      });
      document.querySelectorAll('.writing-letter-btn').forEach(b => b.classList.remove('used'));
    }, 600);
  }
}

let voices = [];
function getVoiceForLanguage(lang) {
  if (!voices.length) voices = speechSynthesis.getVoices();
  const langMap = {
    'pt-BR': /pt[-_]br|portuguese.*brazil/i,
    'en-US': /en[-_]us|english.*united.*states/i,
    'es-ES': /es[-_]es|spanish.*spain/i,
    'de-DE': /de[-_]de|german.*germany/i
  };
  const pattern = langMap[lang] || /pt/i;
  return voices.find(v => pattern.test(v.lang) || pattern.test(v.name)) || voices[0];
}
function getPtVoice() {
  return getVoiceForLanguage(selectedLanguage);
}
if ('speechSynthesis' in window) {
  speechSynthesis.onvoiceschanged = () => {
    voices = speechSynthesis.getVoices();
  };
}

el.speakBtn.addEventListener('click', () => {
  if (!('speechSynthesis' in window)) {
    setMessage('Recurso de voz não suportado neste navegador.', 'warn');
    return;
  }
  const langToUse = (gameMode === 'syllables' || gameMode === 'phrases') ? 'pt-BR' : selectedLanguage;
  const u = new SpeechSynthesisUtterance(stripHyphens(words[deck[idx]]));
  const v = getVoiceForLanguage(langToUse);
  if (v) u.voice = v;
  u.lang = langToUse;
  u.rate = 0.95;
  u.pitch = 1.0;
  u.volume = 1.0;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
});

window.addEventListener('keydown', (e) => {
  if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
  if (gameMode === 'writing') return; // writing mode has its own interaction
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

async function initGame() {
  try {
    const [resWords, resPhrases, resLetters, resColors, resWriting] = await Promise.all([
      fetch('words.json'), fetch('phrases.json'), fetch('letters.json'), fetch('colors.json'), fetch('writing.json')
    ]);
    if (!resWords.ok || !resPhrases.ok || !resLetters.ok || !resColors.ok || !resWriting.ok) throw new Error('Erro ao carregar dados');
    dbSyllables = await resWords.json();
    dbPhrases = await resPhrases.json();
    dbLetters = await resLetters.json();
    dbColors = await resColors.json();
    dbWriting = await resWriting.json();
    el.wordsInput.value = dbSyllables.join(', ');
  } catch (error) {
    console.error(error);
    setMessage('Erro ao carregar dados: ' + error.message, 'danger');
  }
}
initGame();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.warn('Service worker registration failed:', err);
    });
  });
}

const encouragements = [
  { text: 'Você está indo muito bem! 🎉', audio: 'audio/Você está indo muito bem.mp3' },
  { text: 'Eu acredito em você! 💪', audio: 'audio/Eu acredito em você.mp3' },
  { text: 'Vamos ler mais uma? 📚', audio: 'audio/Vamos ler mais uma.mp3' },
  { text: 'Você é incrível! 🌟', audio: 'audio/Você é incrível.mp3' },
  { text: 'Cada tentativa te deixa mais forte! 🚀', audio: 'audio/Cada tentativa te deixa mais forte.mp3' },
  { text: 'Que orgulho de você! 😄', audio: 'audio/Que orgulho de você.mp3' },
  { text: 'Você aprende rápido demais! 🧠', audio: 'audio/Você aprende rápido demais.mp3' },
  { text: 'Aprender com você é divertido! 😊', audio: 'audio/Aprender com você é divertido.mp3' }
];

function playEncouragement() {
  const item = encouragements[Math.floor(Math.random() * encouragements.length)];
  setMessage(item.text, 'win');
  try {
    const audio = new Audio(item.audio);
    audio.play().catch(e => console.warn('Autoplay prevented or audio missing:', e));
  } catch(e) {
    console.warn('Audio error:', e);
  }
}

el.mascot.addEventListener('click', () => {
  animateMascot('excited');
  playEncouragement();
});
