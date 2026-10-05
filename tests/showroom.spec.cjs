const {test,expect}=require('@playwright/test');
test('responsive layout and kit selection',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const width of [375,390,768,1024,1440]){
  await page.setViewportSize({width,height:900});await page.goto('http://127.0.0.1:8080');
  await expect(page.locator('html')).not.toHaveClass('no-js');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 }
 await page.getByRole('button',{name:'Green',exact:true}).click();await expect(page.locator('#selected-color')).toHaveText('Acid green');
 await page.locator('#quantity').fill('2');await page.locator('[data-open-checkout]').click();await expect(page.locator('#checkout-dialog')).toBeVisible();await expect(page.locator('#checkout-quantity')).toHaveText('Quantity 2');await expect(page.locator('#stripe-checkout')).toHaveAttribute('aria-disabled','true');await page.keyboard.press('Escape');
 await page.setViewportSize({width:390,height:844});await page.locator('#menu-toggle').click();await expect(page.locator('#mobile-navigation')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('#mobile-navigation')).toBeHidden();expect(errors).toEqual([]);
});
test('3D starts automatically, rotates and resets',async({page})=>{
 await page.goto('http://127.0.0.1:8080');await expect(page.locator('#spatial-view')).toHaveClass(/scene-ready/,{timeout:20000});
 const canvas=page.locator('#spatial-view canvas');
 const movingA=await canvas.screenshot();await page.waitForTimeout(700);const movingB=await canvas.screenshot();expect(movingA.equals(movingB)).toBeFalsy();
 await page.locator('#scene-motion').click();await expect(page.locator('#spatial-view')).toHaveAttribute('data-moving','false');
 const pausedA=await canvas.screenshot();await page.waitForTimeout(300);const pausedB=await canvas.screenshot();expect(pausedA.equals(pausedB)).toBeTruthy();
 await page.getByRole('button',{name:'Rotate projector right'}).click();await page.getByRole('button',{name:'Reset view'}).click();await page.getByRole('button',{name:'Purple',exact:true}).click();await expect(page.locator('#selected-color')).toHaveText('Ultraviolet purple');
 await page.screenshot({path:'test-results/showroom-3d.png'});
});
test('WebGL failure preserves product photo',async({page})=>{
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.includes('webgl')?null:original.call(this,type,...args)};});
 await page.goto('http://127.0.0.1:8080');await expect(page.locator('#scene-status')).toContainText('3D is unavailable');await expect(page.locator('#preview-eye')).toBeVisible();await expect(page.locator('#scene-controls')).toBeHidden();
});

test('motion can pause and respects reduced motion',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('http://127.0.0.1:8080');
 await expect(page.locator('#spatial-view')).toHaveAttribute('data-moving','false');
 await expect(page.locator('#scene-motion')).toHaveText('Play motion');
 await page.locator('#scene-motion').click();await expect(page.locator('#spatial-view')).toHaveAttribute('data-moving','true');
 await page.locator('#scene-motion').click();await expect(page.locator('#spatial-view')).toHaveAttribute('data-moving','false');
});
