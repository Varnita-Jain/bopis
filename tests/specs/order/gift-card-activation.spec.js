import { test } from "../../fixtures";
import { PackedOrderPage } from "../../pages/orders/pack-orders.page";
import { OrderDetailPage } from "../../pages/order-detail/order-detail.page";
import { CompletedOrdersPage } from "../../pages/orders/complete-orders.page";
import { OrderPage } from "../../pages/orders/orders.page";
import { loginToOrders } from "../../helpers/auth";

// Gift Card Activation Packed List page
test("Pack Orders Page: Gift Card Activation", async ({ page }) => {
  await loginToOrders(page);

  const packedOrders = new PackedOrderPage(page);
  const orderList = new OrderPage(page);
  await packedOrders.goToPackedTab();
  const giftCardListCount = await orderList.orderCards
    .filter({ has: orderList.giftCardActivationButton })
    .count();
  if (giftCardListCount === 0) {
    test.skip(true, "No gift card orders found in Packed list");
    return;
  }
  await orderList.openFirstGiftCardModalFromList();
  await orderList.activateGiftCard("mygiftcard123");
});

// Gift Card Activation Packed Detail page
test("Pack Details Page: Gift Card Activation", async ({ page }) => {
  await loginToOrders(page);

  const packedOrders = new PackedOrderPage(page);
  const detailPage = new OrderDetailPage(page);

  await packedOrders.goToPackedTab();
  const packedGiftCount = await packedOrders.orderCards
    .filter({ has: packedOrders.giftCardActivationButton })
    .count();
  if (packedGiftCount === 0) {
    test.skip(true, "No gift card orders found in Packed tab");
    return;
  }
  await packedOrders.openFirstGiftCardOrder();
  // Gift card flow on detail page
  await detailPage.verifyDetailPage();
  await detailPage.openGiftCardModal();
  await detailPage.activateGiftCard("mygiftcard123");
});

// Gift Card Activation Completed Detail page
test("Completed Details Page: Gift Card Activation", async ({ page }) => {
  const completedOrders = new CompletedOrdersPage(page);
  const orderDetail = new OrderDetailPage(page);

  await loginToOrders(page);
  await completedOrders.goToCompletedTab();
  const completedGiftCount = await completedOrders.orderCards
    .filter({ has: completedOrders.giftCardActivationButton })
    .count();
  if (completedGiftCount === 0) {
    test.skip(true, "No gift card orders found in Completed tab");
    return;
  }
  await completedOrders.openFirstGiftCardOrder();
  // Gift card flow on detail page
  await orderDetail.verifyDetailPage();
  await orderDetail.openGiftCardModal();
  await orderDetail.activateGiftCard("mygiftcard123");
});

// Gift Card Activation Completed List page
test("Completed Orders Page: Gift Card Activation", async ({ page }) => {
  const completedOrders = new CompletedOrdersPage(page);
  const orderDetail = new OrderDetailPage(page);
  const orderList = new OrderPage(page);

  await loginToOrders(page);
  await completedOrders.goToCompletedTab();
  const completedListGiftCount = await orderList.orderCards
    .filter({ has: orderList.giftCardActivationButton })
    .count();
  if (completedListGiftCount === 0) {
    test.skip(true, "No gift card orders found in Completed list");
    return;
  }
  // Directly open gift card modal from list card
  await orderList.openFirstGiftCardModalFromList();
  // Gift card activation
  await orderList.activateGiftCard("mygiftcard123");
});
