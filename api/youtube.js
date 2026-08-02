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

// Os dois canais são independentes e não se misturam:
//   cristiano -> conteúdo, aulas e cortes (@cristianocre)
//   podcast   -> Performance para Resultados (@PerformanceParaResultados)
//
// Para cada canal a função tenta o feed do canal e, se ele vier vazio, tenta o
// feed da playlist de uploads (o mesmo conteúdo, por outro endereço). Alguns
// canais do YouTube respondem em um e não no outro.
const CANAIS = {
  cristiano: { handle: 'cristianocre' },
  podcast: { channelId: 'UClDIQjliJFirXWqkXQ7fPRA', handle: 'PerformanceParaResultados' },
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
    const debug = !!(req.query && req.query.debug);
    const emCache = CACHE[chave];
    if (!debug && emCache && emCache.videos && Date.now() - emCache.at < TTL) {
      res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=86400');
      return res.status(200).json({ canal: chave, videos: emCache.videos, cached: true });
    }

    const channelId = canal.channelId || (await resolveChannelId(canal.handle));

    // Dois endereços para o mesmo conteúdo. Alguns canais respondem em um e não
    // no outro, então tentamos o feed do canal e depois o da playlist de uploads.
    const enderecos = [
      'https://www.youtube.com/feeds/videos.xml?channel_id=' + channelId,
      'https://www.youtube.com/feeds/videos.xml?playlist_id=UU' + channelId.slice(2),
    ];

    const tentativas = [];
    let videos = [];
    for (const endereco of enderecos) {
      let status = 0, tamanho = 0;
      try {
        const feedRes = await fetch(endereco, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        status = feedRes.status;
        const xml = await feedRes.text();
        tamanho = xml.length;
        const achados = selecionar(parseFeed(xml), canal);
        tentativas.push({ endereco, status, tamanho, itens: achados.length });
        if (achados.length) { videos = achados; break; }
      } catch (e) {
        tentativas.push({ endereco, status, tamanho, erro: String(e && e.message || e) });
      }
    }

    // /api/youtube?canal=podcast&debug=1 mostra o que cada endereço devolveu.
    if (debug) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ canal: chave, channelId, tentativas, itens: videos.length, videos });
    }

    if (!videos.length) throw new Error('feed vazio nos dois endereços');

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
