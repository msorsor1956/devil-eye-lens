// Public display settings only. Never put API keys in this file.
// Generic payment links do not receive the configured kit. Keep disabled until
// server-created Checkout Sessions and verified fulfillment are implemented.
window.DEVIL_EYE_CHECKOUT = {
  prices: { single: 3000, twin: 3500 },
  shipping: 999,
  currency: "USD",
  supportEmail: "support@nighteyes.pro",
  stripePaymentLink: "",
  cashAppUrl: "",
  allowUnlinkedCheckout: false
};
