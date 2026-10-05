(() => {
 const button=document.querySelector('#load-3d'),host=document.querySelector('#spatial-view');
 if(!button||!host)return;
 const motion=document.querySelector('#scene-motion');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let requested=!reduced.matches,visible=true,started=false;
 function sync(){
  const moving=requested&&visible&&!document.hidden;
  host.dataset.moving=String(moving);
  host.classList.toggle('motion-suspended',!moving);
  motion.textContent=requested?'Pause motion':'Play motion';
  motion.setAttribute('aria-pressed',String(requested));
  host.dispatchEvent(new CustomEvent('showroom-motion',{detail:{moving}}));
 }
 motion.addEventListener('click',()=>{requested=!requested;sync();});
 reduced.addEventListener('change',e=>{requested=!e.matches;sync();});
 document.addEventListener('visibilitychange',sync);
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{threshold:.05}).observe(host);
 sync();
 function start(){
  if(started)return;started=true;button.disabled=true;
  document.querySelector('#scene-status').textContent='Opening the 3D showroom…';
  const script=document.createElement('script');script.src='assets/scene/showroom.js?v=20261005';
  script.onload=()=>{button.disabled=false;button.click();};
  script.onerror=()=>{button.hidden=true;document.querySelector('#scene-status').textContent='Product preview · Choose a color below';};
  document.head.append(script);
 }
 button.addEventListener('click',start,{once:true});
 if(!navigator.connection?.saveData){
  const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();start();}},{rootMargin:'100px'});observer.observe(host);
 }
})();
