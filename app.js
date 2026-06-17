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
        body:JSON.stringify({email,material,origem:(location.pathname+location.search)})
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
    ifr.title='Depoimento em vídeo';
    ifr.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    ifr.allowFullscreen=true;
    btn.replaceWith(ifr);
  });
});
