// Função serverless da Vercel: últimos vídeos do canal do YouTube (sem API key).
// Resolve @cristianocre -> channelId -> feed RSS, no servidor (sem CORS).
// Cache de borda via headers + cache em memória da instância.

const HANDLE = 'cristianocre';
const MAX = 5;
const TTL = 1000 * 60 * 30; // 30 min

// Cache em memória da instância (além do cache de borda).
let CACHE = { at: 0, videos: null };

async function resolveChannelId() {
  const res = await fetch('https://www.youtube.com/@' + HANDLE, {
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
  try {
    if (CACHE.videos && Date.now() - CACHE.at < TTL) {
      res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=86400');
      return res.status(200).json({ videos: CACHE.videos, cached: true });
    }

    const channelId = await resolveChannelId();
    const feedRes = await fetch(
      'https://www.youtube.com/feeds/videos.xml?channel_id=' + channelId,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    const xml = await feedRes.text();
    const videos = parseFeed(xml);
    if (!videos.length) throw new Error('feed vazio');

    CACHE = { at: Date.now(), videos };
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=86400');
    return res.status(200).json({ videos });
  } catch (err) {
    console.error('youtube feed error:', err);
    if (CACHE.videos) {
      return res.status(200).json({ videos: CACHE.videos, stale: true });
    }
    return res.status(502).json({ error: 'não foi possível carregar o feed', videos: [] });
  }
};
