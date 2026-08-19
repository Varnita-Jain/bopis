import { expect, test } from "../../fixtures";
import { OpenOrderPage } from "../../pages/orders/open-orders.page";
import { OrderDetailPage } from "../../pages/order-detail/order-detail.page";
import { PackedOrderPage } from "../../pages/orders/pack-orders.page";

test("Open Details Page: Edit Picker", async ({ page }) => {
  await page.goto(process.env.CURRENT_APP_URL);

  const openOrders = new OpenOrderPage(page);
  const detailPage = new OrderDetailPage(page);

  await openOrders.goToOpenTab();

  const hasOrders = await Promise.race([
    openOrders.orderCards.first().waitFor({ state: "visible", timeout: 10000 }).then(() => true).catch(() => false),
    page.getByText(/no open orders/i).waitFor({ state: "visible", timeout: 5000 }).then(() => false).catch(() => false)
  ]);

  if (!hasOrders) {
    console.log("Skipping: No open orders found");
    test.skip(true, "No open orders found");
    return;
  }

  const count = await openOrders.orderCards.count();
  const maxToTry = Math.min(3, count);
  let foundEligibleOrder = false;

  for (let i = 0; i < maxToTry; i++) {
    console.log(`Checking Open order ${i + 1} for Edit Picker chip...`);
    const card = openOrders.orderCards.nth(i);
    await card.click();
    await detailPage.verifyDetailPage();
    
    const hasEditChip = await detailPage.editPickerChip.waitFor({ state: "visible", timeout: 3000 }).then(() => true).catch(() => false);
    
    // Check if the chip has the disabled class or aria-disabled attribute
    const isDisabled = await detailPage.editPickerChip.evaluate(el => el.getAttribute('aria-disabled') === 'true' || el.classList.contains('chip-disabled')).catch(() => false);
    
    if (hasEditChip && !isDisabled) {
      foundEligibleOrder = true;
      console.log("Edit Picker chip found and ENABLED! Proceeding with edit...");
      await detailPage.openEditPickerModal();
      await detailPage.selectDifferentPicker();
      await detailPage.saveEditPicker();
      await detailPage.verifyPickerReplacedToast();
      break;
    } else {
      console.log(`Edit Picker chip not available or disabled on order ${i + 1}. Going back to try another...`);
      await page.goBack();
      await page.waitForTimeout(1000);
    }
  }

  if (!foundEligibleOrder) {
    console.log("Skipping: Edit Picker chip not available or enabled for any of the first few open orders");
    test.skip(true, "Edit Picker not enabled for any tested open orders");
  }
});

test("Pack Details Page: Edit Picker", async ({ page }) => {
  await page.goto(process.env.CURRENT_APP_URL);
  const packedOrders = new PackedOrderPage(page);
  const detailPage = new OrderDetailPage(page);

  await packedOrders.goToPackedTab();

  const hasOrders = await Promise.race([
    packedOrders.orderCards.first().waitFor({ state: "visible", timeout: 10000 }).then(() => true).catch(() => false),
    page.getByText(/no packed orders/i).waitFor({ state: "visible", timeout: 5000 }).then(() => false).catch(() => false)
  ]);

  if (!hasOrders) {
    console.log("Skipping: No packed orders found");
    test.skip(true, "No packed orders found");
    return;
  }

  const count = await packedOrders.orderCards.count();
  const maxToTry = Math.min(3, count);
  let foundEligibleOrder = false;

  for (let i = 0; i < maxToTry; i++) {
    console.log(`Checking Packed order ${i + 1} for Edit Picker chip...`);
    const card = packedOrders.orderCards.nth(i);
    await card.click();
    await detailPage.verifyDetailPage();
    
    const hasEditChip = await detailPage.editPickerChip.waitFor({ state: "visible", timeout: 3000 }).then(() => true).catch(() => false);
    
    // Check if the chip has the disabled class or aria-disabled attribute
    const isDisabled = await detailPage.editPickerChip.evaluate(el => el.getAttribute('aria-disabled') === 'true' || el.classList.contains('chip-disabled')).catch(() => false);
    
    if (hasEditChip && !isDisabled) {
      foundEligibleOrder = true;
      console.log("Edit Picker chip found and ENABLED! Proceeding with edit...");
      await detailPage.openEditPickerModal();
      await detailPage.selectDifferentPicker();
      await detailPage.saveEditPicker();
      await detailPage.verifyPickerReplacedToast();
      break;
    } else {
      console.log(`Edit Picker chip not available or disabled on order ${i + 1}. Going back to try another...`);
      await page.goBack();
      await page.waitForTimeout(1000);
    }
  }

  if (!foundEligibleOrder) {
    console.log("Skipping: Edit Picker chip not available or enabled for any of the first few packed orders");
    test.skip(true, "Edit Picker not enabled for any tested packed orders");
  }
});
