// api/_meta.js
// Envio de eventos para a API de Conversões da Meta (server-side).
//
// Não é uma rota: a Vercel ignora no roteamento os arquivos de /api com "_" na frente.
// Usado por api/inscrever.js (evento de lead, com e-mail e telefone) e por
// api/capi.js (eventos sem dado pessoal, só cookie do navegador).
//
// Regra de ouro: este módulo NUNCA lança e NUNCA trava o fluxo de captação.
// Se o token não estiver configurado ou a Meta demorar, o lead segue normalmente.
//
// Variáveis de ambiente:
//   META_CAPI_TOKEN       obrigatório. Sem ele, o envio é ignorado em silêncio.
//   META_PIXEL_ID         opcional. Default: o pixel que está no HTML do site.
//   META_TEST_EVENT_CODE  opcional. Só para o painel "Testar eventos" do Gerenciador.
//   META_API_VERSION      opcional. Default v21.0.

const crypto = require('crypto');

const PIXEL_PADRAO = '942431053282816';
const VERSAO_PADRAO = 'v21.0';
const TIMEOUT_MS = 3000;

function env(nome, padrao) {
  const v = process.env[nome];
  return v && String(v).trim() ? String(v).trim() : (padrao || '');
}

function hash(valor) {
  if (!valor) return null;
  return crypto.createHash('sha256').update(String(valor)).digest('hex');
}

// ---- normalização exigida pela Meta (minúsculo, sem espaço, sem pontuação)

function normalizarEmail(e) {
  const v = String(e == null ? '' : e).trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? v : '';
}

// A Meta espera só dígitos, com código do país e sem "+".
// Números brasileiros chegam do formulário com 10 ou 11 dígitos: acrescenta o 55.
function normalizarTelefone(t) {
  const d = String(t == null ? '' : t).replace(/\D/g, '');
  if (d.length < 10) return '';
  if (d.length <= 11) return '55' + d;
  return d;
}

function normalizarNome(n) {
  return String(n == null ? '' : n)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z\s]/g, '')
    .trim().toLowerCase();
}

// ---- dados que o navegador entrega junto da requisição

function lerCookies(req) {
  const bruto = (req && req.headers && req.headers.cookie) || '';
  const saida = {};
  bruto.split(';').forEach((par) => {
    const i = par.indexOf('=');
    if (i < 0) return;
    const k = par.slice(0, i).trim();
    if (k) saida[k] = decodeURIComponent(par.slice(i + 1).trim());
  });
  return saida;
}

function ipDoCliente(req) {
  const h = (req && req.headers) || {};
  const encaminhado = h['x-forwarded-for'];
  if (encaminhado) return String(encaminhado).split(',')[0].trim();
  return h['x-real-ip'] || (req.socket && req.socket.remoteAddress) || '';
}

// Se o pixel ainda não gravou o cookie _fbc (primeira visita vinda do anúncio),
// dá para montá-lo a partir do fbclid da própria URL. Isso recupera atribuição
// que de outro modo se perderia.
function fbcDaUrl(urlDaPagina) {
  // Regex em vez de new URL(): não depende de API de runtime e não lança em URL torta.
  const m = /[?&]fbclid=([^&#\s]+)/.exec(String(urlDaPagina == null ? '' : urlDaPagina));
  if (!m) return '';
  let fbclid = m[1];
  try { fbclid = decodeURIComponent(fbclid); } catch (e) { /* já estava decodificado */ }
  return `fb.1.${Date.now()}.${fbclid}`;
}

function montarUserData(req, pessoa, urlDaPagina) {
  const p = pessoa || {};
  const cookies = lerCookies(req);
  const ud = {};

  const em = hash(normalizarEmail(p.email));
  if (em) ud.em = [em];

  const ph = hash(normalizarTelefone(p.telefone));
  if (ph) ud.ph = [ph];

  const partes = normalizarNome(p.nome).split(/\s+/).filter(Boolean);
  if (partes.length) {
    ud.fn = [hash(partes[0])];
    if (partes.length > 1) ud.ln = [hash(partes[partes.length - 1])];
  }

  if (cookies._fbp) ud.fbp = cookies._fbp;
  const fbc = cookies._fbc || fbcDaUrl(urlDaPagina);
  if (fbc) ud.fbc = fbc;

  const ip = ipDoCliente(req);
  if (ip) ud.client_ip_address = ip;
  const ua = req && req.headers && req.headers['user-agent'];
  if (ua) ud.client_user_agent = ua;

  return ud;
}

// ---- envio

// Retorna sempre um objeto de diagnóstico; nunca lança.
async function enviarEvento(req, evento) {
  const token = env('META_CAPI_TOKEN');
  if (!token) return { ok: false, motivo: 'sem_token' };

  const pixel = env('META_PIXEL_ID', PIXEL_PADRAO);
  const versao = env('META_API_VERSION', VERSAO_PADRAO);
  const testCode = env('META_TEST_EVENT_CODE');

  const url = evento.event_source_url || '';
  const dados = {
    event_name: evento.event_name,
    event_time: Math.floor(Date.now() / 1000),
    action_source: 'website',
    user_data: montarUserData(req, evento.pessoa, url)
  };
  if (evento.event_id) dados.event_id = evento.event_id;
  if (url) dados.event_source_url = url;
  if (evento.custom_data) dados.custom_data = evento.custom_data;

  const corpo = { data: [dados] };
  if (testCode) corpo.test_event_code = testCode;

  const cancelar = new AbortController();
  const relogio = setTimeout(() => cancelar.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(`https://graph.facebook.com/${versao}/${pixel}/events?access_token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
      signal: cancelar.signal
    });
    const resposta = await r.json().catch(() => ({}));
    if (!r.ok) {
      return {
        ok: false,
        motivo: 'meta_recusou',
        status: r.status,
        detalhe: resposta && resposta.error ? String(resposta.error.message).slice(0, 300) : ''
      };
    }
    return { ok: true, recebidos: resposta.events_received || 0 };
  } catch (e) {
    return { ok: false, motivo: e && e.name === 'AbortError' ? 'timeout' : 'falha_de_rede' };
  } finally {
    clearTimeout(relogio);
  }
}

module.exports = {
  enviarEvento,
  normalizarEmail,
  normalizarTelefone,
  normalizarNome,
  lerCookies,
  fbcDaUrl,
  montarUserData,
  configurado: () => Boolean(env('META_CAPI_TOKEN'))
};
