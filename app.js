// ===== Tagueamento (GA4 + Meta Pixel) =====
function track(gaEvent, gaParams, fbEvent, fbParams){
  try{ if(typeof gtag==='function') gtag('event', gaEvent, gaParams||{}); }catch(e){}
  try{ if(typeof fbq==='function') fbq('track', fbEvent, fbParams||{}); }catch(e){}
}

// Nav background on scroll
const nav=document.getElementById('nav');
if(nav){
  const onScroll=()=>nav.classList.toggle('scrolled',window.scrollY>20);
  onScroll();window.addEventListener('scroll',onScroll,{passive:true});
}

// Mobile menu
const burger=document.getElementById('burger');
if(burger){
  burger.addEventListener('click',()=>{
    const open=document.body.classList.toggle('menu-open');
    burger.setAttribute('aria-expanded',open);
    burger.setAttribute('aria-label',open?'Fechar menu':'Abrir menu');
  });
  document.querySelectorAll('#mobileMenu a').forEach(a=>a.addEventListener('click',()=>{
    document.body.classList.remove('menu-open');burger.setAttribute('aria-expanded',false);
  }));
}

// Carousel arrows
const car=document.getElementById('carousel');
if(car){
  const step=360;
  const next=document.getElementById('carNext');
  const prev=document.getElementById('carPrev');
  if(next)next.addEventListener('click',()=>car.scrollBy({left:step,behavior:'smooth'}));
  if(prev)prev.addEventListener('click',()=>car.scrollBy({left:-step,behavior:'smooth'}));
}

// Reveal on scroll
const io=new IntersectionObserver((entries)=>{
  entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});
},{threshold:.12});
document.querySelectorAll('.reveal').forEach(el=>io.observe(el));

// Captação de leads -> Notion (via /api/inscrever) + redirect
function bindLeadForm(form){
  // honeypot anti-robô: campo invisível que humano não preenche
  const hp=document.createElement('input');
  hp.type='text'; hp.name='empresa'; hp.tabIndex=-1; hp.autocomplete='off';
  hp.setAttribute('aria-hidden','true');
  hp.style.cssText='position:absolute;left:-9999px;width:1px;height:1px;opacity:0';
  form.appendChild(hp);
  form.addEventListener('submit', async (ev)=>{
    ev.preventDefault();
    const input=form.querySelector('input[type=email]');
    const btn=form.querySelector('button[type=submit]');
    const email=(input.value||'').trim();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ input.focus(); return; }
    const material=form.dataset.material||'Newsletter';
    const redirect=form.dataset.redirect||'';
    const label=btn.innerHTML;
    btn.disabled=true; btn.innerHTML='Enviando…';
    try{
      const resp=await fetch('/api/inscrever',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({email,material,empresa:hp.value,origem:(location.pathname+location.search)})
      });
      const data=await resp.json().catch(()=>({ok:false}));
      if(data.ok){
        if(material==='Newsletter'){ track('inscricao_newsletter',{origem:location.pathname},'Subscribe',{}); }
        else { track('lead_material',{material:material},'Lead',{content_name:material}); }
        if(redirect){
          form.innerHTML=leadSuccess('Pronto! Seu material está liberado.','Estamos te levando para o conteúdo…',redirect);
          setTimeout(()=>{ window.location.href=redirect; }, 2000);
          return;
        }
        form.innerHTML=leadSuccess('Inscrição confirmada!','Você vai receber as novidades no seu e-mail.',null);
        return;
      }
      throw new Error(data.error||'falha');
    }catch(e){
      btn.disabled=false; btn.innerHTML=label;
      let msg=form.querySelector('.form-msg');
      if(!msg){ msg=document.createElement('p'); msg.className='form-msg'; msg.style.cssText='color:#F36D6D;font-size:13.5px;margin-top:8px'; form.appendChild(msg); }
      msg.textContent='Não consegui enviar agora. Tente de novo em instantes.';
    }
  });
}
document.querySelectorAll('form.mform,form.news-form').forEach(bindLeadForm);

// Bloco de sucesso (identidade visual)
function leadSuccess(title, sub, redirect){
  const link = redirect ? `<a class="fs-link" href="${redirect}">Acessar agora <span class="ar">→</span></a>` : '';
  return `<div class="form-success" role="status" aria-live="polite">`
    + `<span class="fs-check"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg></span>`
    + `<p class="fs-title">${title}</p><p class="fs-sub">${sub}</p>${link}</div>`;
}

// Botão flutuante de WhatsApp (todas as páginas)
(function(){
  const a=document.createElement('a');
  a.href='https://wa.me/5554999047085';
  a.target='_blank'; a.rel='noopener';
  a.className='wa-float';
  a.setAttribute('aria-label','Falar no WhatsApp');
  a.innerHTML='<svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor" aria-hidden="true"><path d="M17.5 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.47-2.4-1.48-.89-.79-1.49-1.78-1.66-2.07-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.53.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.07 4.49.71.3 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35zM12.04 21.5h-.01a9.45 9.45 0 01-4.81-1.32l-.35-.2-3.57.94.95-3.48-.23-.36a9.43 9.43 0 01-1.45-5.03c0-5.22 4.25-9.46 9.47-9.46 2.53 0 4.9.99 6.69 2.78a9.4 9.4 0 012.77 6.69c0 5.22-4.25 9.46-9.46 9.46zm8.05-17.52A11.34 11.34 0 0012.04.62C5.79.62.67 5.73.67 12c0 2 .53 3.96 1.53 5.69L.6 23.38l5.83-1.53a11.34 11.34 0 005.6 1.43h.01c6.26 0 11.36-5.1 11.36-11.37 0-3.04-1.18-5.89-3.33-8.04z"/></svg>';
  a.addEventListener('click',()=> track('clique_whatsapp',{origem:'botao_flutuante'},'Contact',{content_name:'WhatsApp flutuante'}));
  document.body.appendChild(a);
})();

// Conversão principal: clique para agendar o diagnóstico
document.querySelectorAll('a[href*="metris.digital/form"]').forEach(a=>{
  a.addEventListener('click',()=> track('agendar_diagnostico',{origem:location.pathname},'Schedule',{content_name:'Diagnóstico 360'}));
});
// Clique no WhatsApp da mentoria
document.querySelectorAll('a[href*="wa.me"]:not(.wa-float)').forEach(a=>{
  a.addEventListener('click',()=> track('clique_whatsapp',{origem:location.pathname},'Contact',{content_name:'Mentoria WhatsApp'}));
});

// Depoimentos em vídeo: troca o thumbnail pelo player ao clicar
document.querySelectorAll('.vthumb').forEach(btn=>{
  btn.addEventListener('click',()=>{
    const id=btn.dataset.yt;
    const ifr=document.createElement('iframe');
    ifr.src=`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
    ifr.title=btn.getAttribute('aria-label')||'Vídeo';
    ifr.className='vframe';
    ifr.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    ifr.allowFullscreen=true;
    btn.replaceWith(ifr);
  });
});

// ===== Pop-up de saída (captura nome, e-mail e telefone -> WhatsApp) =====
(function(){
  const path = location.pathname.replace(/\.html$/,'').replace(/\/$/,'') || '/';
  // não aparece na própria página do diagnóstico
  if (path === '/diagnostico') return;

  const WA = '5554999047085';
  const VARIANTES = {
    mentoria: {
      img: '/img/popup-mentoria.jpg',
      alt: 'Mentoria de e-commerce individual com Cristiano Creczyenski',
      pill: 'Mentoria &middot; Lista de espera',
      titulo: 'Quer entrar na fila da mentoria individual?',
      sub: 'As vagas atuais estão preenchidas porque o acompanhamento é individual. Deixe seus dados e eu chamo você quando abrir a próxima, já sabendo o seu contexto.',
      botao: 'Entrar na lista de espera',
      material: 'Popup Mentoria',
      wa: (n)=>`Olá Cristiano, sou ${n} e quero entrar na lista de espera da mentoria individual.`
    },
    curso: {
      img: '/img/popup-curso.jpg',
      alt: 'Curso de marketing para e-commerce com Cristiano Creczyenski',
      pill: 'Método Ads para E-commerce',
      titulo: 'Quer tirar dúvidas sobre o curso antes de comprar?',
      sub: '60 aulas, 60 horas, acesso vitalício e certificado, por R$497. Deixe seus dados que eu respondo o que você precisar direto no WhatsApp.',
      botao: 'Falar sobre o curso',
      material: 'Popup Curso',
      wa: (n)=>`Olá Cristiano, sou ${n} e quero tirar uma dúvida sobre o curso Método Ads para E-commerce.`
    },
    diagnostico: {
      img: '/img/popup-diagnostico.jpg',
      alt: 'Diagnóstico 360 do seu e-commerce com Cristiano Creczyenski',
      pill: 'Diagnóstico 360 &middot; Gratuito',
      titulo: 'Antes de sair: sabe onde a sua loja está perdendo dinheiro?',
      sub: 'Em uma hora comigo, você descobre o gargalo real do seu e-commerce e sai com as três prioridades para os próximos 90 dias. É gratuito e sem compromisso.',
      botao: 'Quero meu diagnóstico',
      material: 'Popup Diagnóstico 360',
      wa: (n)=>`Olá Cristiano, sou ${n} e quero agendar meu Diagnóstico 360.`
    }
  };

  let key = 'diagnostico';
  if (path === '/mentoria') key = 'mentoria';
  else if (path === '/curso-marketing-para-ecommerce' || path === '/cursos-online') key = 'curso';
  const V = VARIANTES[key];

  // frequência: 7 dias depois de ver, 90 dias depois de converter
  const store = {
    get(k){ try { return localStorage.getItem(k); } catch(e){ return null; } },
    set(k,v){ try { localStorage.setItem(k,v); } catch(e){} }
  };
  const agora = Date.now();
  const visto = parseInt(store.get('cc_xp_visto')||'0', 10);
  const convertido = parseInt(store.get('cc_xp_lead')||'0', 10);
  if (convertido && agora - convertido < 90*864e5) return;
  if (visto && agora - visto < 7*864e5) return;

  let aberto = false, armado = false, ultimoFoco = null;

  const el = document.createElement('div');
  el.className = 'xp-overlay';
  el.innerHTML =
    '<div class="xp" role="dialog" aria-modal="true" aria-labelledby="xpTitulo">'
    + '<button class="xp-close" type="button" aria-label="Fechar"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg></button>'
    + '<div class="xp-visual"><img src="'+V.img+'" alt="'+V.alt+'" width="900" height="900" loading="lazy" decoding="async"></div>'
    + '<div class="xp-body">'
    +   '<span class="pill"><span class="dot"></span>'+V.pill+'</span>'
    +   '<h2 id="xpTitulo">'+V.titulo+'</h2>'
    +   '<p class="xp-sub">'+V.sub+'</p>'
    +   '<form class="xp-form" novalidate>'
    +     '<input type="text" name="nome" placeholder="Seu nome" aria-label="Seu nome" autocomplete="name" required>'
    +     '<input type="email" name="email" placeholder="Seu melhor e-mail" aria-label="Seu melhor e-mail" autocomplete="email" required>'
    +     '<input type="tel" name="telefone" placeholder="WhatsApp com DDD" aria-label="WhatsApp com DDD" autocomplete="tel" inputmode="numeric" required>'
    +     '<input type="text" name="empresa" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0">'
    +     '<button class="btn btn-green btn-block" type="submit">'+V.botao+' <span class="ar">&#8594;</span></button>'
    +     '<p class="xp-msg" role="alert"></p>'
    +   '</form>'
    +   '<p class="xp-micro">Ao enviar, você vai direto para o WhatsApp. Seus dados não são compartilhados com ninguém.</p>'
    + '</div></div>';
  document.body.appendChild(el);

  const form = el.querySelector('.xp-form');
  const msg  = el.querySelector('.xp-msg');
  const tel  = form.querySelector('input[name=telefone]');

  function abrir(){
    if (aberto) return;
    aberto = true;
    ultimoFoco = document.activeElement;
    el.classList.add('open');
    document.body.style.overflow = 'hidden';
    store.set('cc_xp_visto', String(Date.now()));
    setTimeout(()=>{ const i=form.querySelector('input'); if(i) i.focus({preventScroll:true}); }, 120);
    track('popup_saida_exibido', {variante:key, origem:path}, 'ViewContent', {content_name:V.material});
  }
  function fechar(){
    if (!aberto) return;
    aberto = false;
    el.classList.remove('open');
    document.body.style.overflow = '';
    if (ultimoFoco && ultimoFoco.focus) ultimoFoco.focus();
  }

  el.querySelector('.xp-close').addEventListener('click', fechar);
  el.addEventListener('mousedown', (e)=>{ if(e.target===el) fechar(); });
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') fechar(); });

  // máscara simples de telefone brasileiro
  tel.addEventListener('input', ()=>{
    let v = tel.value.replace(/\D/g,'').slice(0,11);
    if (v.length > 10) v = v.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
    else if (v.length > 6) v = v.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    else if (v.length > 2) v = v.replace(/(\d{2})(\d{0,5})/, '($1) $2');
    else if (v.length) v = v.replace(/(\d{0,2})/, '($1');
    tel.value = v;
  });

  form.addEventListener('submit', async (ev)=>{
    ev.preventDefault();
    const nome = form.nome.value.trim();
    const email = form.email.value.trim();
    const fone = form.telefone.value.replace(/\D/g,'');
    [form.nome, form.email, form.telefone].forEach(i=>i.classList.remove('err'));
    if (nome.length < 2){ form.nome.classList.add('err'); form.nome.focus(); msg.textContent='Como posso te chamar?'; return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ form.email.classList.add('err'); form.email.focus(); msg.textContent='Confere o e-mail, por favor.'; return; }
    if (fone.length < 10){ form.telefone.classList.add('err'); form.telefone.focus(); msg.textContent='Preciso do WhatsApp com DDD.'; return; }
    msg.textContent='';

    // abre a aba de forma síncrona para não ser bloqueada pelo navegador
    const aba = window.open('about:blank', '_blank');
    const btn = form.querySelector('button[type=submit]');
    const rotulo = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = 'Enviando…';

    const url = 'https://wa.me/'+WA+'?text='+encodeURIComponent(V.wa(nome.split(' ')[0]));
    try{
      await fetch('/api/inscrever', {
        method:'POST', headers:{'Content-Type':'application/json'}, keepalive:true,
        body: JSON.stringify({ nome, email, telefone: fone, material: V.material, origem: path, empresa: form.empresa.value })
      });
    }catch(e){}

    store.set('cc_xp_lead', String(Date.now()));
    track('lead_popup_saida', {variante:key, origem:path}, 'Lead', {content_name:V.material});
    if (aba) aba.location.href = url; else window.location.href = url;
    form.innerHTML = leadSuccess('Recebi seus dados!','Estamos te levando para o WhatsApp.', url);
    btn.innerHTML = rotulo;
  });

  // ---- gatilhos
  setTimeout(()=>{ armado = true; }, 8000);

  const desktop = window.matchMedia('(min-width: 821px)').matches && window.matchMedia('(hover: hover)').matches;
  if (desktop){
    document.addEventListener('mouseout', (e)=>{
      if (!armado || aberto) return;
      if (e.relatedTarget || e.toElement) return;
      if (e.clientY > 4) return;
      abrir();
    });
  } else {
    let disparou = false;
    const porScroll = ()=>{
      if (!armado || aberto || disparou) return;
      const h = document.documentElement;
      const pct = (h.scrollTop + window.innerHeight) / h.scrollHeight;
      if (pct >= 0.72){ disparou = true; abrir(); }
    };
    window.addEventListener('scroll', porScroll, {passive:true});
    setTimeout(()=>{ if(armado && !aberto && !disparou){ disparou = true; abrir(); } }, 45000);
  }
})();
