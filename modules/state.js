// ── Estado mutável do jogo ─────────────────────────────────────────────────
export const state = {
  // Dados carregados dos JSONs
  dbSyllables: [],
  dbPhrases: [],
  dbLetters: [],
  dbColors: [],
  dbWriting: [],
  dbCountries: [],

  // Modo de jogo
  gameMode: 'syllables', // 'syllables' | 'phrases' | 'letters' | 'numbers' | 'colors' | 'writing' | 'flags'
  numbersRange: { min: 0, max: 10 },

  // Estado do modo Escrita
  writingExtraLetters: 2,
  writingSlots: [],
  writingWordData: null,
  writingPool: [],
  writingUsedIndices: new Set(),

  // Estado da partida Bandeiras do Mundo
  flagsExtraLetters: 2,
  flagsCountries: [],
  flagsIndex: -1,
  flagsCurrentCountry: null,
  flagsTotal: 0,
  flagsRoundPoints: 40,
  flagsHintsUsed: 0,
  flagsHintCount: 0,
  flagsCorrectCount: 0,
  flagsRevealedCount: 0,
  flagsRevealedIndices: new Set(),
  flagsAnswerSlots: [],
  flagsLetterPool: [],
  flagsUsedIndices: new Set(),
  flagsPreloadedAssets: new Set(),
  flagsStatus: 'playing', // 'playing' | 'correct' | 'revealed'
  flagsRoundScored: false,
  flagsGameStarted: false,
  flagsMapOpen: false,
  flagsMapReturnFocus: null,
  flagsMapBaseViewport: null,
  flagsMapFocusPoint: null,
  flagsMapZoomLevel: 0,

  // Preferências
  selectedLanguage: localStorage.getItem('selectedLanguage') || 'pt-BR',

  // Estado do jogo
  words: [],           // itens ativos (sempre no formato interno de cada modo)
  deck: [],            // índices embaralhados
  idx: -1,             // índice atual no deck
  usedHelp: false,     // se o jogador usou ajuda na rodada atual
  streak: 0,           // sequência de acertos sem ajuda
  high: Number(
    sessionStorage.getItem('learningStarsHighScore') ||
    sessionStorage.getItem('readingStarsHighScore') ||
    0
  ),
  syllablesClicked: new Set(),
  totalWords: Number(
    localStorage.getItem('learningTotalItems') ||
    localStorage.getItem('readingTotalWords') ||
    0
  ),
  sessionWords: 0,
  level: 1,
};

// ── Constantes ─────────────────────────────────────────────────────────────

// Mascotes que evoluem com o nível
export const mascots = ['🐶', '🐱', '🐷', '🐘', '🐬', '🐙', '🦉', '🐉', '🦄', '👑'];

// Traduções dos números 0–20 para cada idioma suportado
export const numberTranslations = {
  'pt-BR': [
    'zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez',
    'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove', 'vinte',
  ],
  'en-US': [
    'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty',
  ],
  'es-ES': [
    'cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'siete', 'ocho', 'nueve', 'diez',
    'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte',
  ],
  'de-DE': [
    'null', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn',
    'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn', 'zwanzig',
  ],
  'ru-RU': [
    'ноль', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять', 'десять',
    'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать', 'двадцать',
  ],
};

// Padrões de validação de entrada
export const SYLLABLE_PATTERN = /[a-zA-ZáàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]+-[a-zA-Z]/;
export const LETTER_PATTERN   = /^[a-zA-ZáàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]$/;
export const NUMBER_PATTERN   = /^-?\d+$/;

// ── Referências DOM ────────────────────────────────────────────────────────
export const el = {
  word:             document.getElementById('word'),
  helpBtn:          document.getElementById('helpBtn'),
  speakBtn:         document.getElementById('speakBtn'),
  correctBtn:       document.getElementById('correctBtn'),
  nextBtn:          document.getElementById('nextBtn'),
  message:          document.getElementById('message'),
  wordsInput:       document.getElementById('wordsInput'),
  loadBtn:          document.getElementById('loadBtn'),
  shuffleBtn:       document.getElementById('shuffleBtn'),
  resetBtn:         document.getElementById('resetBtn'),
  resetRecordBtn:   document.getElementById('resetRecordBtn'),
  streakDisplay:    document.getElementById('streakDisplay'),
  highScore:        document.getElementById('highScore'),
  progressFill:     document.getElementById('progressFill'),
  progressText:     document.getElementById('progressText'),
  mascot:           document.getElementById('mascot'),
  achievementPopup: document.getElementById('achievementPopup'),
  levelDisplay:     document.getElementById('levelDisplay'),
  wordDifficulty:   document.getElementById('wordDifficulty'),
  modeSelection:    document.getElementById('modeSelection'),
  modeSyllablesBtn: document.getElementById('modeSyllablesBtn'),
  modePhrasesBtn:   document.getElementById('modePhrasesBtn'),
  modeLettersBtn:   document.getElementById('modeLettersBtn'),
  modeNumbersBtn:   document.getElementById('modeNumbersBtn'),
  modeColorsBtn:    document.getElementById('modeColorsBtn'),
  numbersConfig:    document.getElementById('numbersConfig'),
  minNumber:        document.getElementById('minNumber'),
  maxNumber:        document.getElementById('maxNumber'),
  minNumberValue:   document.getElementById('minNumberValue'),
  maxNumberValue:   document.getElementById('maxNumberValue'),
  confirmNumbersBtn:document.getElementById('confirmNumbersBtn'),
  cancelNumbersBtn: document.getElementById('cancelNumbersBtn'),
  changeModeBtn:    document.getElementById('changeModeBtn'),
  toggleCaseBtn:    document.getElementById('toggleCaseBtn'),
  configSummary:    document.getElementById('configSummary'),
  configHelp:       document.getElementById('configHelp'),
  configSection:    document.getElementById('configSection'),
  languageSelector: document.getElementById('languageSelector'),
  modeWritingBtn:   document.getElementById('modeWritingBtn'),
  writingConfig:    document.getElementById('writingConfig'),
  extraLetters:     document.getElementById('extraLetters'),
  extraLettersValue:document.getElementById('extraLettersValue'),
  confirmWritingBtn:document.getElementById('confirmWritingBtn'),
  cancelWritingBtn: document.getElementById('cancelWritingBtn'),
  modeFlagsBtn:     document.getElementById('modeFlagsBtn'),
  flagsConfig:     document.getElementById('flagsConfig'),
  confirmFlagsBtn: document.getElementById('confirmFlagsBtn'),
  cancelFlagsBtn:  document.getElementById('cancelFlagsBtn'),
  flagsGame:       document.getElementById('flagsGame'),
  flagsHomeBtn:    document.getElementById('flagsHomeBtn'),
  flagsPlayingView:document.getElementById('flagsPlayingView'),
  flagsResultView: document.getElementById('flagsResultView'),
  flagsProgress:   document.getElementById('flagsProgress'),
  flagsTotal:      document.getElementById('flagsTotal'),
  flagsRoundPoints:document.getElementById('flagsRoundPoints'),
  flagsHintsUsed:  document.getElementById('flagsHintsUsed'),
  flagsImage:      document.getElementById('flagsImage'),
  flagsMapTrigger: document.getElementById('flagsMapTrigger'),
  flagsMapPanel:   document.getElementById('flagsMapPanel'),
  flagsMapCloseBtn:document.getElementById('flagsMapCloseBtn'),
  flagsMapZoomOutBtn: document.getElementById('flagsMapZoomOutBtn'),
  flagsMapZoomStatus: document.getElementById('flagsMapZoomStatus'),
  flagsMapZoomInBtn: document.getElementById('flagsMapZoomInBtn'),
  flagsMapTitle:   document.getElementById('flagsMapTitle'),
  flagsMapDescription: document.getElementById('flagsMapDescription'),
  flagsMapSvg:     document.getElementById('flagsMapSvg'),
  flagsPrompt:     document.getElementById('flagsPrompt'),
  flagsAnswer:     document.getElementById('flagsAnswer'),
  flagsFeedback:   document.getElementById('flagsFeedback'),
  flagsLetters:    document.getElementById('flagsLetters'),
  flagsDeleteBtn:  document.getElementById('flagsDeleteBtn'),
  flagsClearBtn:   document.getElementById('flagsClearBtn'),
  flagsHintBtn:    document.getElementById('flagsHintBtn'),
  flagsRevealBtn:  document.getElementById('flagsRevealBtn'),
  flagsNextBtn:    document.getElementById('flagsNextBtn'),
  flagsNewGameBtn: document.getElementById('flagsNewGameBtn'),
  flagsResultHomeBtn: document.getElementById('flagsResultHomeBtn'),
  flagsResultTotal:  document.getElementById('flagsResultTotal'),
  flagsCorrectCount: document.getElementById('flagsCorrectCount'),
  flagsRevealedCount:document.getElementById('flagsRevealedCount'),
  flagsHintCount:    document.getElementById('flagsHintCount'),
  flagsPercent:      document.getElementById('flagsPercent'),
  flagsResultMessage:document.getElementById('flagsResultMessage'),
};
