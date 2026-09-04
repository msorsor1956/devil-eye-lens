(() => {
  const config = window.DEVIL_EYE_CHECKOUT || {};
  const mainImage = document.querySelector("#product-main-image");
  const thumbs = [...document.querySelectorAll("[data-image]")];
  const swatches = [...document.querySelectorAll("[data-color]")];
  const colorOutput = document.querySelector("#selected-color");
  const kit = document.querySelector("#kit");
  const quantity = document.querySelector("#quantity");
  const dialog = document.querySelector("#checkout-dialog");
  const openers = [...document.querySelectorAll("[data-open-checkout]")];
  const priceNodes = [document.querySelector("#product-price"), document.querySelector("#checkout-price")];
  let selectedColor = "Electric blue";

  priceNodes.forEach((node) => { if (node) node.textContent = config.price || "Price confirmed at checkout"; });

  thumbs.forEach((button) => button.addEventListener("click", () => {
    thumbs.forEach((item) => item.classList.remove("is-selected"));
    button.classList.add("is-selected");
    mainImage.src = button.dataset.image;
    mainImage.alt = button.dataset.alt;
  }));

  swatches.forEach((button) => button.addEventListener("click", () => {
    selectedColor = button.dataset.color;
    colorOutput.textContent = selectedColor;
    swatches.forEach((item) => {
      const active = item === button;
      item.classList.toggle("is-selected", active);
      item.setAttribute("aria-pressed", String(active));
    });
    const visual = selectedColor.includes("green")
      ? "assets/sections/devil-eye-green.webp"
      : selectedColor.includes("purple")
        ? "assets/sections/devil-eye-purple.webp"
        : selectedColor.includes("red")
          ? "assets/product/single-kit.webp"
          : "assets/sections/devil-eye-blue.webp";
    document.querySelector("#checkout-image").src = visual;
  }));

  const configurePayment = (id, url) => {
    const link = document.querySelector(id);
    if (!link || !url) return;
    link.href = url;
    link.removeAttribute("aria-disabled");
    link.target = "_blank";
    link.rel = "noopener";
  };
  configurePayment("#stripe-checkout", config.stripePaymentLink);
  configurePayment("#cashapp-checkout", config.cashAppUrl);

  const configuredMethods = [config.stripePaymentLink, config.cashAppUrl].filter(Boolean).length;
  if (configuredMethods) {
    document.querySelector("#checkout-status").textContent = configuredMethods === 2
      ? "Choose a secure payment method to continue."
      : "One secure payment method is available; the second is still being configured.";
  }

  document.querySelectorAll('[aria-disabled="true"]').forEach((link) => link.addEventListener("click", (event) => event.preventDefault()));

  openers.forEach((button) => button.addEventListener("click", () => {
    document.querySelector("#checkout-variant").textContent = selectedColor;
    document.querySelector("#checkout-kit").textContent = kit.options[kit.selectedIndex].text;
    document.querySelector("#checkout-quantity").textContent = `Quantity ${quantity.value}`;
    dialog.showModal();
  }));

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
})();
