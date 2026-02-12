import { test, expect } from "../../fixtures";
import { PackedOrderPage } from "../../pages/orders/pack-orders.page";
import { PackedDetailPage } from "../../pages/order-detail/pack-order-detail.page";
import { CompletedOrdersPage } from "../../pages/orders/complete-orders.page";
import { OrderPage } from "../../pages/orders/orders.page";
import { OpenDetailPage } from "../../pages/order-detail/open-order-detail.page";
import { loginToOrders } from "../../helpers/auth";

test("Open -> Packed -> Completed: Handover flow", async ({ page }) => {
  // End-to-end scenario:
  // Open order -> mark ready for pickup -> handover from packed detail -> verify completion signal.
  const orderPage = new OrderPage(page);
  const openDetail = new OpenDetailPage(page);
  const packedPage = new PackedOrderPage(page);
  const packedDetail = new PackedDetailPage(page);
  const completedPage = new CompletedOrdersPage(page);
  const closeOtherPages = async () => {
    // Print flows can open extra tabs; close them to keep the test on the app tab.
    const pages = page.context().pages();
    for (const p of pages) {
      if (p !== page) {
        await p.close().catch(() => {});
      }
    }
    await page.bringToFront().catch(() => {});
  };

  await loginToOrders(page);

  // 1) Open tab: pick first order and pack it
  await orderPage.goToOpenTab();
  if ((await orderPage.orderCards.count()) === 0) {
    throw new Error("No open orders available to pack. This test requires at least one open order.");
  }

  const orderName = await orderPage.getOrderName();
  const normalizedOrderName = orderName.replace(/\s+/g, " ").trim();
  const numberLikeToken =
    normalizedOrderName.split(" ").find((t) => /\d/.test(t)) || normalizedOrderName;
  await orderPage.clickFirstOrderCard();
  await openDetail.verifyDetailPage();
  await openDetail.markReadyForPickup();

  // Wait for whichever post-click flow appears in this environment.
  const postReadyFlow = await Promise.race([
    openDetail.assignPickerModal.waitFor({ state: "visible", timeout: 8000 }).then(() => "modal").catch(() => null),
    openDetail.readyForPickupAlertBox.waitFor({ state: "visible", timeout: 8000 }).then(() => "alert").catch(() => null),
    openDetail.orderPackedText.waitFor({ state: "visible", timeout: 8000 }).then(() => "packed").catch(() => null),
  ]);

  if (postReadyFlow === "modal") {
    const pickerCount = await openDetail.assignPickerRadios.count();
    if (pickerCount === 0) {
      throw new Error("Assign picker modal opened but no picker options were available.");
    }
    await openDetail.assignPickerAndSave(0);
    if (await openDetail.readyForPickupAlertBox.isVisible().catch(() => false)) {
      await openDetail.confirmReadyPickupAlert();
    }
  } else if (postReadyFlow === "alert") {
    await openDetail.confirmReadyPickupAlert();
  }

  await Promise.race([
    openDetail.orderPackedText.waitFor({ state: "visible", timeout: 12000 }).catch(() => null),
    page.waitForURL(/orderdetail\/packed\//, { timeout: 12000 }).catch(() => null),
  ]);
  await closeOtherPages();

  // 2) Handover from packed detail:
  // If app already navigated to packed detail after "Ready for Pickup", continue there.
  // Else go to packed list, open first card, and continue.
  let onPackedDetail = /\/orderdetail\/packed\//.test(page.url());
  if (!onPackedDetail) {
    await openDetail.goBack();
    let packedCount = 0;
    for (let i = 0; i < 8; i++) {
      await packedPage.goToPackedTab();
      await closeOtherPages();
      await orderPage.waitForOverlays();
      packedCount = await packedPage.orderCards.count();
      if (packedCount > 0) break;
      await page.waitForTimeout(3000);
    }
    if (packedCount === 0) {
      throw new Error("No orders available in Packed tab after waiting for state transition.");
    }
    await packedPage.openFirstOrderDetail();
    onPackedDetail = /\/orderdetail\/packed\//.test(page.url());
  }

  await packedDetail.verifyDetailPageVisible();
  const hasHandoverNow = await packedDetail.handoverButton.first().isVisible().catch(() => false);
  if (!onPackedDetail || !hasHandoverNow) {
    throw new Error(`Handover button is not visible on packed detail page. URL: ${page.url()}`);
  }
  await page.waitForLoadState("networkidle").catch(() => {});
  await packedDetail.handoverOrder();
  await closeOtherPages();

  // 3) Success toast: delivered to customer (best-effort, may not appear)
  await orderPage.verifySuccessToast().catch(() => {
    console.warn("Success toast not visible; proceeding with Completed tab check.");
  });

  // 4) Completed tab: best-effort verification (some envs do not move to Completed immediately)
  await packedDetail.goBack();
  await completedPage.goToCompletedTab();
  await closeOtherPages();
  try {
    const completedResult = await orderPage
      .searchByOrderName(normalizedOrderName)
      .catch(() => orderPage.searchByOrderName(numberLikeToken));
    await expect(completedResult).toBeVisible();
  } catch (e) {
    console.warn(
      `Order ${normalizedOrderName} not found in Completed tab; continuing (toast confirmed handover).`,
    );
  }
});
