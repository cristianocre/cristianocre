// api/capi.js
// Espelha no servidor os eventos que o Pixel dispara no navegador e que NÃO passam
// pelo formulário: cliques de WhatsApp, clique no Diagnóstico, exibição do pop-up.
//
// O evento de lead do formulário não passa por aqui — quem envia é api/inscrever.js,
// que tem e-mail e telefone em mãos e por isso consegue uma correspondência bem melhor.
//
// Deduplicação: o navegador manda o mesmo event_id que usou no fbq('track', ..., {eventID}).
// A Meta junta os dois e conta uma vez só.
//
// Este endpoint é público. Por isso ele NÃO aceita dado pessoal do corpo da requisição:
// o único dado de identificação vem dos cookies _fbp/_fbc, do IP e do user-agent, que o
// navegador entrega sozinho. Assim ninguém consegue envenenar o pixel com e-mail falso.

const { enviarEvento, configurado } = require('./_meta.js');

// Só estes eventos são aceitos. Qualquer outro nome é recusado.
const EVENTOS_PERMITIDOS = ['Contact', 'Schedule', 'ViewContent', 'Subscribe', 'LeadPopup'];

function limpar(s, max) {
  return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, max || 200);
}

// Aceita só URLs do próprio site, para o event_source_url não virar campo livre.
function urlDoSite(bruto) {
  const v = limpar(bruto, 500);
  if (!v) return '';
  try {
    const u = new URL(v);
    if (u.protocol !== 'https:') return '';
    if (!/(^|\.)cristianocre\.com$/.test(u.hostname)) return '';
    return u.toString();
  } catch (e) {
    return '';
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://www.cristianocre.com');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      route: 'capi',
      configured: configurado(),
      pixel: (process.env.META_PIXEL_ID || '942431053282816'),
      modoTeste: Boolean(process.env.META_TEST_EVENT_CODE),
      eventos: EVENTOS_PERMITIDOS,
      versao: '2026-09-09'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'metodo_nao_permitido' });
  }

  // Sem token configurado o endpoint responde ok e não faz nada.
  // O rastreio do navegador continua funcionando; nada quebra na página.
  if (!configurado()) return res.status(200).json({ ok: true, ignorado: 'sem_token' });

  let corpo = req.body;
  if (typeof corpo === 'string') { try { corpo = JSON.parse(corpo); } catch (e) { corpo = {}; } }
  if (!corpo || typeof corpo !== 'object') corpo = {};

  const evento = limpar(corpo.event_name, 40);
  if (!EVENTOS_PERMITIDOS.includes(evento)) {
    return res.status(400).json({ ok: false, error: 'evento_nao_permitido' });
  }

  const custom = {};
  const nomeConteudo = limpar(corpo.content_name, 100);
  if (nomeConteudo) custom.content_name = nomeConteudo;

  const r = await enviarEvento(req, {
    event_name: evento,
    event_id: limpar(corpo.event_id, 64),
    event_source_url: urlDoSite(corpo.event_source_url),
    custom_data: Object.keys(custom).length ? custom : null,
    pessoa: null
  });

  // Falha de CAPI nunca vira erro para a página: o Pixel do navegador já registrou.
  return res.status(200).json(r.ok ? { ok: true } : { ok: false, motivo: r.motivo });
};
