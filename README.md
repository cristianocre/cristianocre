# cristianocre.com

Site pessoal do Cristiano Creczyenski: home, landing pages (Diagnóstico 360,
mentoria, treinamentos), materiais gratuitos com captação de leads no Notion,
podcast e o blog em `/insights`.

**Este repositório é público.** Nada de nota interna, dado de cliente ou
segredo em arquivo versionado, nem em comentário HTML (aparece no
view-source). Segredos ficam nas variáveis de ambiente da Vercel.

## Como está montado

HTML, CSS e JavaScript puros. Sem framework, sem `package.json`, sem build.

| Arquivo | O que é |
|---|---|
| `*.html` (raiz) | Uma página por arquivo. `index.html` é a home, `insights.html` é o índice do blog |
| `styles.css` | Estilos de todas as páginas |
| `app.js` | Script de todas as páginas: menu, formulários, GA4, Pixel da Meta. Mudança aqui afeta o site inteiro |
| `youtube-feed.js` | Carrossel de vídeos da home |
| `api/inscrever.js` | Função da Vercel: grava o lead no Notion e envia o evento à API de Conversões da Meta |
| `api/capi.js`, `api/_meta.js` | API de Conversões da Meta |
| `api/youtube.js` | Feed do YouTube para o carrossel |
| `img/` | Imagens. Post novo: JPG de 1200 × 675, de 47 a 65 KB |
| `sitemap.xml`, `robots.txt`, `llms.txt` | SEO e GEO. Página nova entra nos três |
| `vercel.json` | URLs sem `.html` (`cleanUrls`) |
| `test/` | Testes da função de leads |
| `.vercelignore` | Arquivos do repositório que não vão para o site no ar |

`inscrever.js` e `youtube.js` na raiz são versões antigas das funções de
`api/`. Nenhuma página carrega esses arquivos.

## Publicação

- **Branch de produção:** `main-cristianocre`. Cada envio nele é publicado
  pela Vercel em cerca de 1 minuto, em https://www.cristianocre.com
  (`cristianocre.com` sem www redireciona para lá).
- Outro branch gera uma prévia na Vercel, sem mexer no site no ar.
- Domínio e variáveis: Vercel → projeto → Settings.

## Trabalhar no site

```bash
git clone https://github.com/cristianocre/cristianocre.git ~/PROJETOS/CRISTIANOCRE-SITE
```

1. Antes de começar: `git pull` (no VS Code: Sync Changes).
2. Edite. Para ver no navegador: `python3 -m http.server 8000` na pasta e
   abra http://localhost:8000/index.html (as URLs sem `.html` e as funções de
   `api/` só funcionam na Vercel).
3. Mexeu em `api/inscrever.js`: `node test/testar-inscrever-local.mjs`. O
   teste não envia nada ao Notion.
4. Envie: commit com uma frase que diga o que mudou e `git push` (no VS Code:
   Commit e depois Sync Changes).

`publicar.bat` faz o passo 4 no Windows.

## Variáveis de ambiente (Vercel)

Lista e explicação de cada uma em `.env.example`. Variável nova só vale para
publicações feitas depois de criada: depois de adicionar, use Redeploy.

| Variável | Para quê |
|---|---|
| `NOTION_TOKEN` | Integração interna do Notion que grava os leads |
| `NOTION_DATABASE_ID` | Base "Leads: Materiais (Site)" |
| `META_CAPI_TOKEN` | API de Conversões da Meta |
| `META_PIXEL_ID`, `META_TEST_EVENT_CODE`, `META_API_VERSION` | Opcionais |

Diagnóstico rápido: `https://www.cristianocre.com/api/inscrever` mostra se
o Notion está configurado, e `/api/capi`, se a Meta está.

## Pendências

- Trocar os links das iscas por versões só de leitura ou cópia (hoje são
  links de edição), em `materiais.html`, atributo `data-redirect`.
- Conferir YouTube e LinkedIn reais no rodapé.
- Trocar as fotos genéricas dos avatares do hero (`index.html`).
