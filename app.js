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
        if(redirect){ window.location.href=redirect; return; }
        form.innerHTML='<p style="color:var(--green);font-weight:600">Pronto! Você está inscrito. ✅</p>';
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
