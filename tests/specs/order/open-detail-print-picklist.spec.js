import { test } from "../../fixtures";
import { OpenDetailPage } from "../../pages/order-detail/open-order-detail.page";
import { OrderPage } from "../../pages/orders/orders.page";
import { OrderDetailPage } from "../../pages/order-detail/order-detail.page";
import { loginToOrders } from "../../helpers/auth";

// Print picklist from Detail page (Case 1: Picker Not Assigned)
test("Open Details Page: Print Picklist When Picker Not Assigned", async ({
  page,
}) => {
  // Scenario: open-order detail where printing requires picker assignment first.
  const orderPage = new OrderPage(page);
  const openDetail = new OpenDetailPage(page);
  const orderDetail = new OrderDetailPage(page);

  console.log('CURRENT_APP_URL:', process.env.CURRENT_APP_URL);
  await loginToOrders(page);
  await orderPage.goToOpenTab();
  if (await orderPage.orderCards.count() === 0) {
    test.skip(true, "No open orders found");
    return;
  }
  await orderPage.clickFirstOrderCard();

  await openDetail.verifyDetailPage();
  if (!(await openDetail.printPicklistButton.isVisible().catch(() => false))) {
    test.skip(true, "Print Picklist button not available for this order");
    return;
  }
  await openDetail.printPicklist();
  await openDetail.verifyAssignPickerModal();
  // If assignment is required, validate the modal can provide picker options.
  if ((await openDetail.assignPickerRadios.count()) === 0) {
    test.skip(true, "No pickers available for assignment");
    return;
  }
  await openDetail.assignPickerAndSave(0);
  await orderDetail.handlePopupAndVerify();
});

// Print picklist from Detail page (Case 2: Picker Already Assigned)
test("Open Details Page: Print Picklist When Picker Is Assigned", async ({
  page,
}) => {
  // Scenario: open-order detail where picklist print should proceed without assignment.
  await loginToOrders(page);
  const orderPage = new OrderPage(page);
  const openDetail = new OpenDetailPage(page);
  const orderDetail = new OrderDetailPage(page);
  await orderPage.goToOpenTab();
  if (await orderPage.orderCards.count() === 0) {
    test.skip(true, "No open orders found");
    return;
  }
  await orderPage.clickFirstOrderCard();
  await openDetail.verifyDetailPage();
  if (!(await openDetail.printPicklistButton.isVisible().catch(() => false))) {
    test.skip(true, "Print Picklist button not available for this order");
    return;
  }
  await openDetail.printPicklist();
  await orderDetail.handlePopupAndVerify();
});
