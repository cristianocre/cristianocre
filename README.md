# Site — Cristiano Creczyenski

Site institucional + captação de leads (materiais) gravando direto no Notion.

## Estrutura
```
index.html          Home
diagnostico.html    Diagnóstico 360 (LP)
materiais.html      Materiais gratuitos (3 iscas)
mentoria.html       Mentoria (em breve / WhatsApp)
styles.css          Estilos (compartilhado)
app.js              Scripts (compartilhado)
cristiano.jpg       Foto do mini CV
vercel.json         URLs limpas
api/inscrever.js    Função que grava os leads no Notion
```
> Mantenha TODOS os arquivos juntos, com o `index.html` e a pasta `api/` na RAIZ do projeto.

---

## Deploy (GitHub + Vercel) — recomendado

1. Crie um repositório novo no GitHub e suba todos estes arquivos na raiz:
   ```
   git init
   git add .
   git commit -m "Site Cristiano Creczyenski"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/SEU_REPO.git
   git push -u origin main
   ```
2. Na Vercel: **Add New → Project → importe esse repositório**.
3. Framework Preset: **Other**. Não precisa de build command. Clique em **Deploy**.

O site já sobe funcionando (páginas, navegação, design). A **captação de e-mail** precisa dos 2 passos abaixo.

---

## Ativar a captação de leads (Notion)

### Passo 1 — Variáveis de ambiente (NO MESMO projeto do deploy)
Vercel → seu projeto → **Settings → Environment Variables** → adicione as duas, marcadas para **Production** e **Preview**:

| Name | Value |
|------|-------|
| `NOTION_TOKEN` | o token da integração interna do Notion (passo 2) |
| `NOTION_DATABASE_ID` | `cccc23073eb6453bb5165a882ac78062` |

> ⚠️ Confira que está adicionando no projeto que serve o seu domínio. Variável em projeto errado = erro "Integração não configurada".
> ⚠️ Variáveis só valem para deploys feitos DEPOIS de criá-las. Após adicionar, faça **Redeploy**.

### Passo 2 — Integração do Notion
1. notion.so/my-integrations → **New integration** → tipo **Internal** → copie o **Internal Integration Secret** (esse é o `NOTION_TOKEN`).
2. Abra a base **Leads — Materiais (Site)**:
   https://app.notion.com/p/cccc23073eb6453bb5165a882ac78062
   → menu **⋯ → Connections → Connect to →** selecione a sua integração.
   (Sem isso, o Notion recusa a gravação.)

### Passo 3 — Testar
- Abra no navegador: `https://SEU-DOMINIO/api/inscrever`
  - `configured:true` → tudo certo, teste o formulário.
  - `hasToken:false` ou `hasDb:false` → a variável não está nesse projeto (ou vazia).
- Preencha um e-mail na página **Materiais**: deve aparecer uma linha nova no Notion e redirecionar para o material.

---

## Pendências (quando quiser)
- Trocar os links das iscas para versões **somente-leitura/cópia** (hoje são links de edição) — em `materiais.html`, atributo `data-redirect`.
- Atualizar YouTube/LinkedIn reais no rodapé (hoje YouTube aponta para o canal do podcast).
- Trocar as fotos genéricas dos avatares do hero (`index.html`).
- Domínio `cristianocre.com`: Vercel → projeto → **Settings → Domains**.

## Observações
- "e-commerce" usa hífen não separável para nunca quebrar de linha.
- Link do podcast: youtube.com/@PerformanceParaResultados
- WhatsApp da mentoria já configurado com mensagem pronta.
