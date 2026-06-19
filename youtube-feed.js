// ===== Carrossel: últimos vídeos do canal no YouTube =====
// Consome /api/youtube (função serverless na Vercel), que busca o feed
// do canal no servidor (sem CORS) e devolve os 5 vídeos mais recentes.
// Fallback gracioso para um card com link do canal.
(function () {
  var track = document.getElementById('carousel');
  if (!track || !track.classList.contains('yt-carousel')) return;

  var HANDLE = 'cristianocre';

  function fmtDate(iso) {
    try {
      var d = new Date(iso);
      var meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
      return d.getDate() + ' ' + meses[d.getMonth()] + ' ' + d.getFullYear();
    } catch (e) { return ''; }
  }

  function videoCard(v) {
    var card = document.createElement('article');
    card.className = 'vcard reveal in';

    var btn = document.createElement('button');
    btn.className = 'vthumb';
    btn.setAttribute('aria-label', 'Assistir: ' + v.title);
    btn.style.backgroundImage = "url('https://i.ytimg.com/vi/" + v.id + "/hqdefault.jpg')";
    var play = document.createElement('span');
    play.className = 'play';
    btn.appendChild(play);
    btn.addEventListener('click', function () {
      var ifr = document.createElement('iframe');
      ifr.src = 'https://www.youtube-nocookie.com/embed/' + v.id + '?autoplay=1&rel=0';
      ifr.title = v.title;
      ifr.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      ifr.allowFullscreen = true;
      btn.replaceWith(ifr);
    });

    var body = document.createElement('div');
    body.className = 'vbody';
    var date = document.createElement('span');
    date.className = 'vdate';
    date.textContent = fmtDate(v.date);
    var h3 = document.createElement('h3');
    h3.textContent = v.title;
    var go = document.createElement('a');
    go.className = 'go';
    go.href = 'https://www.youtube.com/watch?v=' + v.id;
    go.target = '_blank';
    go.rel = 'noopener';
    go.innerHTML = 'Assistir no YouTube <span class="ar">\u2192</span>';
    body.appendChild(date);
    body.appendChild(h3);
    body.appendChild(go);

    card.appendChild(btn);
    card.appendChild(body);
    return card;
  }

  function render(videos) {
    track.innerHTML = '';
    videos.forEach(function (v) { track.appendChild(videoCard(v)); });
    track.setAttribute('aria-busy', 'false');
  }

  function fail() {
    track.innerHTML = '';
    track.setAttribute('aria-busy', 'false');
    var card = document.createElement('article');
    card.className = 'vcard';
    card.style.cssText = 'flex:0 0 100%;max-width:560px;margin:0 auto;align-items:center;justify-content:center;text-align:center;padding:44px 30px';
    card.innerHTML = '<h3 style="margin:0 0 10px;font-size:20px">Veja os vídeos no canal</h3>' +
      '<p style="color:var(--muted);margin:0 0 22px;font-size:15.5px">Confira os conteúdos mais recentes direto no YouTube.</p>' +
      '<a class="btn btn-green" href="https://www.youtube.com/@' + HANDLE + '" target="_blank" rel="noopener">Abrir o canal <span class="ar">\u2192</span></a>';
    track.appendChild(card);
  }

  var ctrl = new AbortController();
  var timer = setTimeout(function () { ctrl.abort(); }, 7000);

  fetch('/api/youtube', { signal: ctrl.signal })
    .then(function (r) {
      if (!r.ok) throw new Error('status ' + r.status);
      return r.json();
    })
    .then(function (data) {
      clearTimeout(timer);
      var videos = (data && data.videos) || [];
      if (!videos.length) throw new Error('sem vídeos');
      render(videos);
    })
    .catch(function () { clearTimeout(timer); fail(); });
})();
