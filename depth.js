(() => {
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const stages=[...document.querySelectorAll('.section-heading,.product-gallery,.purchase-panel,.product-cinema,.construction-copy,.construction-visual,.fitment-guide,.questions-section,.closing-section')];
 const reveal=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('depth-visible');reveal.unobserve(entry.target);}}),{threshold:.08});
 stages.forEach(el=>{el.classList.add('depth-stage');reveal.observe(el);});
 const fine=matchMedia('(hover:hover) and (pointer:fine)');
 for(const card of document.querySelectorAll('.product-gallery__stage,.preview-panel,.product-ribbon>div')){
  let frame=0;
  card.classList.add('depth-card');
  card.addEventListener('pointermove',e=>{
   if(reduced.matches||!fine.matches)return;
   cancelAnimationFrame(frame);
   const r=card.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
   frame=requestAnimationFrame(()=>{card.style.transform=`perspective(1000px) rotateX(${-y*7}deg) rotateY(${x*7}deg)`;});
  });
  card.addEventListener('pointerleave',()=>{cancelAnimationFrame(frame);card.style.transform='';});
 }
 document.addEventListener('focusin',e=>e.target.closest('.depth-stage')?.classList.add('depth-visible'));
 reduced.addEventListener('change',()=>{if(reduced.matches)stages.forEach(el=>el.classList.add('depth-visible'));});
})();
