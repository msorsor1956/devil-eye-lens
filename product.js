(() => {
  'use strict';
  document.documentElement.classList.remove('no-js');
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const config = window.DEVIL_EYE_CHECKOUT || {};
  const colors = {
    'Electric blue': {key: 'blue', image: 'assets/sections/devil-eye-blue.webp'},
    'Acid green': {key: 'green', image: 'assets/sections/devil-eye-green.webp'},
    'Ultraviolet purple': {key: 'purple', image: 'assets/sections/devil-eye-purple.webp'},
    'Signal red': {key: 'red', image: 'assets/product/lighting-effects.webp'}
  };
  const kit = $('#kit'), quantity = $('#quantity');
  let selectedColor = 'Electric blue', preview = 'blue';
  const validQuantity = () => Number.isInteger(Number(quantity.value)) && Number(quantity.value) >= 1 && Number(quantity.value) <= 10;
  function save() {
    if (!$('#remember-kit').checked || !validQuantity()) return false;
    try { localStorage.setItem('devil-eye-kit', JSON.stringify({color:selectedColor, kit:kit.value, quantity:Number(quantity.value)})); return true; }
    catch { return false; }
  }
  function selectColor(color, gallery = true) {
    if (!colors[color]) return;
    selectedColor = color;
    $('#selected-color').textContent = color;
    $$('[data-color]').forEach(b => {const active=b.dataset.color===color; b.classList.toggle('is-selected',active);b.setAttribute('aria-pressed',String(active));});
    if (gallery) {
      $('#product-main-image').src = colors[color].image;
      $('#product-main-image').alt = color==='Signal red' ? 'Reference showing the available lighting effects including red' : color+' Devil’s Eye projector preview';
      $$('[data-image]').forEach(b => {b.classList.remove('is-selected');b.setAttribute('aria-pressed','false');});
    }
    if (color !== 'Signal red') {
      preview=colors[color].key;
      $('#preview-eye').src=colors[color].image;$('#preview-eye').alt=color+' Devil’s Eye projector';
      $('#preview-name').textContent=color;
      $$('[data-preview]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.preview===preview)));
    }
  }
  try {
    const data=JSON.parse(localStorage.getItem('devil-eye-kit')||'null');
    if(data && colors[data.color]) {$('#remember-kit').checked=true;selectColor(data.color);if([...kit.options].some(o=>o.value===data.kit))kit.value=data.kit;if(Number.isInteger(data.quantity)&&data.quantity>=1&&data.quantity<=10)quantity.value=data.quantity;}
  } catch { /* Storage is optional; browsing remains available. */ }
  const incoming=new URLSearchParams(location.search);
  if(incoming.get('checkout')==='1'||incoming.get('look')==='1') {
    const color=Object.keys(colors).find(name=>colors[name].key===incoming.get('color'));
    if(color)selectColor(color);
    const requested=incoming.get('kit');if(['single','twin'].includes(requested))kit.value=requested==='single'?'Single projector / 55 cm cable':'Twin projector / 100 cm cable';
    const count=Number(incoming.get('quantity'));if(Number.isInteger(count)&&count>=1&&count<=10)quantity.value=count;
  }
  $$('[data-image]').forEach(b=>{
    b.setAttribute('aria-pressed',String(b.classList.contains('is-selected')));
    b.addEventListener('click',()=>{ $$('[data-image]').forEach(item=>{const active=item===b;item.classList.toggle('is-selected',active);item.setAttribute('aria-pressed',String(active));});$('#product-main-image').src=b.dataset.image;$('#product-main-image').alt=b.dataset.alt;});
  });
  $$('[data-color]').forEach(b=>b.addEventListener('click',()=>{selectColor(b.dataset.color);save();}));
  $$('[data-preview]').forEach(b=>b.addEventListener('click',()=>{const color=Object.keys(colors).find(c=>colors[c].key===b.dataset.preview);selectColor(color);save();}));
  $('#remember-kit').addEventListener('change',()=>{if($('#remember-kit').checked)save();else try{localStorage.removeItem('devil-eye-kit');}catch{}});
  [kit,quantity].forEach(el=>el.addEventListener('change',save));
  quantity.addEventListener('input',()=>quantity.setCustomValidity(''));
  const selection=()=>({kit:kit.value.startsWith('Single')?'single':'twin',color:colors[selectedColor].key,quantity:Number(quantity.value)});
  const money=cents=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100);
  function updatePrice(){
    const unit=config.prices?.[({'Single projector / 55 cm cable':'single','Twin projector / 100 cm cable':'twin'})[kit.value]];
    if(!Number.isInteger(unit))return;
    $('#product-price').textContent=money(unit)+' USD + '+money(config.shipping)+' shipping';
  }
  [kit,quantity].forEach(el=>el.addEventListener('change',updatePrice));
  quantity.addEventListener('input',updatePrice);
  updatePrice();
  $$('[data-open-checkout]').forEach(b=>b.addEventListener('click',()=>{
    quantity.setCustomValidity(validQuantity()?'':'Enter a whole number from 1 to 10.');if(!quantity.reportValidity())return;
    save();const cart=selection();const url='/checkout.html?'+new URLSearchParams({...cart,quantity:String(cart.quantity)});
    if(window.self!==window.top)window.open('https://www.nighteyes.pro'+url,'_blank','noopener,noreferrer');
    else location.assign(url);
  }));
  if(incoming.get('checkout')==='1') $('[data-open-checkout]').click();
  $$('dialog').forEach(d=>{d.addEventListener('close',()=>document.body.classList.remove('dialog-open'));d.addEventListener('click',e=>{const r=d.getBoundingClientRect();if(e.target===d&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))d.close();});});
  $('#zoom-product').addEventListener('click',()=>{$('#enlarged-image').src=$('#product-main-image').src;$('#enlarged-image').alt=$('#product-main-image').alt;$('#image-dialog').showModal();document.body.classList.add('dialog-open');});
  $('#preview-blink').addEventListener('click',()=>{
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){$('#preview-name').textContent='Motion reduced by device settings';return;}
    const eye=$('#preview-eye');eye.className='';void eye.offsetWidth;eye.className='blink-'+preview;
  });
  $('#preview-eye').addEventListener('animationend',()=>{$('#preview-eye').className='';});
  const menu=$('#menu-toggle'),nav=$('#mobile-navigation');
  function closeMenu(){nav.hidden=true;menu.setAttribute('aria-expanded','false');menu.textContent='Menu +';}
  menu.addEventListener('click',()=>{const open=nav.hidden;nav.hidden=!open;menu.setAttribute('aria-expanded',String(open));menu.textContent=open?'Close ×':'Menu +';});
  $$('#mobile-navigation a').forEach(a=>a.addEventListener('click',closeMenu));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!nav.hidden){closeMenu();menu.focus();}});
  matchMedia('(min-width: 801px)').addEventListener('change',e=>{if(e.matches)closeMenu();});
})();
