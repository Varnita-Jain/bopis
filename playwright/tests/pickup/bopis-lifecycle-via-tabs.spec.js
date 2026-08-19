import { test, expect } from "../../fixtures";
import { OrderPage } from "../../pages/orders/orders.page";
import { OpenDetailPage } from "../../pages/order-detail/open-order-detail.page";
import { SettingsPage } from "../../pages/settings.page";

test.describe("BOPIS Order Lifecycle (Via Tabs)", () => {
    let orderPage;
    let openDetail;
    let settingsPage;
    let orderName;

    test.beforeEach(async ({ page }) => {
        orderPage = new OrderPage(page);
        openDetail = new OpenDetailPage(page);
        settingsPage = new SettingsPage(page);

        await page.goto(process.env.CURRENT_APP_URL);
        await page.waitForLoadState('networkidle');

        // Make sure we have the correct toggle environment for Pickup Flow 1
        console.log("Ensuring Pickup Mode configuration in Settings...");
        await settingsPage.ensurePickupMode();
        console.log("Pickup Mode environment is ready.");

        // Go back to Orders tab and specifically the Open tab to start
        await orderPage.goToOpenTab();
    });

    test("Complete full order lifecycle via card action buttons", async ({ page }) => {
        console.log("Starting E2E Lifecycle Test via Tabs...");
        await page.waitForTimeout(2000);

        const cardCount = await orderPage.orderCards.count();
        if (cardCount === 0) {
            console.log("No orders available to test.");
            return;
        }

        // Loop through available orders and pick the first one that is NOT the stuck HNA1233
        let targetCard = null;
        let orderName = "";
        
        console.log(`Found ${cardCount} cards. Searching for a fresh order...`);
        for (let i = 0; i < cardCount; i++) {
            const card = orderPage.orderCards.nth(i);
            await card.waitFor({ state: "visible" });
            const nameLabel = card.getByTestId("order-name-tag");
            const name = await nameLabel.textContent();
            console.log(`Card ${i} Name: '${name}'`);

            // Skip known corrupted ghost orders
            const trimmedName = name ? name.trim() : "";
            if (trimmedName === "#1927" || trimmedName === "#1928" || trimmedName === "#1929") {
                console.log(`Skipping known ghost order: ${trimmedName}`);
                continue;
            }

            const readyButton = card.locator('ion-button').filter({ hasText: /READY FOR PICKUP/i }).first();
            
            if (await readyButton.isVisible()) {
                targetCard = card;
                orderName = name?.trim();
                break;
            }
        }

        if (!targetCard) {
            console.log("No valid non-corrupted orders found to test.");
            return;
        }

        await targetCard.waitFor({ state: "visible" });
        console.log(`Checking Order: ${orderName}`);

        // Click the 'Ready for Pickup' button directly on the card
        console.log("Clicking 'Ready for Pickup' on the card...");
        await orderPage.clickReadyForPickupOnCard(targetCard);

        // Handle the Assign Picker Modal or Confirmation Alert
        console.log("Waiting for Assign Picker modal or Confirmation alert...");
        try {
            await Promise.race([
                orderPage.assignPickerModal.waitFor({ state: "visible", timeout: 5000 }).catch(() => {}),
                openDetail.readyForPickupAlertBox.waitFor({ state: "visible", timeout: 5000 }).catch(() => {})
            ]);
        } catch (e) {
            console.log("Neither modal nor alert appeared in time.");
        }

        if (await orderPage.assignPickerModal.isVisible()) {
            console.log("Assign Picker modal appeared, selecting first picker...");
            await orderPage.assignPickerAndSave();
        } else if (await openDetail.readyForPickupAlertBox.isVisible()) {
            console.log("Confirmation alert appeared, clicking 'ready for pickup'...");
            await openDetail.readyForPickupAlertButton.waitFor({ state: "visible", timeout: 5000 });
            await openDetail.readyForPickupAlertButton.click();
        } else {
            console.log("Warning: Proceeding without explicit confirmation.");
        }

        console.log("Waiting 2 seconds after confirmation...");
        await page.waitForTimeout(2000);

        // Verify packing success
        console.log("Waiting for order packed confirmation...");
        await Promise.race([
            openDetail.orderPackedText.waitFor({ state: "visible", timeout: 10000 }),
            page.locator('ion-toast').filter({ hasText: 'went wrong' }).waitFor({ state: "visible", timeout: 10000 }).then(() => { throw new Error("API Error: 'Something went wrong' toast appeared!"); }),
            page.locator('ion-toast.ion-color-danger').waitFor({ state: "visible", timeout: 10000 }).then(() => { throw new Error("API Error: A danger toast appeared!"); })
        ]);
        console.log("✓ Order packed confirmation visible.");

        // Automatically close any newly opened tabs (e.g. Packing Slip PDF)
        console.log("Checking for and closing any newly opened PDF tabs...");
        const appOrigin = new URL(process.env.CURRENT_APP_URL).origin;
        for (const p of page.context().pages()) {
            if (p === page) continue;
            if (!p.url().startsWith(appOrigin) || p.url().includes('blob:')) {
                await p.close().catch(() => { });
            }
        }
        await page.bringToFront().catch(() => { });

        // Step 2: Packed Tab
        await orderPage.goToPackedTab();
        
        console.log(`Searching for Order ${orderName} in Packed tab...`);
        const packedCard = await orderPage.searchByOrderName(orderName);
        
        console.log("Clicking 'Handover' on the card...");
        await orderPage.clickHandoverOnCard(packedCard);

        // The Handover success toast
        console.log("Waiting for handed over success label...");
        await page.locator('ion-toast').filter({ hasText: /order.*(handed over|delivered|shipped)/i }).waitFor({ state: 'visible', timeout: 15000 });
        console.log("✓ Handover successful.");

        // Step 3: Completed Tab
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
        
        // Final validation: Ensure the card is visible in the completed tab
        await expect(completedCard).toBeVisible({ timeout: 15000 });
        console.log(`✓ Order ${orderName} verified in Completed tab.`);
        console.log(`Successfully completed lifecycle via Tabs for Order: ${orderName}`);
    });
});
