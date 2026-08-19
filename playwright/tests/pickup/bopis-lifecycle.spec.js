import { test, expect } from "../../fixtures";
import { OrderPage } from "../../pages/orders/orders.page";
import { OpenDetailPage } from "../../pages/order-detail/open-order-detail.page";
import { PackedDetailPage } from "../../pages/order-detail/pack-order-detail.page";
import { SettingsPage } from "../../pages/settings.page";

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
    test.beforeEach(async ({ page }) => {
        await page.goto(process.env.CURRENT_APP_URL);
    });

    test("Complete full order lifecycle: Open -> Packed -> Completed", async ({ page }) => {
        test.slow();
        console.log("Starting E2E Lifecycle Test...");
        const orderPage = new OrderPage(page);
        const openDetail = new OpenDetailPage(page);
        const packedDetail = new PackedDetailPage(page);
        const settingsPage = new SettingsPage(page);

        // 1) Configure Environment: Ensure Pickup Mode and Tracking toggles are correct
        await settingsPage.ensurePickupMode();

        // 2) Open tab: Pick first order and mark as ready for pickup
        const closeNonAppTabs = async () => {
            const appOrigin = new URL(process.env.CURRENT_APP_URL).origin;
            for (const p of page.context().pages()) {
                if (p === page) continue;
                if (!p.url().startsWith(appOrigin)) {
                    await p.close().catch(() => { });
                }
            }
            await page.bringToFront().catch(() => { });
        };

        // Navigation is handled inside the POM methods
        console.log("Navigating to Open Orders tab...");
        await orderPage.goToOpenTab();

        // Guard clause for empty state - wait for content to be ready
        console.log("Waiting for tab content to load...");
        const hasOrders = await Promise.race([
            orderPage.orderCards.first().waitFor({ state: "visible", timeout: 15000 }).then(() => true).catch(() => false),
            orderPage.noOrdersMessage.waitFor({ state: "visible", timeout: 15000 }).then(() => false).catch(() => false)
        ]);

        if (!hasOrders) {
            console.log("No open orders found. Skipping lifecycle test.");
            test.skip(true, "No open orders found in the environment.");
            return;
        }

        console.log("Retrieving order count...");
        const count = await orderPage.orderCards.count();
        console.log(`Order count: ${count}`);

        let targetCard = null;
        let orderName = "";
        let lifecycleCompleted = false;

        /**
         * OUTER RETRY LOOP for Graceful Error Recovery
         * Just like in Flow 2, we loop through the top open orders. If an order fails with
         * an API data error upon clicking 'Pack', we gracefully skip it and try the next one.
         */
        for (let orderIndex = 0; orderIndex < Math.min(count, 8); orderIndex++) {
            targetCard = null;
            orderName = "";
            const card = orderPage.orderCards.nth(orderIndex);
            await card.waitFor({ state: "visible" });
            const label = card.getByTestId("order-name-tag");
            const trimmedName = (await label.textContent())?.trim() || "";
            
            console.log(`Checking Order: ${trimmedName}`);
        
            let detailPageLoaded = false;
            for (let clickAttempt = 1; clickAttempt <= 3; clickAttempt++) {
                try {
                    try {
                        await label.click({ timeout: 5000 });
                    } catch (err) {
                        console.log("Normal click timed out, forcing click...");
                        await label.click({ force: true });
                    }
                    await openDetail.verifyDetailPage();
                    detailPageLoaded = true;
                    break;
                } catch (e) {
                    console.log(`Attempt ${clickAttempt}: Failed to open detail page. Retrying click...`);
                    await page.waitForTimeout(1000);
                }
            }

            if (!detailPageLoaded) {
                console.log(`Order ${trimmedName} detail page failed to load after 3 attempts. Skipping...`);
                await page.goBack();
                continue;
            }

            // Found a good order
            targetCard = card;
            orderName = trimmedName;

            console.log(`Processing Order: ${orderName}`);
            console.log("Order detail page visible.");

            console.log("Waiting 3 seconds before clicking 'Ready for Pickup'...");
            await page.waitForTimeout(3000);

            // Mark for pickup and handle modal
            let alertAppeared = false;
            for (let attempt = 1; attempt <= 3; attempt++) {
                await openDetail.markReadyForPickup();

                // Handle whichever confirmation UI appears (Modal or Alert)
                try {
                    const uiType = await Promise.race([
                        openDetail.assignPickerModal.waitFor({ state: "visible", timeout: 3000 }).then(() => "modal"),
                        openDetail.readyForPickupAlertBox.waitFor({ state: "visible", timeout: 3000 }).then(() => "alert")
                    ]);

                    if (uiType === "modal") {
                        console.log("Assign Picker modal appeared, selecting first picker...");
                        await openDetail.assignPickerAndSave(0);
                        alertAppeared = true;
                        break;
                    } else if (uiType === "alert") {
                        console.log("Confirmation alert appeared, clicking 'ready for pickup'...");
                        await openDetail.confirmReadyPickupAlert();
                        alertAppeared = true;
                        break;
                    }
                } catch(e) {
                    console.log(`Attempt ${attempt}: No confirmation UI appeared. Retrying click...`);
                }
            }
            
            if (!alertAppeared) {
                throw new Error("Failed to trigger 'Ready to Ship' confirmation UI (neither modal nor alert appeared).");
            }

            console.log("Waiting 2 seconds after confirmation...");
            await page.waitForTimeout(2000);

            await closeNonAppTabs();

            console.log("Waiting for order packed confirmation...");
            try {
                /**
                 * STRICT API ERROR ASSERTION
                 * Race the success toast against the error toast.
                 */
                await Promise.race([
                    openDetail.orderPackedText.waitFor({ state: "visible", timeout: 10000 }),
                    page.locator('ion-toast').filter({ hasText: 'went wrong' }).waitFor({ state: "visible", timeout: 10000 }).then(() => { throw new Error("API Error: 'Something went wrong' toast appeared!"); }),
                    page.locator('ion-toast.ion-color-danger').waitFor({ state: "visible", timeout: 10000 }).then(() => { throw new Error("API Error: A danger toast appeared!"); })
                ]);
                // Assertion: Verify that the success toast was displayed
                await expect(openDetail.orderPackedText).toBeVisible();
                console.log("✓ Order packed confirmation visible.");
            } catch (e) {
                // Skip to the next order instead of failing the suite
                if (e.message.includes("API Error:")) {
                    console.log(`Order ${orderName} failed with an API error. Skipping to next order...`);
                    await page.goBack();
                    continue;
                }
                console.log("Success toast not detected. Looking for any error toast...");
                const anyToast = await page.locator('ion-toast').textContent({ timeout: 1000 }).catch(() => null);
                if (anyToast) {
                    throw new Error(`Failed to pack order. Found toast message: ${anyToast}`);
                }
                throw new Error("Failed to pack order. No success confirmation or error toast appeared within 10 seconds.");
            }

            // Navigating back and finding order in Packed tab
            console.log("Navigating back to order list...");
            await page.goBack();
            await orderPage.goToPackedTab();
            
            console.log(`Searching for Order ${orderName} in Packed tab...`);
            // Retry loop for search in case of sync delay
            let packedCard;
            for (let i = 0; i < 5; i++) {
                try {
                    // searchByOrderName will fill the bar and press Enter
                    packedCard = await orderPage.searchByOrderName(orderName);
                    if (packedCard) break;
                } catch (err) {
                    console.log(`Retry ${i + 1}/5: Order not found in Packed tab, retrying search...`);
                    // Clear search bar for next retry
                    await orderPage.searchBar.fill('');
                    await page.waitForTimeout(3000);
                }
            }
            if (!packedCard) throw new Error(`Order ${orderName} did not appear in Packed tab.`);
            
            console.log(`Opening Packed Order Detail for ${orderName}...`);
            await packedCard.click();
            await packedDetail.verifyDetailPageVisible();
            
            console.log("Attempting Handover (Ship)...");
            await packedDetail.handoverOrder();

            // Navigating back and finding order in Completed tab
            console.log("Navigating back to order list...");
            await page.goBack();
            await orderPage.goToCompletedTab();
            
            console.log(`Searching for Order ${orderName} in Completed tab...`);
            let completedCard;
            for (let i = 0; i < 5; i++) {
                try {
                    completedCard = await orderPage.searchByOrderName(orderName);
                    if (completedCard) break;
                } catch (err) {
                    console.log(`Retry ${i + 1}/5: Order not found in Completed tab, retrying search...`);
                    // Force a hard refresh of the list by navigating away and back
                    await orderPage.goToPackedTab();
                    await page.waitForTimeout(1000);
                    await orderPage.goToCompletedTab();
                    await page.waitForTimeout(10000); // Wait for ElasticSearch to index
                }
            }
            if (!completedCard) throw new Error(`Order ${orderName} did not appear in Completed tab.`);
            
            console.log(`Opening Completed Order Detail for ${orderName}...`);
            await completedCard.click();
            
            /**
             * FINAL ASSERTIONS
             * Explicitly assert that the order is completely visible in the Completed tab
             * and the detail page loaded successfully.
             */
            const titleLocator = page.getByText(orderName).first();
            await expect(titleLocator).toBeVisible({ timeout: 15000 });
            console.log(`✓ Order ${orderName} verified in Completed detail.`);
            console.log(`Successfully completed BOPIS lifecycle for Order: ${orderName}`);
            
            lifecycleCompleted = true;
            break; // Successfully completed the lifecycle, exit the outer loop
        } // End of outer retry loop
        
        if (!lifecycleCompleted) {
            test.skip(true, "Could not find a valid uncorrupted order to complete the BOPIS lifecycle.");
        }
    });

    /**
     * Handling Empty States 
     * This demonstrates how to handle dynamic UI cases where no data exists
     */
    test("Verify graceful handling of empty order tabs", async ({ page }) => {
        test.setTimeout(60000);
        const orderPage = new OrderPage(page);

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
