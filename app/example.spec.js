// @ts-check
const { test, expect } = require('@playwright/test');
const { findImage } = require('image-in-image');

import itemInfo from './item-info.json';
import accountInfo from './naver-account-info.json';

test('Purchase from Naver', async ({ page }) => {
  /********* login *********/
  // goto login page
  await page.goto('https://nid.naver.com/nidlogin.login?mode=form&url=https://www.naver.com/');

  // fill username and password
  await page.locator('#id').fill(accountInfo.naverId);
  await page.locator('#pw').fill(accountInfo.naverPassword);
  // click sign in button by log in bounding box
  const signInLocation = await page.locator('#frmNIDLogin > ul > li > div > div.btn_login_wrap').boundingBox();
  await page.mouse.click(signInLocation.x + signInLocation.width / 2, signInLocation.y + signInLocation.height * 3 / 4);

  // wait for 2-Step Verification
  await page.waitForTimeout(10000); // FIXME : wait for page update
  /********* end login *********/

  /********* select detail *********/
  // enlarge viewport for load option
  await page.setViewportSize({
    width: 1440,
    height: 2880,
  });
  // goto store item page
  await page.goto(itemInfo.itemURL);
  
  // find option location
  const optionLocationMap = new Map();
  const options = await page.locator('[class="bd_1fhc9 N=a:pcs.opopen"]');
  const optionCount = await options.count();
  for(let i = 0 ; i < optionCount ; i++) {
    const option = await options.nth(i);
    const optionBox = await option.boundingBox();
    optionLocationMap.set(await option.textContent(), {
      x: optionBox.x + optionBox.width / 2, 
      y: optionBox.y + optionBox.height / 2
    });
  }

  // select options
  for(const option of itemInfo.options) {
    switch(option.type) {
      case 'dropdown':
        const optionLocation = optionLocationMap.get(option.name);
        if(!optionLocation) {
          console.log('option name not found');
          break;
        }
        await page.mouse.click(optionLocation.x, optionLocation.y); // open dropdown list
        // select option detail
        const optionDetails = await page.locator('[class="bd_1y1pd"]');
        const optionDetailCount = await optionDetails.count();
        let selected = false;
        for(let i = 0 ; i < optionDetailCount ; i++) {
          const optionDetail = await optionDetails.nth(i);
          const optionDetailText = await optionDetail.innerText();          
          if(optionDetailText == option.value) { // if is option of configure value
            const optionDetailBox = await optionDetail.boundingBox();
            await page.mouse.click(optionDetailBox.x + optionDetailBox.width / 2, optionDetailBox.y + optionDetailBox.height / 2); // select option detail
            selected = true;
            break;
          }
        }
        if(selected == false) { // nothing selected
          await page.mouse.click(optionLocation.x, optionLocation.y + 36); // select first option value
          console.log(`option value ${option.value} not found`);
          break;
        }

        break;
    }
  }
  
  // // select additional items
  // for(const additionalItem of itemInfo.additionalItems) {
  //   switch(additionalItem.type) {
  //     case 'dropdown':
  //       const dropdown = await page.getByRole('link', { name : additionalItem.name }).first();
  //       const dropdownBox = await dropdown.boundingBox();
  //       break;
  //   }
  // }
  /********* end select detail *********/
  
  /********* purchase *********/
  await page.waitForTimeout(200); //  wait for load amount
  const purchaseLocation = await page.locator('[class="OgETmrvExa sys_chk_buy N=a:pcs.buy"]').boundingBox();
  await page.mouse.click(purchaseLocation.x + purchaseLocation.width / 2, purchaseLocation.y + purchaseLocation.height / 2); // goto pay screen

  await page.waitForTimeout(2000); // FIXME : wait for page loading
  const popupPromise = page.waitForEvent('popup');
  const paymentLocation = await page.locator('[class="SubmitButton_article__Z2VjB"]').boundingBox();
  await page.mouse.click(paymentLocation.x + paymentLocation.width / 2, paymentLocation.y + paymentLocation.height / 2); // open pay password popup
  
  const popup = await popupPromise;
  await popup.waitForLoadState(); // wait for the popup to load
  await popup.setViewportSize({ // enlarge popup
    width: 400,
    height: 800,
  });
  await popup.screenshot({ path: 'popup.png' });

  // enter payment password
  const payPassword = accountInfo.naverPaymentPassword;
  for(const num of payPassword) {
    const numLocation = await findImage(
      'popup.png',
      `numbers/${num}.png`,
      'image/png',
      'image/png',
      1, // amount of max found
      1, // aspect ratio
      0.8 // similarity
    );
    await popup.mouse.click(Math.round(numLocation.x), Math.round(numLocation.y));
  }

  await page.waitForTimeout(5000); // FIXME : wait for page loading
  await page.screenshot({ path: 'result.png' }); // print result
  /********* end purchase *********/
});
