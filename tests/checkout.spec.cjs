const {test,expect}=require('@playwright/test');
test('checkout validates, displays server tax, and invalidates changed details',async({page})=>{
  await page.route('**/api/paypal/quote',route=>route.fulfill({json:{quoteID:'NQ-test',subtotal:7000,shipping:999,tax:560,total:8559,expires:Math.floor(Date.now()/1000)+900,policyVersion:'2026-10-06'}}));
  await page.goto('http://127.0.0.1:8080/checkout.html?kit=twin&color=green&quantity=2');
  await expect(page.locator('[data-method="venmo"]')).toBeDisabled();
  for(const [name,value] of Object.entries({firstName:'Test',lastName:'Buyer',email:'buyer@example.com',line1:'1 Test Street',city:'Indianapolis',postal:'46214'}))await page.locator(`[name="${name}"]`).fill(value);
  await page.locator('[name="state"]').selectOption('IN');
  await page.locator('#calculate-total').click();
  await expect(page.locator('#grand-total')).toHaveText('$85.59');
  await expect(page.locator('#tax-total')).toHaveText('$5.60');
  await expect(page.locator('#delivery-summary')).toContainText('Test Buyer');
  await page.locator('#accept-terms').check();
  await expect(page.locator('[data-method="venmo"]')).toBeEnabled();
  await page.locator('#order-quantity').selectOption('3');
  await expect(page.locator('[data-method="venmo"]')).toBeDisabled();
  await expect(page.locator('#accept-terms')).not.toBeChecked();
  await expect(page.locator('#tax-total')).toHaveText('Enter address');
  await page.locator('[name="country"]').selectOption('CA');
  await expect(page.locator('#canada-notice')).toBeVisible();
  await expect(page.locator('[name="state"] option[value="ON"]')).toHaveText('Ontario');
});
test('checkout fits mobile and desktop without horizontal overflow',async({page})=>{
  for(const width of [320,375,390,768,1024,1440]){
    await page.setViewportSize({width,height:900});await page.goto('http://127.0.0.1:8080/checkout.html');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await expect(page.locator('[name="email"]')).toBeVisible();
  }
});
