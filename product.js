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
  const incoming=new URLSearchParams(location.search);
  if(incoming.get('checkout')==='1') {
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
  let paypalReady = false;
  let sdkPromise;
  const status = $('#checkout-status');
  function restoreCheckout() {if(!dialog.open)dialog.showModal();document.body.classList.add('dialog-open');}
  function releaseCheckout() {dialog.close();document.body.classList.remove('dialog-open');}
  const selection=()=>({kit:kit.value.startsWith('Single')?'single':'twin',color:colors[selectedColor].key,quantity:Number(quantity.value)});
  async function paymentRequest(action,body) {
    const response=await fetch('/api/paypal/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const data=await response.json();if(!response.ok)throw new Error(data.error||'Payment is temporarily unavailable.');return data;
  }
  function loadScript(src) {return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=()=>{script.remove();reject(new Error('Unable to load the payment service. Please try again.'));};document.head.append(script);});}
  function loadPayPal() {
    if(!sdkPromise)sdkPromise=(async()=>{const response=await fetch('/api/paypal/config');const data=await response.json();if(!response.ok||!data.clientId)throw new Error('Payment connection temporarily unavailable.');await loadScript('https://www.paypal.com/sdk/js?'+new URLSearchParams({'client-id':data.clientId,currency:'USD',intent:'capture',components:'buttons,applepay,googlepay','enable-funding':'venmo'}));})().catch(e=>{sdkPromise=null;throw e;});return sdkPromise;
  }
  function showResult(result) {restoreCheckout();status.textContent=result.status==='paid'?'Payment received. Thank you! Order reference: '+result.reference:'Payment status: '+result.status+'. Contact support with reference '+result.reference+' before paying again.';$$('.provider-buttons').forEach(e=>e.hidden=true);}
  fetch('/api/paypal/health').then(r=>r.json()).then(d=>{paypalReady=d.ready===true;}).catch(()=>{});
  for(const method of ['venmo','card']) {
    const button=$('#'+method+'-checkout'),container=$('#'+method+'-buttons');let rendered=false;
    button.addEventListener('click',async()=>{
      if(!validQuantity())return;if(rendered){container.hidden=false;return;}button.disabled=true;status.textContent='Checking '+method+' availability…';
      let errorMessage='';
      try {await loadPayPal();const buttons=paypal.Buttons({fundingSource:method==='venmo'?paypal.FUNDING.VENMO:paypal.FUNDING.CARD,style:{layout:'vertical',height:40,shape:'rect'},onClick:()=>{if(method==='venmo')releaseCheckout();},
        createOrder:async()=>{errorMessage='';try{return (await paymentRequest('create',{...selection(),flow:method})).id;}catch(e){errorMessage=e.message;throw e;}},
        onApprove:async data=>{try{showResult(await paymentRequest('capture',{orderID:data.orderID}));}catch(e){restoreCheckout();status.textContent=e.message;}},
        onCancel:()=>{restoreCheckout();status.textContent='Checkout cancelled. You can try again when ready.';},
        onError:()=>{restoreCheckout();status.textContent=errorMessage||'Checkout could not be completed. If you approved payment, contact support before paying again.';}});
        if(!buttons.isEligible())throw new Error(method==='venmo'?'Venmo is unavailable for this device or account. Try another payment method.':'PayPal card checkout is unavailable for this device or account.');
        container.hidden=false;await buttons.render(container);rendered=true;status.textContent='Continue with the secure payment button below.';
      }catch(e){status.textContent=e.message;}finally{button.disabled=false;}
    });
  }
  function shipping(name,lines,city,state,postal,country){return {name:{full_name:name},address:{address_line_1:lines[0]||'',address_line_2:lines.slice(1).join(' '),admin_area_2:city,admin_area_1:state,postal_code:postal,country_code:country.toUpperCase()}};}
  $('#applepay-checkout').addEventListener('click',async()=>{
    const container=$('#applepay-buttons');if(container.childElementCount){container.hidden=false;return;}
    status.textContent='Checking Apple Pay availability…';
    try {
      await loadPayPal();await loadScript('https://applepay.cdn-apple.com/jsapi/1.latest/apple-pay-sdk.js');
      const apple=paypal.Applepay(),settings=await apple.config();
      if(!settings.isEligible||!window.ApplePaySession||!ApplePaySession.canMakePayments())throw new Error('Apple Pay is not available for this device or merchant yet. Choose Venmo or card.');
      const button=document.createElement('apple-pay-button');button.setAttribute('buttonstyle','black');button.setAttribute('type','buy');button.setAttribute('locale','en-US');
      button.addEventListener('click',()=>{
        if(!validQuantity())return;const cart=selection(),amount=((config.prices[cart.kit]*cart.quantity+config.shipping)/100).toFixed(2);
        const session=new ApplePaySession(4,{countryCode:settings.countryCode,merchantCapabilities:settings.merchantCapabilities,supportedNetworks:settings.supportedNetworks,currencyCode:'USD',requiredShippingContactFields:['name','email','postalAddress'],requiredBillingContactFields:['postalAddress'],total:{label:'Night Eyes',type:'final',amount}});
        releaseCheckout();
        session.onvalidatemerchant=async event=>{try{const result=await apple.validateMerchant({validationUrl:event.validationURL,displayName:'Night Eyes'});session.completeMerchantValidation(result.merchantSession);}catch(e){session.abort();restoreCheckout();status.textContent='Apple Pay domain verification is not complete. Please use another payment method.';}};
        session.oncancel=()=>{restoreCheckout();status.textContent='Apple Pay cancelled.';};
        session.onpaymentauthorized=async event=>{
          try{const c=event.payment.shippingContact;const order=await paymentRequest('create',{...cart,flow:'applepay',shipping:shipping([c.givenName,c.familyName].filter(Boolean).join(' '),c.addressLines,c.locality,c.administrativeArea,c.postalCode,c.countryCode)});
            await apple.confirmOrder({orderId:order.id,token:event.payment.token,billingContact:event.payment.billingContact});
            const result=await paymentRequest('capture',{orderID:order.id});session.completePayment(ApplePaySession.STATUS_SUCCESS);showResult(result);
          }catch(e){session.completePayment(ApplePaySession.STATUS_FAILURE);restoreCheckout();status.textContent=e.message;}
        };session.begin();
      });container.append(button);container.hidden=false;status.textContent='Continue using Apple Pay below.';
    }catch(e){status.textContent=e.message;}
  });
  $('#googlepay-checkout').addEventListener('click',async()=>{
    const container=$('#googlepay-buttons');if(container.childElementCount){container.hidden=false;return;}
    status.textContent='Checking Google Pay availability…';
    try{
      await loadPayPal();await loadScript('https://pay.google.com/gp/p/js/pay.js');const gateway=paypal.Googlepay(),settings=await gateway.config();let cart;
      if(settings.isEligible===false)throw new Error('Google Pay is not available for this merchant yet. Choose another method.');
      const client=new google.payments.api.PaymentsClient({environment:'PRODUCTION',paymentDataCallbacks:{onPaymentAuthorized:async data=>{
        try{const c=data.shippingAddress;const order=await paymentRequest('create',{...cart,flow:'googlepay',shipping:shipping(c.name,[c.address1,c.address2,c.address3].filter(Boolean),c.locality,c.administrativeArea,c.postalCode,c.countryCode)});
          const confirmation=await gateway.confirmOrder({orderId:order.id,paymentMethodData:data.paymentMethodData});
          if(confirmation.status==='PAYER_ACTION_REQUIRED')await gateway.initiatePayerAction({orderId:order.id});
          const result=await paymentRequest('capture',{orderID:order.id});showResult(result);return {transactionState:'SUCCESS'};
        }catch(e){return {transactionState:'ERROR',error:{intent:'PAYMENT_AUTHORIZATION',message:e.message}};}
      }}});
      const base={apiVersion:2,apiVersionMinor:0,allowedPaymentMethods:settings.allowedPaymentMethods};
      if(!(await client.isReadyToPay(base)).result)throw new Error('Google Pay is not available on this device. Choose another method.');
      container.append(client.createButton({buttonType:'pay',onClick:()=>{if(!validQuantity())return;cart=selection();releaseCheckout();client.loadPaymentData({...base,merchantInfo:settings.merchantInfo,callbackIntents:['PAYMENT_AUTHORIZATION'],emailRequired:true,shippingAddressRequired:true,shippingAddressParameters:{allowedCountryCodes:['US','CA']},transactionInfo:{currencyCode:'USD',countryCode:'US',totalPriceStatus:'FINAL',totalPrice:((config.prices[cart.kit]*cart.quantity+config.shipping)/100).toFixed(2)}}).catch(()=>{restoreCheckout();status.textContent='Google Pay was cancelled or unavailable. If you approved payment, contact support before paying again.';});},allowedPaymentMethods:settings.allowedPaymentMethods}));
      container.hidden=false;status.textContent='Continue using Google Pay below.';
    }catch(e){status.textContent='Google Pay is unavailable: '+e.message;}
  });
  const cashButton=$('#cashapp-checkout');
  if (window.self !== window.top) {
    const external=document.createElement('a');external.className='pay-button pay-button--venmo';external.textContent='Open secure checkout in a new tab ↗';external.target='_blank';external.rel='noopener noreferrer';
    const updateExternal=()=>{const cart=selection();external.href='https://www.nighteyes.pro/?'+new URLSearchParams({checkout:'1',kit:cart.kit,color:cart.color,quantity:String(cart.quantity)})+'#series';};
    updateExternal();[kit,quantity].forEach(e=>e.addEventListener('change',updateExternal));$$('[data-color],[data-preview]').forEach(e=>e.addEventListener('click',updateExternal));
    $('.payment-methods').replaceChildren(external);
    status.textContent='For secure payment, open checkout in a separate browser tab.';
  }
  const enabled=0;
  cashButton.addEventListener('click',()=>{status.textContent='Cash App checkout is not available yet. Please use another payment option.';});
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
