import { test, expect } from "../../fixtures";
import { OrderPage } from "../../pages/orders/orders.page";
import { OpenDetailPage } from "../../pages/order-detail/open-order-detail.page";
import { PackedDetailPage } from "../../pages/order-detail/pack-order-detail.page";
import { SettingsPage } from "../../pages/settings.page";

test.describe("BOPIS Pack and Cancel Lifecycle", () => {
    
    test("Pack an order from Open tab, then Cancel it from Packed tab", async ({ page }) => {
        const orderPage = new OrderPage(page);
        const openDetail = new OpenDetailPage(page);
        const packedDetail = new PackedDetailPage(page);
        const settingsPage = new SettingsPage(page);

        await page.goto(process.env.CURRENT_APP_URL || 'https://bopis-uat.hotwax.io');
        await page.waitForLoadState('networkidle');

        // 1. Ensure Pickup Mode
        console.log("Ensuring Pickup Mode configuration in Settings...");
        await settingsPage.ensurePickupMode();

        // 2. Navigate to Open tab
        console.log("Navigating to Orders > Open tab...");
        await orderPage.goToOpenTab();
        console.log("✓ Open tab loaded.");
        await page.waitForTimeout(2000);

        // 3. Find a fresh order
        const cardCount = await orderPage.orderCards.count();
        if (cardCount === 0) {
            console.log("No orders available to test.");
            return;
        }

        let targetCard = null;
        let orderName = "";
        
        console.log(`Found ${cardCount} cards on Open tab. Searching for a fresh order to pack...`);
        for (let i = 0; i < cardCount; i++) {
            const card = orderPage.orderCards.nth(i);
            await card.waitFor({ state: "visible" });
            const nameLabel = card.getByTestId("order-name-tag");
            const name = await nameLabel.textContent();
            
            const trimmedName = name ? name.trim() : "";
            // Skip ghost orders from previous runs, including #1887 which was rejected in the previous test
            if (trimmedName === "#1927" || trimmedName === "#1928" || trimmedName === "#1929" || trimmedName === "#1923" || trimmedName === "#1909" || trimmedName === "#1887") {
                continue;
            }

            const readyButton = card.locator('ion-button').filter({ hasText: /READY FOR PICKUP/i }).first();
            if (await readyButton.isVisible()) {
                targetCard = card;
                orderName = trimmedName;
                break;
            }
        }

        if (!targetCard) {
            console.log("No valid non-corrupted orders found to pack.");
            return;
        }

        console.log(`Packing Order: ${orderName}`);
        await orderPage.clickReadyForPickupOnCard(targetCard);

        console.log("Waiting for Assign Picker modal or Confirmation alert...");
        try {
            await Promise.race([
                orderPage.assignPickerModal.waitFor({ state: "visible", timeout: 5000 }).catch(() => {}),
                openDetail.readyForPickupAlertBox.waitFor({ state: "visible", timeout: 5000 }).catch(() => {})
            ]);
        } catch (e) {}

        if (await orderPage.assignPickerModal.isVisible()) {
            console.log("Assign Picker modal appeared, selecting first picker...");
            await orderPage.assignPickerAndSave();
        } else if (await openDetail.readyForPickupAlertBox.isVisible()) {
            console.log("Confirmation alert appeared, clicking 'ready for pickup'...");
            await openDetail.readyForPickupAlertButton.waitFor({ state: "visible", timeout: 5000 });
            await openDetail.readyForPickupAlertButton.click();
        }

        // Wait for order to disappear from Open tab
        console.log("Waiting for order to be packed (disappear from Open tab)...");
        await page.waitForTimeout(3000); 

        // 4. Navigate to Packed tab
        console.log("Navigating to Packed tab...");
        await orderPage.goToPackedTab();
        await page.waitForTimeout(2000);

        // 5. Find the same order on Packed tab
        console.log(`Searching for packed order ${orderName} on Packed tab...`);
        const packedCard = orderPage.orderCards.filter({ hasText: orderName }).first();
        await expect(packedCard).toBeVisible({ timeout: 15000 });

        console.log(`Opening Order Details for ${orderName}...`);
        await packedCard.click({ position: { x: 10, y: 10 } }); // Avoid clicking buttons inside the card
        
        await expect(page).toHaveURL(/.*orderdetail.*/);
        await page.waitForTimeout(2000);

        // 6. Cancel the first item
        console.log("Clicking CANCEL button for the first item...");
        await expect(packedDetail.cancelItemButton.first()).toBeVisible({ timeout: 10000 });
        await packedDetail.cancelItemButton.first().click();

        // Note: Clicking the CANCEL button directly opens the popover on the Packed tab.
        // We do not need an intermediate reason button click here.
        console.log("Waiting for cancel reason popover to open...");
        const popover = page.locator('ion-popover');
        await expect(popover).toBeVisible({ timeout: 5000 });

        console.log("Checking if reason options are available in the dropdown...");
        const popoverOptions = popover.locator('ion-item, ion-radio, button.alert-radio-button');
        const optionsCount = await popoverOptions.count();
        
        // Explicitly fail the test with a clear assertion message if the dropdown is blank
        expect(optionsCount).toBeGreaterThan(0, "BUG: The cancellation reason dropdown is completely blank/empty! No options were rendered.");
        
        console.log("Selecting reason from dropdown...");
        await popoverOptions.first().click({ force: true });
        
        await page.waitForTimeout(1000); // Give the UI time to update the selected reason

        console.log("Clicking the global CANCEL ITEMS button...");
        await expect(packedDetail.cancelItemsSubmitButton).toBeEnabled({ timeout: 5000 });
        await packedDetail.cancelItemsSubmitButton.click();

        console.log("Waiting for confirmation alert...");
        await expect(packedDetail.confirmCancellationButton).toBeVisible({ timeout: 5000 });
        await packedDetail.confirmCancellationButton.click();

        console.log("Waiting for cancellation success...");
        // The page object expects "All order items are cancelled"
        try {
            await packedDetail.orderRejectedsuccess.waitFor({ state: "visible", timeout: 10000 });
            console.log(`✓ Order ${orderName} successfully cancelled from Details page!`);
        } catch (e) {
            console.log("Toast not seen. Verifying if items were removed...");
            const url = page.url();
            if (!url.includes('orderdetail')) {
                console.log(`✓ Order ${orderName} successfully cancelled (navigated away).`);
            } else {
                const remaining = await page.getByTestId("detail-page-item").count();
                if (remaining === 0) {
                    console.log(`✓ Order ${orderName} successfully cancelled (all items removed).`);
                } else {
                    throw new Error(`Cancellation failed. ${remaining} items still visible.`);
                }
            }
        }
    });
});
