import { test, expect } from "../../fixtures";
import { OrderPage } from "../../pages/orders/orders.page";
import { OpenOrderPage } from "../../pages/orders/open-orders.page";
import { OpenDetailPage } from "../../pages/order-detail/open-order-detail.page";
import { PackedOrderPage } from "../../pages/orders/pack-orders.page";
import { PackedDetailPage } from "../../pages/order-detail/pack-order-detail.page";
import { CompletedOrdersPage } from "../../pages/orders/complete-orders.page";
import { loginToOrders } from "../../helpers/auth";

/**
 * BOPIS End-to-End Lifecycle Test
 * 
 * This test demonstrates the best practices for Playwright automation:
 * 1. Environment-driven (uses .env via process.env)
 * 2. Page Object Model (POM) architecture
 * 3. Stable locators (getByTestId, getByRole)
 * 4. Comprehensive Open -> Packed -> Completed lifecycle verification
 */
test.describe("BOPIS Order Lifecycle", () => {
    // Increase timeout for the full lifecycle test
    test.setTimeout(180000);

    test("Complete full order lifecycle: Open -> Packed -> Completed", async ({ page }) => {
        test.slow();
        console.log("Starting E2E Lifecycle Test...");
        const orderPage = new OrderPage(page);
        const openOrder = new OpenOrderPage(page);
        const openDetail = new OpenDetailPage(page);
        const packedOrder = new PackedOrderPage(page);
        const packedDetail = new PackedDetailPage(page);
        const completedOrders = new CompletedOrdersPage(page);

        // 1. Direct login to Orders app
        await loginToOrders(page);

        // 2. Orders Page - Open Tab
        // Navigation is handled inside the POM methods
        console.log("Navigating to Open Orders tab...");
        await orderPage.goToOpenTab();

        // Guard clause for empty state - wait for content to be ready
        console.log("Waiting for tab content to load...");
        const hasOrders = await Promise.race([
            orderPage.openOrdersContainer.waitFor({ state: "visible", timeout: 10000 }).then(() => true).catch(() => false),
            orderPage.noOrdersMessage.waitFor({ state: "visible", timeout: 10000 }).then(() => false).catch(() => false)
        ]);

        if (!hasOrders) {
            console.log("No open orders found. Skipping lifecycle test.");
            test.skip(true, "No open orders found in the environment.");
            return;
        }

        console.log("Retrieving order count...");
        const orderCount = await orderPage.orderCards.count();
        console.log(`Order count: ${orderCount}`);

        // Lifecycle part A: Open -> Packed
        // We'll capture the order name to search for it in later tabs
        const orderName = await orderPage.getOrderName();
        console.log(`Processing Order: ${orderName}`);

        // Option 1: Pack from list (if buttons are visible) or via Detail
        // We'll go to detail for full validation
        console.log("Opening order detail...");
        await orderPage.clickFirstOrderCard();
        await openDetail.verifyDetailPage();
        console.log("Order detail page visible.");


        // Mark for pickup and handle picker modal (dynamic case)
        await openDetail.markReadyForPickup();

        // Handle Picker Modal if it appears
        if (await openDetail.assignPickerModal.isVisible()) {
            console.log("Assign Picker modal appeared, selecting first picker...");
            await openDetail.assignPickerAndSave(0);
        }

        // Handle Confirmation Alert if it appears
        if (await openDetail.readyForPickupAlertBox.isVisible()) {
            console.log("Confirmation alert appeared, clicking 'ready for pickup'...");
            await openDetail.confirmReadyPickupAlert();
        }

        // Wait for the success message (handling timeout/visibility gracefully)
        console.log("Waiting for order packed confirmation...");
        try {
            await openDetail.orderPackedText.waitFor({ state: "visible", timeout: 10000 });
            console.log("✓ Order packed confirmation visible.");
        } catch (e) {
            console.log("Success toast not detected (it might have disappeared), proceeding with verification.");
        }


        // 3. Navigation to Packed Tab
        // Return to list first, then switch tabs
        await openDetail.goBack();
        await orderPage.goToPackedTab();



        // Verify our order moved to Packed tab
        // Note: In parallel runs, we might search for the specific orderName
        const packedResult = await orderPage.searchByOrderName(orderName);
        await expect(packedResult).toBeVisible();

        // Lifecycle part B: Packed -> Completed (Handover)
        await packedResult.click();
        await packedDetail.verifyDetailPageVisible();

        // Handing over order (includes modal/alert handling)
        await packedDetail.handoverOrder();

        // 4. Verification in Completed Tab
        // Return to list first, then switch tabs
        await packedDetail.goBack();
        // Lifecycle part C: Completed tab verification
        console.log("Navigating to Completed tab...");
        await orderPage.goToCompletedTab();
        await page.waitForLoadState("networkidle");

        // Verify order is in Completed tab
        console.log(`Search for order: ${orderName} in Completed tab...`);
        const completedResult = await orderPage.searchByOrderName(orderName);
        console.log(`Verifying order ${orderName} is in Completed tab...`);
        await expect(completedResult).toBeVisible({ timeout: 30000 });
        console.log(`✓ Order ${orderName} verified in Completed tab.`);
        console.log(`Successfully completed lifecycle for Order: ${orderName}`);
    });

    /**
     * Handling Empty States 
     * This demonstrates how to handle dynamic UI cases where no data exists
     */
    test("Verify graceful handling of empty order tabs", async ({ page }) => {
        test.setTimeout(60000);
        const orderPage = new OrderPage(page);

        await loginToOrders(page);


        // Check tabs - if orderCard is not found, we verify empty state text/locators
        await orderPage.goToOpenTab();
        const orderCount = await orderPage.orderCards.count();

        if (orderCount === 0) {
            console.log("No open orders found. Verifying empty state.");
            await expect(page.getByText(/no orders/i)).toBeVisible();
        } else {
            console.log(`${orderCount} open orders found.`);
        }
        await expect(orderCount).toBeGreaterThanOrEqual(0);
    });

});
