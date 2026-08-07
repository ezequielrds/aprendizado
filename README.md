# Leitura por Sílabas – Estrelinhas ⭐

Aplicativo educacional interativo para auxiliar crianças no aprendizado de leitura, com foco em silabação e reconhecimento de palavras e frases.

## 🌐 Ver o Aplicativo Online

### 🚀 Link Principal (Branch Main)

**URL Oficial:** https://ezequielrds.github.io/leitura/

Este é o link principal que sempre reflete o conteúdo da branch `main`.

### 🔍 Preview Automático de Branches

Cada branch automaticamente gera seu próprio preview! O link segue o padrão:

**`https://ezequielrds.github.io/leitura/preview/[NOME-DA-BRANCH]/`**

**Exemplos:**
- Branch `copilot/add-github-pages-branch`: 
  - https://ezequielrds.github.io/leitura/preview/copilot-add-github-pages-branch/
- Branch `feature/nova-funcionalidade`:
  - https://ezequielrds.github.io/leitura/preview/feature-nova-funcionalidade/

### ⚙️ Como Funciona

1. **Primeira vez:** Configure GitHub Pages uma vez:
   - Vá em **Settings** → **Pages**
   - Em **Source**, selecione **Deploy from a branch**
   - Em **Branch**, selecione **gh-pages** e **/root**
   - Clique em **Save**

2. **Automático:** Depois disso, cada push em qualquer branch:
   - Cria automaticamente um preview em `/preview/[branch-name]/`
   - O link fica disponível em 1-2 minutos
   - Você pode verificar o status na aba **Actions** do GitHub

3. **Branch Main:** Sempre publica no link principal (raiz do site)

## 📋 Funcionalidades

- 🔤 **Modo Palavras**: Palavras separadas por sílabas para facilitar o aprendizado
- 📚 **Modo Frases**: Pequenas sentenças para prática de leitura contextual
- 🎯 **Sistema de Progressão**: Níveis, sequências e recordes para motivação
- 🔈 **Áudio**: Botão para ouvir a pronúncia das palavras
- 📊 **Indicador de Dificuldade**: Feedback visual sobre o nível da palavra
- ⭐ **Recompensas**: Sistema de conquistas para celebrar o progresso
- 🔄 **Personalização**: Opção de alternar entre maiúsculas e minúsculas
- ✏️ **Lista Customizável**: Possibilidade de carregar suas próprias palavras

## 🛠️ Desenvolvimento Local

Para executar o projeto localmente:

```bash
# Clone o repositório
git clone https://github.com/ezequielrds/leitura.git

# Entre no diretório
cd leitura

# Abra o arquivo index.html em um navegador
# Ou use um servidor local, por exemplo:
python -m http.server 8000
# ou
npx serve
```

Depois acesse: http://localhost:8000

## 📂 Estrutura do Projeto

```
leitura/
├── index.html          # Página principal
├── script.js           # Lógica do aplicativo
├── styles.css          # Estilos visuais
├── words.json          # Lista de palavras
├── phrases.json        # Lista de frases
├── audio/              # Arquivos de áudio de incentivo
└── .github/
    └── workflows/
        └── deploy-github-pages.yml  # Workflow de deploy
```

## 📝 Como Usar

1. Escolha entre o modo **Palavras** ou **Frases**
2. Leia a palavra/frase apresentada
3. Clique em "**Acertei sozinho(a)**" quando conseguir ler corretamente
4. Use "**Próxima palavra**" para pular ou após usar a ajuda
5. Ganhe estrelas e suba de nível!

### Dicas de Uso

- Pressione **Enter** para marcar "Acertei"
- Pressione **Barra de espaço** para "Próxima"
- Use o botão **🔈 Ouvir** para escutar a pronúncia
- Clique em "**Mostrar sílabas**" para ver a separação silábica

## 🎨 Personalização

Você pode personalizar a lista de palavras:

1. Clique em "**Carregar/editar lista de palavras**"
2. Digite suas palavras separando as sílabas com hífen (ex: `ca-sa`, `ga-to`)
3. Clique em "**Usar lista**"

## 📄 Licença

Este projeto é de código aberto e está disponível para uso educacional.

## 🤝 Contribuições

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou pull requests.
