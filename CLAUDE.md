# Instruções para o Claude neste repositório

Site cristianocre.com. Estrutura, publicação e variáveis: [README.md](README.md).

## Antes de tudo

- **Repositório público.** Nunca versione nota interna, origem de conteúdo
  (reuniões, treinamentos), dado de cliente ou segredo. Nem em comentário
  HTML. Notas editoriais ficam em `~/Desktop/CRISTIANOCRE/NOTAS-EDITORIAIS-ARTIGOS.md`.
- **Linha editorial e voz** (público, território, regra de dados, escada de
  valor) estão em `~/Desktop/CRISTIANOCRE/CLAUDE.md`. Leia antes de escrever
  ou revisar texto.
- **Skills** (`frontend-ux-ui`, `copy-landing-page`, `conteudo`,
  `copy-anuncios`): a fonte é `~/Desktop/CRISTIANOCRE/.claude/skills/`. Neste
  Mac, `.claude/skills` aqui é um atalho para lá, fora do Git.

## Regras do código

1. **Sem framework, sem npm, sem build.** HTML, CSS e JS puros. Se a solução
   exige build, é a solução errada para este site.
2. **`app.js` e `styles.css` valem para todas as páginas.** Mudou, confira
   mais de uma página.
3. **Página nova** entra em `sitemap.xml`, `llms.txt` e, se for post, em
   `insights.html`.
4. **Pixel da Meta `942431053282816`** é o mesmo em todas as páginas e precisa
   bater com `CC_PIXEL` no `app.js`.
5. **Nenhum dado inventado.** Sem origem, `[inserir dado real]`.
6. **Nunca gere lead de teste** no formulário publicado: cada envio vira
   linha no Notion e evento na Meta. Teste a lógica com
   `node test/testar-inscrever-local.mjs`.

## Diagnóstico do Pixel da Meta

- O painel "Eventos de teste" da Meta pode mostrar a URL errada. Confira o
  campo `dl` no DevTools (Network → `facebook.com/tr`), não o painel.
- A configuração automática do pixel gera eventos próprios (`eid` com
  prefixo `ob3_plugin-set_`, `SubscribedButtonClick`) e hasheia o telefone
  sem o 55. O `identificar()` do `app.js` corrige o telefone.
- `POST /api/inscrever` devolve `capi: "enviado"` quando a Meta aceita.

## Ferramentas neste Mac

- Node 24 instalado (`/usr/local/bin/node`): roda os testes de `test/` e
  `node --check arquivo.js` para conferir sintaxe.
- Não há gerador de WebP. Imagem de post: JPG com
  `sips -Z 1200 -s format jpeg -s formatOptions 55`.
