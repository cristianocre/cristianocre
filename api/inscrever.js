// api/inscrever.js
// Recebe os leads do site (formulários de material, newsletter e pop-up de saída)
// e grava no Notion, na base "Leads — Materiais (Site Cristianocre.com)".
//
// Campos aceitos no POST (JSON):
//   email     obrigatório
//   nome      opcional (pop-up envia)
//   telefone  opcional (pop-up envia, só dígitos ou formatado)
//   material  opcional, default "Newsletter"
//   origem    opcional, caminho da página
//   empresa   honeypot: se vier preenchido, é bot e a requisição é descartada
//
// Variáveis de ambiente aceitas (a primeira encontrada é usada):
//   token: NOTION_TOKEN | NOTION_API_KEY | NOTION_SECRET | NOTION_KEY
//   base:  NOTION_DB | NOTION_DATABASE_ID | NOTION_DB_ID | NOTION_LEADS_DB

const NOMES_TOKEN = ['NOTION_TOKEN', 'NOTION_API_KEY', 'NOTION_SECRET', 'NOTION_KEY'];
const NOMES_DB = ['NOTION_DB', 'NOTION_DATABASE_ID', 'NOTION_DB_ID', 'NOTION_LEADS_DB'];
const NOTION_VERSION = '2022-06-28';

function achar(nomes) {
  for (const n of nomes) {
    const v = process.env[n];
    if (v && String(v).trim()) return { nome: n, valor: String(v).trim() };
  }
  return { nome: null, valor: '' };
}

function emailValido(e) {
  return typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim()) && e.length <= 160;
}

function limpar(s, max) {
  return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, max || 200);
}

function formatarTelefone(bruto) {
  const d = String(bruto == null ? '' : bruto).replace(/\D/g, '');
  if (d.length < 10) return '';
  const nacional = d.length > 11 && d.startsWith('55') ? d.slice(2) : d;
  const ddd = nacional.slice(0, 2);
  const resto = nacional.slice(2);
  if (resto.length === 9) return `+55 ${ddd} ${resto.slice(0, 5)}-${resto.slice(5)}`;
  if (resto.length === 8) return `+55 ${ddd} ${resto.slice(0, 4)}-${resto.slice(4)}`;
  return `+${d}`;
}

async function lerCorpo(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body) {
    try { return JSON.parse(req.body); } catch (e) { return {}; }
  }
  const pedacos = [];
  for await (const p of req) pedacos.push(p);
  if (!pedacos.length) return {};
  try { return JSON.parse(Buffer.concat(pedacos).toString('utf8')); } catch (e) { return {}; }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const token = achar(NOMES_TOKEN);
  const base = achar(NOMES_DB);

  // ---- health check (mantém o formato antigo e acrescenta o diagnóstico novo)
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      route: 'inscrever',
      configured: Boolean(token.valor && base.valor),
      hasToken: Boolean(token.valor),
      tokenLen: token.valor.length,
      hasDb: Boolean(base.valor),
      dbLen: base.valor.length,
      tokenEnv: token.nome,
      dbEnv: base.nome,
      campos: ['E-mail', 'Nome', 'Telefone', 'Material', 'Origem', 'Status'],
      versao: '2026-08-01'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'metodo_nao_permitido' });
  }
  if (!token.valor || !base.valor) {
    return res.status(500).json({ ok: false, error: 'nao_configurado' });
  }

  const corpo = await lerCorpo(req);

  // honeypot: campo invisível preenchido significa robô
  if (limpar(corpo.empresa, 80)) {
    return res.status(200).json({ ok: true, ignorado: true });
  }

  const email = limpar(corpo.email, 160).toLowerCase();
  if (!emailValido(email)) {
    return res.status(400).json({ ok: false, error: 'email_invalido' });
  }

  const nome = limpar(corpo.nome, 120);
  const telefone = formatarTelefone(corpo.telefone);
  const material = limpar(corpo.material, 100) || 'Newsletter';
  const origem = limpar(corpo.origem, 300) || '/';

  const properties = {
    'E-mail': { title: [{ text: { content: email } }] },
    'Material': { select: { name: material } },
    'Origem': { rich_text: [{ text: { content: origem } }] },
    'Status': { select: { name: 'Novo' } }
  };
  if (nome) properties['Nome'] = { rich_text: [{ text: { content: nome } }] };
  if (telefone) properties['Telefone'] = { phone_number: telefone };

  try {
    const r = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token.valor}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ parent: { database_id: base.valor }, properties })
    });
    const dados = await r.json().catch(() => ({}));
    if (!r.ok) {
      return res.status(502).json({
        ok: false,
        error: 'notion_recusou',
        status: r.status,
        detalhe: dados && dados.message ? String(dados.message).slice(0, 300) : ''
      });
    }
    return res.status(200).json({
      ok: true,
      id: dados.id || null,
      gravou: { nome: Boolean(nome), telefone: Boolean(telefone) }
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'falha_no_envio', detalhe: String(e).slice(0, 200) });
  }
};
