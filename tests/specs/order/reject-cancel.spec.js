import { test } from "../../fixtures";
import { OpenOrderPage } from "../../pages/orders/open-orders.page";
import { OrderDetailPage } from "../../pages/order-detail/order-detail.page";
import { PackedDetailPage } from "../../pages/order-detail/pack-order-detail.page";
import { OrderPage } from "../../pages/orders/orders.page";
import { OpenDetailPage } from "../../pages/order-detail/open-order-detail.page";
import { loginToOrders } from "../../helpers/auth";

// ---------------- SINGLE ITEM ORDER REJECTION ----------------
test("Open Details Page: Single Item Order Rejection", async ({ page }) => {
  const openOrders = new OpenOrderPage(page);
  const orderDetail = new OrderDetailPage(page);
  const openOrderDetail = new OpenDetailPage(page);
  const orderPage = new OrderPage(page);

  await loginToOrders(page);
  await openOrders.goToOpenTab();
  if (await openOrders.orderCards.count() === 0) {
    test.skip(true, "No open orders found");
    return;
  }
  await orderPage.clickFirstOrderCard();
  await orderDetail.verifyDetailPage();
  const totalItems = await openOrderDetail.detailPageIonItems.count();
  if (totalItems > 1) {
    test.skip(true, "Order has multiple items; skipping single-item rejection test");
    return;
  }
  // Reject a single item
  await openOrderDetail.rejectSingleItem();
});

// ---------------- MULTIPLE ITEM ORDER REJECTION ----------------
test("Open Details Page: Multiple Item Order Rejection", async ({ page }) => {
  const openOrders = new OpenOrderPage(page);
  const orderDetail = new OrderDetailPage(page);
  const openOrderDetail = new OpenDetailPage(page);
  const orderPage = new OrderPage(page);

  await loginToOrders(page);
  await openOrders.goToOpenTab();
  if (await openOrders.orderCards.count() === 0) {
    test.skip(true, "No open orders found");
    return;
  }
  await orderPage.clickFirstOrderCard();
  await orderDetail.verifyDetailPage();
  const totalItems = await openOrderDetail.detailPageIonItems.count();
  if (totalItems < 2) {
    test.skip(true, "Order has a single item; skipping multiple-item rejection test");
    return;
  }
  // Reject one item from multiple
  await openOrderDetail.rejectOneItemFromMultiple();
});

// ---------------- SINGLE ITEM ORDER CANCELLATION ----------------
test("Packed Details Page: Single Item Order Cancellation", async ({
  page,
}) => {
  const packedDetail = new PackedDetailPage(page);
  const orderPage = new OrderPage(page);

  await loginToOrders(page);
  await orderPage.goToPackedTab();
  if (await orderPage.orderCards.count() === 0) {
    test.skip(true, "No packed orders found");
    return;
  }
  await orderPage.clickFirstOrderCard();
  await packedDetail.verifyDetailPageVisible();
  // Cancel single item
  await packedDetail.cancelSingleItem();
});

// ---------------- MULTIPLE ITEM ORDER CANCELLATION ----------------
test("Packed Details Page: Multiple Item Order Cancellation", async ({
  page,
}) => {
  const packedDetail = new PackedDetailPage(page);
  const orderPage = new OrderPage(page);
  await loginToOrders(page);
  await orderPage.goToPackedTab();
  if (await orderPage.orderCards.count() === 0) {
    test.skip(true, "No packed orders found");
    return;
  }
  await orderPage.clickFirstOrderCard();
  await packedDetail.verifyDetailPageVisible();
  // Cancel one item from multiple
  await packedDetail.cancelOneItemFromMultiple();
});
