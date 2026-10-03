(() => {
 const button=document.querySelector('#load-3d');
 if(!button)return;
 button.addEventListener('click',()=>{
  button.disabled=true;
  document.querySelector('#scene-status').textContent='Loading interactive view…';
  const script=document.createElement('script');
  script.src='assets/scene/showroom.js?v=20261003b';
  script.onload=()=>{button.disabled=false;button.click();};
  script.onerror=()=>{button.hidden=true;document.querySelector('#scene-status').textContent='3D could not load. Product photo is shown.';};
  document.head.append(script);
 },{once:true});
})();
