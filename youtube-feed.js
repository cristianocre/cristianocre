// ===== Carrosséis: últimos vídeos de um canal no YouTube =====
// Consome /api/youtube (função serverless na Vercel), que busca o feed
// do canal no servidor (sem CORS) e devolve os 5 vídeos mais recentes.
//
// Funciona com mais de um carrossel na mesma página. Cada carrossel é um
// elemento com a classe .yt-carousel e configura o próprio canal por atributo:
//
//   <div class="carousel yt-carousel"
//        data-yt-canal="podcast"                          (opcional, padrão: cristiano)
//        data-yt-link="https://www.youtube.com/@..."      (link do fallback)
//        data-yt-titulo="Veja os episódios no canal"      (título do fallback)
//        data-yt-cta="Abrir o canal">
//
// Fallback gracioso para um card com link do canal.
(function () {
  var trilhas = document.querySelectorAll('.yt-carousel');
  if (!trilhas.length) return;

  var MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  function fmtDate(iso) {
    try {
      var d = new Date(iso);
      return d.getDate() + ' ' + MESES[d.getMonth()] + ' ' + d.getFullYear();
    } catch (e) { return ''; }
  }

  function videoCard(v, rotulo, layout) {
    var quote = layout === 'quote';
    var card = document.createElement('article');
    card.className = (quote ? 'quote' : 'vcard') + ' reveal in';

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
      ifr.loading = 'lazy';
      ifr.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      ifr.allowFullscreen = true;
      btn.replaceWith(ifr);
    });

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
    go.innerHTML = rotulo + ' <span class="ar">→</span>';

    card.appendChild(btn);
    if (quote) {
      // Mesmo formato visual dos cards de depoimento: capa, data, título e link.
      card.appendChild(date);
      card.appendChild(h3);
      card.appendChild(go);
    } else {
      var body = document.createElement('div');
      body.className = 'vbody';
      body.appendChild(date);
      body.appendChild(h3);
      body.appendChild(go);
      card.appendChild(body);
    }
    return card;
  }

  function iniciar(track) {
    var canal = track.getAttribute('data-yt-canal') || 'cristiano';
    var link = track.getAttribute('data-yt-link') || 'https://www.youtube.com/@cristianocre';
    var titulo = track.getAttribute('data-yt-titulo') || 'Veja os vídeos no canal';
    var cta = track.getAttribute('data-yt-cta') || 'Abrir o canal';
    var rotulo = track.getAttribute('data-yt-rotulo') || 'Assistir no YouTube';
    var layout = track.getAttribute('data-yt-layout') || 'vcard';

    function render(videos) {
      track.innerHTML = '';
      videos.forEach(function (v) { track.appendChild(videoCard(v, rotulo, layout)); });
      track.setAttribute('aria-busy', 'false');
    }

    function fail() {
      track.innerHTML = '';
      track.setAttribute('aria-busy', 'false');
      var card = document.createElement('article');
      card.className = layout === 'quote' ? 'quote' : 'vcard';
      card.style.cssText = 'flex:0 0 100%;max-width:560px;margin:0 auto;align-items:center;justify-content:center;text-align:center;padding:44px 30px';
      card.innerHTML = '<h3 style="margin:0 0 10px;font-size:20px">' + titulo + '</h3>' +
        '<p style="color:var(--muted);margin:0 0 22px;font-size:15.5px">Confira os conteúdos mais recentes direto no YouTube.</p>' +
        '<a class="btn btn-green" href="' + link + '" target="_blank" rel="noopener">' + cta + ' <span class="ar">→</span></a>';
      track.appendChild(card);
    }

    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, 7000);

    fetch('/api/youtube?canal=' + encodeURIComponent(canal), { signal: ctrl.signal })
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
  }

  Array.prototype.forEach.call(trilhas, iniciar);
})();
