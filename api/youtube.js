// Função serverless da Vercel: últimos vídeos de um canal do YouTube (sem API key).
// Resolve handle -> channelId -> feed RSS, no servidor (sem CORS).
// Cache de borda via headers + cache em memória da instância, separado por canal.
//
// Uso:
//   /api/youtube                -> canal do Cristiano (padrão, mantém compatibilidade)
//   /api/youtube?canal=podcast  -> canal do podcast Performance para Resultados
//
// Só os canais da lista abaixo são aceitos. Isso evita que a função vire
// um proxy aberto para qualquer canal do YouTube.

const CANAIS = {
  cristiano: { handle: 'cristianocre' },
  podcast: { channelId: 'UClDIQjliJFirXWqkXQ7fPRA', handle: 'PerformanceParaResultados' },
};

const PADRAO = 'cristiano';
const MAX = 5;
const TTL = 1000 * 60 * 30; // 30 min

// Cache em memória da instância, uma entrada por canal.
const CACHE = Object.create(null);

async function resolveChannelId(handle) {
  const res = await fetch('https://www.youtube.com/@' + handle, {
    headers: { 'Accept-Language': 'pt-BR,pt;q=0.9', 'User-Agent': 'Mozilla/5.0' },
  });
  const html = await res.text();
  const m =
    html.match(/"channelId":"(UC[\w-]{20,})"/) ||
    html.match(/channel\/(UC[\w-]{20,})/) ||
    html.match(/(UC[\w-]{22})/);
  if (!m) throw new Error('channelId não encontrado');
  return m[1];
}

function decode(s) {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'");
}

function parseFeed(xml) {
  const entries = xml.split('<entry>').slice(1, MAX + 1);
  return entries.map((e) => {
    const id = (e.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || [])[1] || '';
    const title = decode((e.match(/<title>([^<]*)<\/title>/) || [])[1] || 'Vídeo');
    const date = (e.match(/<published>([^<]+)<\/published>/) || [])[1] || '';
    return { id, title, date };
  }).filter((v) => v.id);
}

module.exports = async (req, res) => {
  const pedido = String((req.query && req.query.canal) || PADRAO).toLowerCase();
  const chave = Object.prototype.hasOwnProperty.call(CANAIS, pedido) ? pedido : PADRAO;
  const canal = CANAIS[chave];

  try {
    const emCache = CACHE[chave];
    if (emCache && emCache.videos && Date.now() - emCache.at < TTL) {
      res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=86400');
      return res.status(200).json({ canal: chave, videos: emCache.videos, cached: true });
    }

    const channelId = canal.channelId || (await resolveChannelId(canal.handle));
    const feedRes = await fetch(
      'https://www.youtube.com/feeds/videos.xml?channel_id=' + channelId,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    const xml = await feedRes.text();
    const videos = parseFeed(xml);
    if (!videos.length) throw new Error('feed vazio');

    CACHE[chave] = { at: Date.now(), videos };
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=86400');
    return res.status(200).json({ canal: chave, videos });
  } catch (err) {
    console.error('youtube feed error (' + chave + '):', err);
    const emCache = CACHE[chave];
    if (emCache && emCache.videos) {
      return res.status(200).json({ canal: chave, videos: emCache.videos, stale: true });
    }
    return res.status(502).json({ canal: chave, error: 'não foi possível carregar o feed', videos: [] });
  }
};
