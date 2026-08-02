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

// Observação importante sobre o podcast:
// o canal Performance para Resultados (UClDIQjliJFirXWqkXQ7fPRA) tem o feed de
// uploads vazio, porque os episódios são publicados no canal principal do
// Cristiano. Por isso o podcast lê o feed do canal principal e filtra pelo
// título. Se um dia os vídeos passarem a ser enviados no canal do podcast,
// basta trocar o handle por channelId: 'UClDIQjliJFirXWqkXQ7fPRA' e apagar o filtro.
const CANAIS = {
  cristiano: { handle: 'cristianocre' },
  podcast: { handle: 'cristianocre', filtro: /podcast/i, agruparPorEpisodio: true },
};

const PADRAO = 'cristiano';
const MAX = 6;          // quantos itens a função devolve
const MAX_FEED = 15;    // o feed RSS do YouTube entrega no máximo 15 entradas
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
  const entries = xml.split('<entry>').slice(1, MAX_FEED + 1);
  return entries.map((e) => {
    const id = (e.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || [])[1] || '';
    const title = decode((e.match(/<title>([^<]*)<\/title>/) || [])[1] || 'Vídeo');
    const date = (e.match(/<published>([^<]+)<\/published>/) || [])[1] || '';
    return { id, title, date };
  }).filter((v) => v.id);
}

// Aplica o filtro do canal e, quando pedido, mantém só um vídeo por número de
// episódio, para o carrossel não ficar com quatro cortes do mesmo episódio.
function selecionar(videos, canal) {
  let lista = videos;
  if (canal.filtro) lista = lista.filter((v) => canal.filtro.test(v.title));
  if (canal.agruparPorEpisodio) {
    const vistos = new Set();
    lista = lista.filter((v) => {
      const m = v.title.match(/podcast\s*#?\s*(\d+)/i);
      if (!m) return true;
      if (vistos.has(m[1])) return false;
      vistos.add(m[1]);
      return true;
    });
  }
  return lista.slice(0, MAX);
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
    const videos = selecionar(parseFeed(xml), canal);
    if (!videos.length) throw new Error('feed vazio ou sem itens que passem no filtro');

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
