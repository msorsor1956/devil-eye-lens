(() => {
  const root=document.documentElement,colors=['blue','green','purple','red'];
  let theme='dark',mood='auto';
  try{const p=JSON.parse(localStorage.getItem('night-eyes-appearance')||'null');if(p){theme=p.theme==='light'?'light':'dark';mood=colors.includes(p.mood)?p.mood:'auto';}}catch{}
  const panel=document.createElement('details');panel.className='mood-panel';panel.innerHTML='<summary>Site mood <span aria-hidden="true">◐</span></summary><div class="mood-options"><button type="button" id="theme-switch" aria-pressed="false">Light mode</button><label for="site-color-mood">Color mood</label><select id="site-color-mood"><option value="auto">Auto · color cycle</option><option value="blue">Electric blue</option><option value="green">Green snake eyes</option><option value="purple">Ultraviolet purple</option><option value="red">Signal red</option></select><button type="button" class="mood-reset">Reset appearance</button></div>';
  document.body.append(panel);const toggle=panel.querySelector('#theme-switch'),select=panel.querySelector('select');
  function apply(save=false){root.dataset.theme=theme;root.dataset.mood=mood;toggle.textContent=theme==='dark'?'Switch to light':'Switch to dark';toggle.setAttribute('aria-pressed',String(theme==='light'));select.value=mood;document.querySelector('meta[name="color-scheme"]')?.setAttribute('content',theme);if(save)try{localStorage.setItem('night-eyes-appearance',JSON.stringify({theme,mood}));}catch{}}
  toggle.addEventListener('click',()=>{theme=theme==='dark'?'light':'dark';apply(true);});select.addEventListener('change',()=>{mood=select.value;apply(true);});
  panel.querySelector('.mood-reset').addEventListener('click',()=>{try{localStorage.removeItem('night-eyes-appearance');}catch{}theme='dark';mood='auto';apply();});apply();
})();
