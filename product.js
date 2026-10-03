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
  const kit = $('#kit'), quantity = $('#quantity'), dialog = $('#checkout-dialog');
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
    $('#checkout-image').src = colors[color].image;
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
  $$('[data-image]').forEach(b=>{
    b.setAttribute('aria-pressed',String(b.classList.contains('is-selected')));
    b.addEventListener('click',()=>{ $$('[data-image]').forEach(item=>{const active=item===b;item.classList.toggle('is-selected',active);item.setAttribute('aria-pressed',String(active));});$('#product-main-image').src=b.dataset.image;$('#product-main-image').alt=b.dataset.alt;});
  });
  $$('[data-color]').forEach(b=>b.addEventListener('click',()=>{selectColor(b.dataset.color);save();}));
  $$('[data-preview]').forEach(b=>b.addEventListener('click',()=>{const color=Object.keys(colors).find(c=>colors[c].key===b.dataset.preview);selectColor(color);save();}));
  $('#remember-kit').addEventListener('change',()=>{if($('#remember-kit').checked)save();else try{localStorage.removeItem('devil-eye-kit');}catch{}});
  [kit,quantity].forEach(el=>el.addEventListener('change',save));
  quantity.addEventListener('input',()=>quantity.setCustomValidity(''));
  let enabled=0;
  [['#stripe-checkout',config.stripePaymentLink,'buy.stripe.com'],['#cashapp-checkout',config.cashAppUrl,'cash.app']].forEach(([id,url,host])=>{
    const a=$(id);let valid=false;
    try {const u=new URL(url);valid=u.protocol==='https:'&&u.hostname===host&&!u.username&&!u.password&&config.allowUnlinkedCheckout===true;}catch{}
    if(valid){a.href=url;a.removeAttribute('aria-disabled');a.target='_blank';a.rel='noopener noreferrer';enabled++;}
    else {a.removeAttribute('href');a.setAttribute('aria-disabled','true');a.setAttribute('role','link');}
  });
  const price=enabled && config.price && config.price!=='Price confirmed at checkout' ? config.price : enabled ? 'Confirm price at checkout' : 'Pricing coming soon';
  $$('#product-price, #checkout-price').forEach(n=>n.textContent=price);
  if(enabled){$('#availability-note').textContent='Review the order details and total with the payment provider before paying.';$('#ordering-answer').textContent='A payment option is available. Verify the color, kit, quantity, shipping and return terms with the payment provider before paying.';}
  $$('[data-open-checkout]').forEach(b=>b.addEventListener('click',()=>{
    quantity.setCustomValidity(validQuantity()?'':'Enter a whole number from 1 to 10.');if(!quantity.reportValidity())return;
    const saved=save();$('#checkout-variant').textContent=selectedColor;$('#checkout-kit').textContent=kit.options[kit.selectedIndex].text;$('#checkout-quantity').textContent=`Quantity ${quantity.value}`;
    $('#checkout-status').textContent=enabled?'Verify your kit, color, quantity and total on the payment page. Your selection is not automatically transferred.':`Online ordering is not available yet. ${saved?'Your kit is saved on this device.':$('#remember-kit').checked?'Your selection remains on this page; browser storage is unavailable.':'Your selection is not saved on this device.'}`;
    dialog.showModal();document.body.classList.add('dialog-open');
  }));
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
