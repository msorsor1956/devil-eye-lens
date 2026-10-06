(() => {
  const params = new URLSearchParams(location.search);
  const status = document.querySelector('#payment-status');
  const button = document.querySelector('#complete-payment');
  const orderID = params.get('token');
  history.replaceState(null, '', location.pathname);
  async function request(action) {
    const response = await fetch('/api/paypal/' + action, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({orderID})});
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to confirm this order. Contact support.');
    return data;
  }
  function result(data) {
    document.querySelector('#payment-reference').textContent = 'Order reference: ' + data.reference;
    if (data.status === 'paid') {
      document.querySelector('#payment-title').textContent = 'Payment received';
      status.textContent = 'Thank you. Your payment is confirmed. Keep your order reference for support.';
      button.hidden = true;
      return true;
    }
    if (['pending','refunded','partially_refunded','reversed','refund_review'].includes(data.status)) {
      status.textContent = data.status === 'pending' ? 'Your payment is pending with PayPal. Do not pay again. Contact support with your order reference for an update.' : 'This payment needs review. Contact support with your order reference.';
      button.hidden = true;
      return true;
    }
    return false;
  }
  if (params.has('cancelled')) { status.textContent = 'Checkout cancelled. No payment was completed through this page.'; return; }
  if (!orderID) { status.textContent = 'No order was found. Start checkout from your kit selection.'; return; }
  request('review').then(data=>{
    if (result(data)) return;
    status.textContent = `${data.quantity} × ${data.kit} projector · ${data.color} · Total $${data.total} USD including $9.99 shipping. Complete your payment below. We ship to the USA and Canada only.`;
    button.textContent = `Pay $${data.total} USD`;
    button.hidden = false;
  }).catch(error=>{status.textContent=error.message;});
  button.addEventListener('click', async()=>{
    button.disabled = true;
    status.textContent = 'Confirming your payment…';
    try {
      const data = await request('capture');
      if (!result(data)) status.textContent = 'Payment is not yet confirmed. Contact support before trying another checkout.';
    } catch(error) { status.textContent = error.message; button.disabled = false; }
  });
})();
