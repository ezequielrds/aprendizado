# AGENTS.md — Guia do Projeto para Agentes de IA

Este arquivo descreve o projeto **Aprendizado** em detalhes suficientes para que um agente de IA possa entender a arquitetura, fazer modificações corretas e evitar erros comuns.

---

## 1. O que é o projeto

**Aprendizado** é uma **Progressive Web App (PWA)** educacional voltada para crianças em fase de alfabetização. Funciona como um jogo de flashcards com síntese de voz, sistema de pontuação e múltiplos modos de aprendizado.

A app roda **100% no navegador**, sem back-end, sem framework, sem bundler. É puro **HTML + CSS + JavaScript com ES Modules nativos**.

> ⚠️ Por usar ES Modules (`type="module"`), o projeto **não pode ser aberto via `file://`**. É obrigatório servir com um servidor HTTP local (ex.: `npx serve . --listen 3000`).

---

## 2. Tecnologias utilizadas

| Tecnologia | Uso |
|---|---|
| HTML5 semântico | Estrutura da página (`index.html`) |
| CSS Vanilla | Estilo completo (`styles.css`) |
| JavaScript ES Modules | Toda a lógica do app (sem framework) |
| Web Speech API | Síntese de voz (TTS) — `speechSynthesis` |
| Web Audio API | Efeito sonoro de acerto |
| `<audio>` HTML | Áudios MP3 de encorajamento |
| Service Worker | Cache offline / PWA (`sw.js`) |
| localStorage | Persistência de `totalWords` e `selectedLanguage` |
| sessionStorage | Persistência de `highScore` durante a sessão |

---

## 3. Estrutura de arquivos

```
leitura/
├── index.html              # Única página HTML (SPA)
├── script.js               # Ponto de entrada — importa todos os módulos
├── styles.css              # Estilos globais (variáveis CSS, dark mode, animações)
├── sw.js                   # Service Worker para cache offline
├── manifest.webmanifest    # Manifesto da PWA
│
├── modules/                # Módulos ES — cada um com responsabilidade única
│   ├── state.js            # Estado global mutável + constantes + refs DOM
│   ├── deck.js             # Baralho: shuffle, buildDeck, nextFromDeck
│   ├── ui.js               # Helpers de UI: setMessage, renderStreak, celebrate, etc.
│   ├── audio.js            # Sons: playSuccessSound, playEncouragement
│   ├── speech.js           # TTS: getVoiceForLanguage, speakWord
│   ├── scoring.js          # Pontuação: calculateLevel, checkAchievements, resets
│   ├── render.js           # Renderização: renderWord, handleSyllableClick, helpBtn
│   ├── writing.js          # Modo Escrita: handleLetterClick, handleSlotClick
│   ├── mode.js             # Troca de modos: setMode, configs de Números/Escrita
│   └── game.js             # Fluxo do jogo: loadNewWord, correctBtn, nextBtn, etc.
│
├── words.json              # Lista de palavras silabadas (ex.: "ca-sa", "bo-la")
├── phrases.json            # Lista de frases (ex.: "O gato mia")
├── letters.json            # Lista de letras do alfabeto
├── colors.json             # Cores com nome multilíngue e valor hex
├── writing.json            # Palavras para o modo Escrita com emoji/imagem
│
├── audio/                  # MP3s de encorajamento falados
└── icons/                  # Ícones da PWA (192px e 512px)
```

---

## 4. Grafo de dependências dos módulos

As importações seguem uma hierarquia estrita **sem dependências circulares**:

```
state.js      ← (nenhum import — base de tudo)
deck.js       ← state
ui.js         ← state
audio.js      ← ui
speech.js     ← state, ui
scoring.js    ← state, ui, audio
render.js     ← state, deck, speech, ui
game.js       ← state, deck, render, ui, scoring, audio, speech
writing.js    ← state, ui, audio, scoring, game
mode.js       ← state, deck, ui, game, render
script.js     ← todos os módulos acima
```

> ⚠️ **Regra crítica**: `game.js` **não importa** `writing.js` nem `mode.js`. `render.js` **não importa** `writing.js`. Qualquer mudança que crie um ciclo quebrará o app silenciosamente no browser.

---

## 5. Estado global (`modules/state.js`)

Todo o estado mutável do jogo vive em um único objeto exportado `state`. Qualquer módulo que precise ler ou modificar o estado faz `import { state } from './state.js'` e acessa `state.propriedade` diretamente.

### Propriedades principais

```js
state.gameMode          // Modo ativo: 'syllables' | 'phrases' | 'letters' | 'numbers' | 'colors' | 'writing'
state.words             // Array de itens ativos no deck (formato interno varia por modo — ver seção 6)
state.deck              // Array de índices embaralhados de state.words
state.idx               // Posição atual no deck
state.usedHelp          // Se o jogador usou ajuda na rodada atual (boolean)
state.streak            // Sequência de acertos consecutivos sem ajuda
state.high              // Recorde de sequência da sessão
state.totalWords        // Acertos totais acumulados (persistido em localStorage)
state.sessionWords      // Acertos na sessão atual (resetável)
state.level             // Nível atual do jogador (calculado a cada 4 acertos)
state.selectedLanguage  // Idioma selecionado ('pt-BR' | 'en-US' | 'es-ES' | 'de-DE')
state.numbersRange      // { min, max } para o modo Números
state.writingExtraLetters // Quantidade de letras distratoras no modo Escrita

// Dados dos JSONs (carregados em script.js via fetch)
state.dbSyllables       // Array de strings (words.json)
state.dbPhrases         // Array de strings (phrases.json)
state.dbLetters         // Array de strings (letters.json)
state.dbColors          // Array de objetos (colors.json)
state.dbWriting         // Array de objetos (writing.json)

// Estado interno do modo Escrita
state.writingWordData   // Objeto { word, image } da palavra atual
state.writingPool       // Array de letras embaralhadas (corretas + distratoras)
state.writingSlots      // Array de { letter, poolIndex } | null para cada slot
state.writingUsedIndices // Set de índices do pool já usados
```

O objeto `el` (também em `state.js`) contém todas as referências DOM pré-capturadas via `getElementById`. Sempre use `el.nomeDoElemento` em vez de chamar `document.getElementById` diretamente nos módulos.

---

## 6. Modos de jogo

### Como `state.words` é preenchido em cada modo

| Modo | Fonte | Formato de cada item em `state.words` |
|---|---|---|
| `syllables` | `words.json` | String com hífens: `"ca-sa"` |
| `phrases` | `phrases.json` | String com espaços: `"O gato mia"` |
| `letters` | `letters.json` | String de 1 caractere: `"A"` |
| `numbers` | Gerado dinamicamente | String numérica: `"0"`, `"1"`, ..., `"10"` |
| `colors` | `colors.json` | JSON serializado: `JSON.stringify({ name: {...}, color: "#..." })` |
| `writing` | `writing.json` | JSON serializado: `JSON.stringify({ word: "GATO", image: "🐱" })` |

> ⚠️ Nos modos `colors` e `writing`, os itens são armazenados como **strings JSON** em `state.words`. Ao renderizar, é necessário fazer `JSON.parse(text)` para recuperar o objeto.

---

## 7. Fluxo principal do jogo

```
Usuário seleciona modo
  → setMode(mode)              [mode.js]
      → state.words = [...]
      → buildDeck()            [deck.js]   — embaralha índices
      → loadNewWord()          [game.js]

loadNewWord()
  → nextFromDeck()             [deck.js]   — avança idx
  → renderWord(text, false)    [render.js] — exibe o item
  → getWordDifficulty(text)    [render.js] — badge de dificuldade

Usuário interage:
  → clica em sílaba/botão      → handleSyllableClick() [render.js] — fala via TTS
  → clica "Acertei"            → correctBtn listener   [game.js]
  → clica "Próxima"            → nextBtn listener      [game.js]
  → clica "Mostrar sílabas"    → helpBtn listener      [render.js]

correctBtn (acerto sem ajuda):
  → state.streak++, state.totalWords++
  → renderStreak(), updateProgress(), playSuccessSound()
  → updateHighScore()          [scoring.js]
  → checkAchievements()        [scoring.js]
  → setTimeout(loadNewWord, 650)
```

---

## 8. Modo Escrita — fluxo especial

No modo `writing`, os botões `correctBtn` e `nextBtn` ficam **ocultos**. A progressão é automática.

```
renderWritingUI()                    [render.js]
  → gera HTML com slots e letras
  → window.handleLetterClick = ...   [writing.js — exposto globalmente]
  → window.handleSlotClick = ...     [writing.js — exposto globalmente]
  → window.speakWord = ...           [speech.js — exposto globalmente]

handleLetterClick(poolIndex)         [writing.js]
  → preenche próximo slot vazio
  → se todos os slots cheios → checkWritingAnswer()

checkWritingAnswer()                 [writing.js]
  → acerto → pontua + setTimeout(loadNewWord, 1200)
  → erro   → pisca vermelho + limpa slots após 600ms
```

> ⚠️ `handleLetterClick`, `handleSlotClick` e `speakWord` são expostos em `window` porque o HTML gerado dinamicamente em `renderWritingUI` usa `onclick="handleLetterClick(i)"` inline. Isso é intencional e necessário.

---

## 9. JSONs de dados — esquemas

### `words.json`
```json
["ca-sa", "bo-la", "ga-to"]
```
Sílabas separadas por hífen. Palavras monossilábicas não têm hífen.

### `phrases.json`
```json
["O gato mia", "A lua brilha no céu"]
```
Frases completas separadas por espaço.

### `letters.json`
```json
["A", "B", "C", "D"]
```
Letras individuais maiúsculas.

### `colors.json`
```json
[
  {
    "name": { "pt-BR": "Vermelho", "en-US": "Red", "es-ES": "Rojo", "de-DE": "Rot" },
    "color": "#ef4444"
  }
]
```
`name` é sempre um objeto com os 4 idiomas suportados. `color` é um valor CSS válido.

### `writing.json`
```json
[
  { "word": "GATO", "image": "🐱" },
  { "word": "MESA", "image": null }
]
```
`word` deve estar em **MAIÚSCULAS** (o modo Escrita é case-sensitive).
`image` pode ser um emoji string ou `null` (quando null, exibe apenas o botão de ouvir).

---

## 10. Idiomas suportados

| Código | Idioma |
|---|---|
| `pt-BR` | Português (Brasil) — padrão |
| `en-US` | English (US) |
| `es-ES` | Español (España) |
| `de-DE` | Deutsch (Deutschland) |

O idioma afeta: seleção de voz TTS, nome das cores e nome dos números (0–20).
Os modos `syllables` e `phrases` **sempre usam `pt-BR`** independente do idioma selecionado.

---

## 11. Sistema de pontuação e progressão

- **Sequência (`streak`)**: acertos consecutivos sem usar ajuda. Zera ao pular ou usar ajuda.
- **Recorde (`high`)**: maior streak da sessão. Salvo em `sessionStorage`.
- **Total (`totalWords`)**: soma de todos os acertos históricos. Salvo em `localStorage`.
- **Nível**: `Math.floor(totalWords / 4) + 1`. Sobe a cada 4 acertos.
- **Mascote**: 10 emojis que rotacionam com o nível (`mascots[]` em `state.js`).
- **Conquistas**: exibidas em popup em 5, 20 e 50 acertos totais, e a cada level-up.

---

## 12. Service Worker e cache offline

O arquivo `sw.js` usa a estratégia **Cache First** com fallback para rede. Ao modificar qualquer arquivo do projeto (especialmente os módulos), **incremente o `CACHE_NAME`** (ex.: `v4` → `v5`) para que os usuários recebam a versão atualizada e o cache antigo seja descartado.

```js
// sw.js — linha 1
const CACHE_NAME = 'aprendizagem-cache-v4'; // ← incrementar a cada deploy
```

Todos os módulos em `modules/*.js` precisam estar listados no array `ASSETS` do `sw.js`.

---

## 13. Convenções e regras para modificações

### ✅ Fazer
- Sempre modificar `state.x` para alterar estado (nunca criar variáveis locais soltas que deveriam ser globais).
- Usar `el.nomeDoElemento` para acessar o DOM (evitar `document.getElementById` nos módulos).
- Ao adicionar um novo modo de jogo: atualizar `setMode()` em `mode.js`, `renderWord()` em `render.js`, `stripHyphens()` e `getWordDifficulty()` em `render.js`, e os listeners em `game.js`.
- Ao adicionar um novo JSON de dados: carregar em `initGame()` no `script.js` e adicionar a propriedade correspondente em `state.js`.
- **Ao modificar qualquer arquivo `.js`, incrementar a versão do `<script>` em `index.html` e o `CACHE_NAME` em `sw.js`** (ver seção 13.1).
- Manter o `AGENTS.md` atualizado ao fazer mudanças estruturais.

### ❌ Não fazer
- Criar dependências circulares entre módulos (ver seção 4).
- Chamar `document.getElementById` dentro dos módulos — usar `el` de `state.js`.
- Abrir o `index.html` diretamente via `file://` — sempre usar servidor HTTP.
- Adicionar novos arquivos `.js` sem listá-los no `sw.js` (o cache offline ficará desatualizado).
- Expor funções em `window` desnecessariamente — apenas `speakWord`, `handleLetterClick` e `handleSlotClick` precisam estar no escopo global.
- Esquecer de atualizar a versão do `<script>` após modificar módulos JS — o browser pode servir código antigo do cache.

---

## 13.1. Versionamento de cache (cache busting)

O browser e o Service Worker podem guardar em cache versões antigas dos arquivos JS. Para garantir que o usuário sempre carregue o código mais recente após qualquer modificação, **dois arquivos devem ser atualizados em conjunto**:

### 1. Tag `<script>` em `index.html`

A querystring `?v=X.Y.Z` força o browser a buscar o arquivo novamente mesmo que ele esteja em cache.

```html
<!-- index.html — linha do script de entrada -->
<script type="module" src="script.js?v=2.0.0"></script>
<!--                                   ^^^^^ incrementar aqui -->
```

Regra de incremento sugerida:

| Tipo de mudança | Exemplo | Versão |
|---|---|---|
| Bugfix ou ajuste pequeno | corrigir um import errado | `2.0.0` → `2.0.1` |
| Nova funcionalidade ou módulo | novo modo de jogo | `2.0.1` → `2.1.0` |
| Refatoração estrutural grande | reorganizar módulos | `2.1.0` → `3.0.0` |

### 2. `CACHE_NAME` em `sw.js`

O Service Worker usa o nome do cache para invalidar versões antigas. Sempre incrementar junto com a versão do `<script>`.

```js
// sw.js — linha 1
const CACHE_NAME = 'aprendizagem-cache-v4'; // ← incrementar aqui
```

### Resumo: o que atualizar a cada modificação em JS

```
✅ index.html  →  <script type="module" src="script.js?v=NOVA_VERSAO">
✅ sw.js       →  const CACHE_NAME = 'aprendizagem-cache-vN';
```

> ⚠️ Se apenas um dos dois for atualizado, o comportamento pode ser inconsistente entre aberturas com e sem Service Worker ativo.

---

## 14. Como rodar localmente

```powershell
# Na pasta do projeto
npx serve . --listen 3000
# Abrir: http://localhost:3000
```

Alternativas:
```powershell
python -m http.server 3000
# ou extensão "Live Server" do VS Code
```

---

## 15. Atalhos de teclado (usuário final)

| Tecla | Ação |
|---|---|
| `Enter` | Acertei sozinho(a) |
| `Espaço` | Próxima palavra |
| `H` | Mostrar/esconder sílabas |

> Os atalhos são desabilitados quando o foco está em `<input>` ou `<textarea>`, e no modo Escrita (que tem interação própria via clique).
