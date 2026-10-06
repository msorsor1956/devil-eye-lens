(() => {
  const hero=document.querySelector('.campaign-hero'),motion=document.querySelector('#campaign-motion');
  if(!hero||!motion)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');let paused=reduced.matches,inView=true;
  function sync(){hero.classList.toggle('is-paused',paused||document.hidden||!inView);motion.disabled=reduced.matches;motion.textContent=reduced.matches?'Motion reduced':paused?'Play atmosphere':'Pause atmosphere';motion.setAttribute('aria-pressed',String(paused));}
  motion.addEventListener('click',()=>{paused=!paused;sync();});
  reduced.addEventListener('change',()=>{paused=reduced.matches;sync();});document.addEventListener('visibilitychange',sync);sync();
  new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;sync();},{threshold:.05}).observe(hero);
  const saved=document.querySelector('#saved-look'),status=document.querySelector('#look-status'),remember=document.querySelector('#remember-kit');
  function savedState(){try{const value=JSON.parse(localStorage.getItem('devil-eye-kit')||'null');saved.hidden=!(value&&['Electric blue','Acid green','Ultraviolet purple','Signal red'].includes(value.color));}catch{saved.hidden=true;}}
  document.querySelector('#save-look').addEventListener('click',()=>{
    const quantity=document.querySelector('#quantity');if(!quantity.reportValidity())return;
    remember.checked=true;remember.dispatchEvent(new Event('change'));savedState();
    status.textContent=saved.hidden?'Your browser could not save this look. Copy its link instead.':'Your look is saved on this device. Come back and pick up where you left off.';
  });
  remember.addEventListener('change',()=>queueMicrotask(savedState));
  document.querySelector('#share-look').addEventListener('click',async()=>{
    const quantity=document.querySelector('#quantity');if(!quantity.reportValidity())return;
    const colors={'Electric blue':'blue','Acid green':'green','Ultraviolet purple':'purple','Signal red':'red'};
    const selected=document.querySelector('#selected-color').textContent.trim();
    const url=new URL('/',location.origin);url.search=new URLSearchParams({look:'1',kit:document.querySelector('#kit').value.startsWith('Single')?'single':'twin',color:colors[selected]||'blue',quantity:quantity.value});url.hash='series';
    try{await navigator.clipboard.writeText(url.href);status.textContent='Look link copied. Save it or share it with someone who knows your build.';}
    catch{status.replaceChildren(document.createTextNode('Your look link: '));const link=document.createElement('a');link.href=url.href;link.textContent='Open your selected kit ↗';status.append(link);}
  });
  savedState();
})();
