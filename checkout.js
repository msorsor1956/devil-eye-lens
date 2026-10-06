(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const form = $('#checkout-form'), status = $('#payment-status'), provider = $('#provider-buttons');
  const methods = [...document.querySelectorAll('[data-method]')];
  const inputs = [...form.elements, $('#order-kit'), $('#order-color'), $('#order-quantity')];
  const money = cents => new Intl.NumberFormat('en-US', {style:'currency',currency:'USD'}).format(cents / 100);
  const prices = {single:3000,twin:3500};
  const variants = {blue:['Electric blue','assets/sections/devil-eye-blue.webp'],green:['Acid green','assets/sections/devil-eye-green.webp'],purple:['Ultraviolet purple','assets/sections/devil-eye-purple.webp'],red:['Signal red','assets/product/lighting-effects.webp']};
  const regions = {
    US:'AL:Alabama|AK:Alaska|AZ:Arizona|AR:Arkansas|CA:California|CO:Colorado|CT:Connecticut|DE:Delaware|DC:District of Columbia|FL:Florida|GA:Georgia|HI:Hawaii|ID:Idaho|IL:Illinois|IN:Indiana|IA:Iowa|KS:Kansas|KY:Kentucky|LA:Louisiana|ME:Maine|MD:Maryland|MA:Massachusetts|MI:Michigan|MN:Minnesota|MS:Mississippi|MO:Missouri|MT:Montana|NE:Nebraska|NV:Nevada|NH:New Hampshire|NJ:New Jersey|NM:New Mexico|NY:New York|NC:North Carolina|ND:North Dakota|OH:Ohio|OK:Oklahoma|OR:Oregon|PA:Pennsylvania|RI:Rhode Island|SC:South Carolina|SD:South Dakota|TN:Tennessee|TX:Texas|UT:Utah|VT:Vermont|VA:Virginia|WA:Washington|WV:West Virginia|WI:Wisconsin|WY:Wyoming',
    CA:'AB:Alberta|BC:British Columbia|MB:Manitoba|NB:New Brunswick|NL:Newfoundland and Labrador|NS:Nova Scotia|NT:Northwest Territories|NU:Nunavut|ON:Ontario|PE:Prince Edward Island|QC:Quebec|SK:Saskatchewan|YT:Yukon'
  };
  let quote = null, revision = 0, busy = false, completed = false, activeOrder = null, sdkPromise, nativeButtons, expiryTimer;
  const embedded = window.self !== window.top;
  const selection = () => ({kit:$('#order-kit').value,color:$('#order-color').value,quantity:Number($('#order-quantity').value)});
  const customer = () => Object.fromEntries(new FormData(form));
  const params = new URLSearchParams(location.search);
  if (Object.hasOwn(prices,params.get('kit'))) $('#order-kit').value=params.get('kit');
  if (Object.hasOwn(variants,params.get('color'))) $('#order-color').value=params.get('color');
  if (/^(?:[1-9]|10)$/.test(params.get('quantity') || '')) $('#order-quantity').value=params.get('quantity');
  function regionOptions() {
    const country=form.elements.country.value, select=form.elements.state;
    select.replaceChildren(new Option(country==='CA'?'Choose province / territory':'Choose state',''));
    regions[country].split('|').forEach(pair=>{const [value,label]=pair.split(':');select.add(new Option(label,value));});
    $('#region-label').textContent=country==='CA'?'Province / territory':'State';
    $('#postal-label').textContent=country==='CA'?'Postal code':'ZIP code';
    form.elements.postal.pattern=country==='CA'?'[A-Za-z][0-9][A-Za-z] ?[0-9][A-Za-z][0-9]':'[0-9]{5}(-[0-9]{4})?';
    form.elements.postal.inputMode=country==='CA'?'text':'numeric';
    $('#canada-notice').hidden=country!=='CA';
  }
  function drawSummary() {
    const cart=selection(), variant=variants[cart.color];
    $('#order-image').src=variant[1];$('#order-image').alt=variant[0]+' Devil’s Eye projector';
    $('#kit-specs').textContent=(cart.kit==='single'?'55':'100')+' cm cable · Remote included · 12V';
    $('#subtotal').textContent=money(quote?.subtotal ?? prices[cart.kit]*cart.quantity);
    $('#shipping-total').textContent=money(quote?.shipping ?? 999);
    $('#tax-total').textContent=quote?money(quote.tax):'Enter address';
    $('#grand-total').textContent=money(quote?.total ?? prices[cart.kit]*cart.quantity+999);
    $('#total-label').textContent=quote?'Total · USD':'Before tax';
    $('#tax-note').textContent=quote?(quote.tax===0?'No sales tax is collected on this order under the store’s current tax settings. Import charges, if applicable, are separate.':'Tax is calculated for your shipping address. This is the amount charged at checkout.'):'The final tax and total appear after your address is reviewed.';
    const query=new URLSearchParams({...cart,quantity:String(cart.quantity)});
    $('#external-checkout').href='https://www.nighteyes.pro/checkout.html?'+query;
  }
  function canPay(){return !embedded && !completed && quote && Date.now()<quote.expires*1000 && $('#accept-terms').checked;}
  function updateButtons(){methods.forEach(button=>button.disabled=busy||!canPay());}
  function lock(value){busy=value;inputs.forEach(input=>input.disabled=value||completed);$('#accept-terms').disabled=value||completed;$('#edit-details').disabled=value||completed;updateButtons();}
  function clearProvider(){if(nativeButtons){Promise.resolve(nativeButtons.close()).catch(()=>{});nativeButtons=null;}provider.replaceChildren();provider.hidden=true;}
  function invalidate() {
    revision++;quote=null;clearTimeout(expiryTimer);clearProvider();$('#delivery-review').hidden=true;$('#accept-terms').checked=false;
    $('#quote-status').textContent='Details changed. Review your total again before paying.';$('#quote-status').classList.remove('is-error');
    status.textContent='Calculate your total and accept the terms to unlock secure payment options.';drawSummary();updateButtons();
  }
  form.addEventListener('input',()=>{if(!busy)invalidate();});
  form.elements.country.addEventListener('change',()=>{regionOptions();invalidate();});
  for(const id of ['order-kit','order-color','order-quantity'])$('#'+id).addEventListener('change',invalidate);
  $('#accept-terms').addEventListener('change',()=>{if(!$('#accept-terms').checked)clearProvider();updateButtons();status.textContent=canPay()?'Choose a payment method below. Your reviewed total is '+money(quote.total)+' USD.':'Review your total and accept the terms before paying.';});
  $('#edit-details').addEventListener('click',()=>{invalidate();form.elements.firstName.focus();form.scrollIntoView({behavior:'auto',block:'start'});});
  async function request(action,body){
    const response=await fetch('/api/paypal/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    let data;try{data=await response.json();}catch{throw new Error('The checkout service could not be reached. Please try again.');}
    if(!response.ok)throw new Error(data.error||'Checkout is temporarily unavailable.');return data;
  }
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(busy||completed||!form.reportValidity())return;
    const payload={...selection(),customer:customer()};invalidate();lock(true);
    $('#quote-status').textContent='Calculating shipping and tax…';
    try{
      quote=await request('quote',payload);activeOrder=null;
      drawSummary();$('#delivery-review').hidden=false;
      const c=payload.customer;$('#delivery-summary').textContent=[c.firstName+' '+c.lastName,c.email,c.line1,c.line2,[c.city,c.state,c.postal].join(', '),c.country==='CA'?'Canada':'United States'].filter(Boolean).join('\n');
      $('#quote-status').textContent='Total confirmed: '+money(quote.total)+' USD. Review the terms and choose your payment method.';
      status.textContent='Your total is ready. Review and accept the terms to continue.';
      expiryTimer=setTimeout(()=>{if(!busy&&!completed){invalidate();$('#quote-status').textContent='Your total expired. Calculate it again to continue.';}},Math.max(0,quote.expires*1000-Date.now()));
      $('#accept-terms').focus();
    }catch(error){quote=null;$('#quote-status').textContent=error.message;$('#quote-status').classList.add('is-error');}
    finally{lock(false);if(quote)$('#accept-terms').focus();}
  });
  const scriptLoads=new Map();
  function loadScript(src){if(!scriptLoads.has(src))scriptLoads.set(src,new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=()=>{script.remove();scriptLoads.delete(src);reject(new Error('Payment service did not load. Check your connection and try again.'));};document.head.append(script);}));return scriptLoads.get(src);}
  function loadPayPal(){
    if(!sdkPromise)sdkPromise=(async()=>{const response=await fetch('/api/paypal/config');const data=await response.json();if(!response.ok||!data.clientId)throw new Error('Payment service is temporarily unavailable.');await loadScript('https://www.paypal.com/sdk/js?'+new URLSearchParams({'client-id':data.clientId,currency:'USD',intent:'capture',components:'buttons,applepay,googlepay','enable-funding':'venmo'}));})().catch(error=>{sdkPromise=null;throw error;});return sdkPromise;
  }
  async function createOrder(method){
    if(!canPay())throw new Error('Your total expired or terms changed. Review your total again.');
    const data=await request('create',{quoteID:quote.quoteID,flow:method,acceptedTerms:true,policyVersion:quote.policyVersion});activeOrder=data.id;return data.id;
  }
  function result(data){
    completed=true;lock(false);clearProvider();$('.payment-section').hidden=true;$('#order-result').hidden=false;
    $('#result-title').textContent=data.status==='paid'?'Your payment is confirmed.':'Your payment needs an update.';
    $('#result-message').textContent=data.status==='paid'?'Thank you for choosing Night Eyes. Your order and delivery details have been recorded.':'Payment status: '+data.status+'. Please do not pay again. Contact support with your order reference.';
    $('#result-reference').textContent='Order reference: '+data.reference;$('#order-result').focus();
    $('#order-result').scrollIntoView({behavior:'auto',block:'center'});
  }
  async function capture(orderID){result(await request('capture',{orderID}));}
  function recovery(message){
    status.textContent=message+' If you approved payment, do not start another order. Check its status below or contact support.';
    clearProvider();lock(true);
    if(activeOrder){const button=document.createElement('button');button.type='button';button.className='primary-button';button.textContent='Check payment status';button.onclick=async()=>{button.disabled=true;try{const data=await request('review',{orderID:activeOrder});if(['paid','pending','refunded','reversed','partially_refunded','refund_review'].includes(data.status))result(data);else await capture(activeOrder);}catch(error){status.textContent=error.message+' Contact support before paying again.';button.disabled=false;}};provider.append(button);provider.hidden=false;}
  }
  async function standard(method,version){
    const funding={venmo:paypal.FUNDING.VENMO,card:paypal.FUNDING.CARD,paypal:paypal.FUNDING.PAYPAL};
    const buttons=paypal.Buttons({fundingSource:funding[method],style:{layout:'vertical',height:45,shape:'rect'},
      onClick:(_data,actions)=>{if(!canPay()||version!==revision)return actions.reject();lock(true);status.textContent='Complete payment securely with PayPal.';return actions.resolve();},
      createOrder:()=>createOrder(method),onApprove:async data=>{activeOrder=data.orderID;try{await capture(data.orderID);}catch(error){recovery(error.message);}},
      onCancel:()=>{lock(false);status.textContent='Payment cancelled. Your details are still here.';},
      onError:()=>{if(activeOrder)recovery('We could not confirm this payment.');else{lock(false);status.textContent='The payment could not start. Try another method or contact support.';}}
    });
    if(!buttons.isEligible())throw new Error(method==='venmo'?'Venmo is unavailable for this device, location or account. Choose card or PayPal.':'This payment option is unavailable. Try PayPal or another method.');
    if(version!==revision)return;nativeButtons=buttons;provider.hidden=false;await buttons.render(provider);
  }
  async function applePay(version){
    await loadScript('https://applepay.cdn-apple.com/jsapi/1.latest/apple-pay-sdk.js');
    const gateway=paypal.Applepay(),settings=await gateway.config();
    if(!settings.isEligible||!window.ApplePaySession||!ApplePaySession.canMakePayments())throw new Error('Apple Pay is unavailable on this device or for this merchant. Choose card or PayPal.');
    if(version!==revision)return;
    const button=document.createElement('apple-pay-button');button.setAttribute('buttonstyle','black');button.setAttribute('type','buy');button.setAttribute('locale','en-US');
    button.addEventListener('click',()=>{
      if(!canPay()||version!==revision)return;
      let session;
      try{session=new ApplePaySession(4,{countryCode:settings.countryCode,merchantCapabilities:settings.merchantCapabilities,supportedNetworks:settings.supportedNetworks,currencyCode:'USD',requiredBillingContactFields:['postalAddress'],total:{label:'Night Eyes',type:'final',amount:(quote.total/100).toFixed(2)}});}catch{status.textContent='Apple Pay could not start. Choose another payment method.';return;}
      lock(true);
      session.onvalidatemerchant=async event=>{try{const data=await gateway.validateMerchant({validationUrl:event.validationURL,displayName:'Night Eyes'});session.completeMerchantValidation(data.merchantSession);}catch{session.abort();lock(false);status.textContent='Apple Pay is not ready for this website yet. Choose card or PayPal.';}};
      session.oncancel=()=>{lock(false);status.textContent='Apple Pay cancelled. Your details are still here.';};
      session.onpaymentauthorized=async event=>{try{const id=await createOrder('applepay');await gateway.confirmOrder({orderId:id,token:event.payment.token,billingContact:event.payment.billingContact});await capture(id);session.completePayment(ApplePaySession.STATUS_SUCCESS);}catch(error){session.completePayment(ApplePaySession.STATUS_FAILURE);if(activeOrder)recovery(error.message);else{lock(false);status.textContent=error.message;}}};session.begin();
    });provider.append(button);provider.hidden=false;
  }
  async function googlePay(version){
    await loadScript('https://pay.google.com/gp/p/js/pay.js');const gateway=paypal.Googlepay(),settings=await gateway.config();
    if(settings.isEligible===false)throw new Error('Google Pay is unavailable for this merchant. Choose card or PayPal.');
    const client=new google.payments.api.PaymentsClient({environment:'PRODUCTION',paymentDataCallbacks:{onPaymentAuthorized:async data=>{
      try{const id=await createOrder('googlepay');const confirmation=await gateway.confirmOrder({orderId:id,paymentMethodData:data.paymentMethodData});if(confirmation.status==='PAYER_ACTION_REQUIRED')await gateway.initiatePayerAction({orderId:id});await capture(id);return {transactionState:'SUCCESS'};}
      catch(error){if(activeOrder)recovery(error.message);else{lock(false);status.textContent=error.message;}return {transactionState:'ERROR',error:{intent:'PAYMENT_AUTHORIZATION',message:error.message}};}
    }}});
    const base={apiVersion:2,apiVersionMinor:0,allowedPaymentMethods:settings.allowedPaymentMethods};
    if(!(await client.isReadyToPay(base)).result)throw new Error('Google Pay is unavailable on this device. Choose card or PayPal.');
    if(version!==revision)return;
    provider.append(client.createButton({buttonType:'pay',allowedPaymentMethods:settings.allowedPaymentMethods,onClick:()=>{if(!canPay()||version!==revision)return;lock(true);client.loadPaymentData({...base,merchantInfo:settings.merchantInfo,callbackIntents:['PAYMENT_AUTHORIZATION'],transactionInfo:{currencyCode:'USD',countryCode:'US',totalPriceStatus:'FINAL',totalPrice:(quote.total/100).toFixed(2)}}).catch(()=>{if(!completed&&!activeOrder){lock(false);status.textContent='Google Pay was cancelled or unavailable. Your details are still here.';}else if(!completed)recovery('Google Pay has not confirmed the payment.');});}}));provider.hidden=false;
  }
  methods.forEach(button=>button.addEventListener('click',async()=>{
    if(!canPay()||busy)return;const version=revision;clearProvider();lock(true);status.textContent='Checking secure payment availability…';
    try{await loadPayPal();if(version!==revision)return;const method=button.dataset.method;if(['venmo','card','paypal'].includes(method))await standard(method,version);else if(method==='applepay')await applePay(version);else await googlePay(version);status.textContent='Use the secure button below to pay '+money(quote.total)+' USD.';}
    catch(error){status.textContent=error.message;}finally{if(!completed)lock(false);}
  }));
  regionOptions();drawSummary();updateButtons();
  if(embedded){$('#embedded-notice').hidden=false;form.hidden=true;$('.payment-section').hidden=true;}
})();
