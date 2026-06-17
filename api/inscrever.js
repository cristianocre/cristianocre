// Função serverless da Vercel: grava o lead na database do Notion.
// Variáveis de ambiente (Settings -> Environment Variables do MESMO projeto do domínio):
//   NOTION_TOKEN        -> token da integração interna do Notion
//   NOTION_DATABASE_ID  -> ID da database "Leads — Materiais (Site)"

module.exports = async (req, res) => {
  const token = process.env.NOTION_TOKEN;
  const databaseId = process.env.NOTION_DATABASE_ID;
  const config = { hasToken: !!token, tokenLen: token ? token.length : 0, hasDb: !!databaseId, dbLen: databaseId ? databaseId.length : 0 };

  // GET: diagnóstico rápido pelo navegador (não expõe o token, só se existe e o tamanho)
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, route: 'inscrever', configured: config.hasToken && config.hasDb, ...config });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Método não permitido' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const email = (body.email || '').trim().toLowerCase();
    const material = (body.material || 'Newsletter').trim();
    const origem = (body.origem || '').toString().slice(0, 500);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ ok: false, error: 'E-mail inválido' });
    }

    if (!token || !databaseId) {
      // agora informa QUAL está faltando (sem vazar valor)
      return res.status(500).json({ ok: false, error: 'Integração não configurada', debug: config });
    }

    const r = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties: {
          'E-mail':   { title: [{ text: { content: email } }] },
          'Material': { select: { name: material } },
          'Origem':   { rich_text: [{ text: { content: origem } }] },
          'Status':   { select: { name: 'Novo' } },
        },
      }),
    });

    if (!r.ok) {
      const detail = await r.text();
      console.error('Notion API error:', r.status, detail);
      // devolve o motivo real do Notion para facilitar o diagnóstico
      return res.status(502).json({ ok: false, error: 'Falha ao salvar no Notion', notionStatus: r.status, notionDetail: detail.slice(0, 300) });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Erro:', err);
    return res.status(500).json({ ok: false, error: 'Erro interno', detail: String(err).slice(0, 200) });
  }
};
