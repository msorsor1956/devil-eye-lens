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
  let paypalReady = false;
  let venmoLoaded = false;
  let checkoutError = '';
  function restoreCheckout() {
    if (!dialog.open) dialog.showModal();
    document.body.classList.add('dialog-open');
  }
  const venmoButton = $('#venmo-checkout');
  const status = $('#checkout-status');
  async function paymentRequest(action, body) {
    const response = await fetch('/api/paypal/' + action, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Payment is temporarily unavailable.');
    return data;
  }
  fetch('/api/paypal/health').then(r=>r.json()).then(data=>{paypalReady = data.ready === true;}).catch(()=>{});
  venmoButton.addEventListener('click', async()=>{
    if (!validQuantity()) return;
    if (venmoLoaded) { $('#venmo-buttons').hidden = false; return; }
    venmoButton.disabled = true;
    status.textContent = 'Checking Venmo availability…';
    try {
      const response = await fetch('/api/paypal/config');
      const config = await response.json();
      if (!response.ok || !config.clientId) throw new Error('Venmo is temporarily unavailable while our payment connection is being completed. Please contact support@nighteyes.pro.');
      if (!window.paypal) await new Promise((resolve,reject)=>{
        const script=document.createElement('script');
        script.src='https://www.paypal.com/sdk/js?'+new URLSearchParams({'client-id':config.clientId,currency:'USD',intent:'capture',components:'buttons','enable-funding':'venmo'});
        script.onload=resolve;script.onerror=()=>{script.remove();reject(new Error('Unable to load Venmo. Please try again.'));};document.head.append(script);
      });
      const buttons = window.paypal.Buttons({
        fundingSource: window.paypal.FUNDING.VENMO,
        // Native modal dialogs occupy the browser top layer above SDK overlays.
        onClick:()=>{dialog.close();document.body.classList.remove('dialog-open');},
        style:{layout:'vertical',height:48,shape:'rect'},
        createOrder:async()=>{
          checkoutError = '';
          try {
            const result=await paymentRequest('create',{kit:kit.value.startsWith('Single')?'single':'twin',color:colors[selectedColor].key,quantity:Number(quantity.value),flow:'venmo'});
            return result.id;
          } catch(error) { checkoutError=error.message; status.textContent=checkoutError; throw error; }
        },
        onApprove:async data=>{
          restoreCheckout();
          status.textContent='Confirming your Venmo payment…';
          try {
            const result=await paymentRequest('capture',{orderID:data.orderID});
            status.textContent=result.status==='paid'?'Payment received. Thank you! Order reference: '+result.reference:'Payment status: '+result.status+'. Contact support with order reference '+result.reference+' before paying again.';
            $('#venmo-buttons').hidden=true;venmoButton.disabled=true;
          } catch(error) {status.textContent=error.message;}
        },
        onCancel:()=>{restoreCheckout();status.textContent='Venmo checkout cancelled. You can try again when ready.';},
        onError:()=>{restoreCheckout();status.textContent=checkoutError || 'Venmo could not complete checkout. If you approved a payment, contact support before trying again.';}
      });
      if (!buttons.isEligible()) throw new Error('Venmo is not available for this device or account. Venmo checkout is available to eligible US customers.');
      $('#venmo-buttons').hidden=false;
      await buttons.render('#venmo-buttons');
      venmoLoaded=true;
      status.textContent='Continue with the secure Venmo button below. Your kit and $9.99 shipping are included.';
    } catch(error) {status.textContent=error.message;}
    finally {venmoButton.disabled=false;}
  });
  const enabled=0;
  [['#stripe-checkout','Card checkout is not available yet.'],['#cashapp-checkout','Cash App checkout is not available yet.']].forEach(([id,message])=>{
    $(id).addEventListener('click',()=>{status.textContent=message+' Please contact support@nighteyes.pro.';});
  });
  const money=cents=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100);
  function updatePrice(){
    const unit=config.prices?.[({'Single projector / 55 cm cable':'single','Twin projector / 100 cm cable':'twin'})[kit.value]];
    if(!Number.isInteger(unit))return;
    $('#product-price').textContent=money(unit)+' USD + '+money(config.shipping)+' shipping';
    $('#checkout-price').textContent=money(unit*(validQuantity()?Number(quantity.value):1)+config.shipping)+' before tax';
  }
  [kit,quantity].forEach(el=>el.addEventListener('change',updatePrice));
  quantity.addEventListener('input',updatePrice);
  updatePrice();
  if(enabled){$('#availability-note').textContent='Review the order details and total with the payment provider before paying.';$('#ordering-answer').textContent='A payment option is available. Verify the color, kit, quantity, shipping and return terms with the payment provider before paying.';}
  $$('[data-open-checkout]').forEach(b=>b.addEventListener('click',()=>{
    quantity.setCustomValidity(validQuantity()?'':'Enter a whole number from 1 to 10.');if(!quantity.reportValidity())return;
    const saved=save();$('#checkout-variant').textContent=selectedColor;$('#checkout-kit').textContent=kit.options[kit.selectedIndex].text;$('#checkout-quantity').textContent=`Quantity ${quantity.value}`;
    $('#checkout-status').textContent=paypalReady?'Choose Venmo to check availability for your device and account. Your kit and $9.99 shipping carry into checkout.':enabled?'Verify your kit, color, quantity and total on the payment page. Your selection is not automatically transferred.':`Online ordering is not available yet. ${saved?'Your kit is saved on this device.':$('#remember-kit').checked?'Your selection remains on this page; browser storage is unavailable.':'Your selection is not saved on this device.'}`;
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
