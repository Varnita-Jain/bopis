import { test, expect } from "../../fixtures";
import { OrderPage } from "../../pages/orders/orders.page";
import { SettingsPage } from "../../pages/settings.page";

test.describe("BOPIS Reject Order Lifecycle (Via Tabs)", () => {

    test("Reject an order from the Open tab list view", async ({ page }) => {
        const orderPage = new OrderPage(page);
        const settingsPage = new SettingsPage(page);

        await page.goto(process.env.CURRENT_APP_URL || 'https://bopis-uat.hotwax.io');
        await page.waitForLoadState('networkidle');

        // --- Prep ---
        console.log("Ensuring Pickup Mode configuration in Settings...");
        await settingsPage.ensurePickupMode();

        console.log("Navigating to Orders > Open tab...");
        await orderPage.goToOpenTab();
        console.log("✓ Open tab loaded.");

        console.log("Starting Reject Order Test via Tabs...");
        await page.waitForTimeout(2000);

        const cardCount = await orderPage.orderCards.count();
        if (cardCount === 0) {
            console.log("No orders available to test.");
            return;
        }

        let targetCard = null;
        let orderName = "";
        
        console.log(`Found ${cardCount} cards. Searching for a fresh order with a REJECT button...`);
        for (let i = 0; i < cardCount; i++) {
            const card = orderPage.orderCards.nth(i);
            await card.waitFor({ state: "visible" });
            const nameLabel = card.getByTestId("order-name-tag");
            const name = await nameLabel.textContent();
            console.log(`Card ${i} Name: '${name}'`);

            const trimmedName = name ? name.trim() : "";
            // Skip ghost orders from previous runs
            if (trimmedName === "#1927" || trimmedName === "#1928" || trimmedName === "#1929" || trimmedName === "#1923") {
                console.log(`Skipping known ghost order: ${trimmedName}`);
                continue;
            }

            const rejectButton = card.locator('ion-button').filter({ hasText: /REJECT/i }).first();
            
            if (await rejectButton.isVisible()) {
                targetCard = card;
                orderName = trimmedName;
                break;
            }
        }

        if (!targetCard) {
            console.log("No valid orders found with a REJECT button (all skipped or missing).");
            return;
        }

        console.log(`Rejecting Order: ${orderName}`);
        
        // 1. Click REJECT on card
        console.log("Clicking 'Reject' on the card...");
        await orderPage.clickRejectOnCard(targetCard);

        // 2. Handle Reject Modal
        console.log("Waiting for Reject Order Modal...");
        const modalHeader = page.getByTestId("reject-order-modal-header");
        await expect(modalHeader).toBeVisible({ timeout: 10000 });

        console.log("Opening reason dropdown for the first item...");
        const reasonButton = page.getByTestId("rejection-reason-modal-button").first();
        await expect(reasonButton).toBeVisible();
        await reasonButton.click();

        console.log("Selecting the first rejection reason option...");
        // Ionic renders the actual selectable items in a popover or alert overlay, not as ion-select-option
        const popoverOption = page.locator('ion-popover ion-item, ion-popover ion-radio, ion-alert button.alert-radio-button, ion-select-popover ion-item').filter({ hasText: /Not in Stock|Mismatch|Damaged/i }).first();
        await expect(popoverOption).toBeVisible({ timeout: 10000 });
        await popoverOption.click({ force: true });

        // Give UI a split second to update the reason chip and enable the submit button
        await page.waitForTimeout(1000);

        console.log("Clicking the submit reject (trash) button...");
        const submitButton = page.getByTestId("reject-modal-button");
        await expect(submitButton).toBeVisible();
        // The button is initially disabled. Wait for it to become enabled after selecting the reason.
        await expect(submitButton).not.toHaveAttribute("aria-disabled", "true", { timeout: 10000 });
        await submitButton.click();

        console.log("Handling the confirmation alert...");
        const alertBox = page.locator("ion-alert");
        await expect(alertBox).toBeVisible();
        const confirmRejectBtn = alertBox.getByRole("button", { name: /reject/i });
        await confirmRejectBtn.click();

        // 3. Verify Success
        console.log("Waiting for order rejected confirmation toast...");
        // Usually looks like "1 order items rejected", "Order items rejected", "Order rejected"
        await page.locator('ion-toast').filter({ hasText: /order.*rejected|item.*rejected/i }).waitFor({ state: 'visible', timeout: 15000 });
        console.log(`✓ Order ${orderName} successfully rejected.`);

    });
});
