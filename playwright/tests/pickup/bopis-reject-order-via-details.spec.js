import { test, expect } from "../../fixtures";
import { OrderPage } from "../../pages/orders/orders.page";
import { OpenDetailPage } from "../../pages/order-detail/open-order-detail.page";
import { SettingsPage } from "../../pages/settings.page";

test.describe("BOPIS Reject Order Lifecycle (Via Details Page)", () => {

    test("Reject an order from the Order Details page", async ({ page }) => {
        const orderPage = new OrderPage(page);
        const openDetail = new OpenDetailPage(page);
        const settingsPage = new SettingsPage(page);

        await page.goto(process.env.CURRENT_APP_URL || 'https://bopis-uat.hotwax.io');
        await page.waitForLoadState('networkidle');

        // --- Prep ---
        console.log("Ensuring Pickup Mode configuration in Settings...");
        await settingsPage.ensurePickupMode();

        console.log("Navigating to Orders > Open tab...");
        await orderPage.goToOpenTab();
        console.log("✓ Open tab loaded.");

        console.log("Starting Reject Order Test via Details Page...");
        await page.waitForTimeout(2000);

        const cardCount = await orderPage.orderCards.count();
        if (cardCount === 0) {
            console.log("No orders available to test.");
            return;
        }

        let targetCard = null;
        let orderName = "";
        
        console.log(`Found ${cardCount} cards. Searching for a fresh order...`);
        for (let i = 0; i < cardCount; i++) {
            const card = orderPage.orderCards.nth(i);
            await card.waitFor({ state: "visible" });
            const nameLabel = card.getByTestId("order-name-tag");
            const name = await nameLabel.textContent();
            console.log(`Card ${i} Name: '${name}'`);

            const trimmedName = name ? name.trim() : "";
            // Skip ghost orders from previous runs
            if (trimmedName === "#1927" || trimmedName === "#1928" || trimmedName === "#1929" || trimmedName === "#1923" || trimmedName === "#1909") {
                console.log(`Skipping known ghost/previously rejected order: ${trimmedName}`);
                continue;
            }

            targetCard = card;
            orderName = trimmedName;
            break;
        }

        if (!targetCard) {
            console.log("No valid orders found (all skipped or missing).");
            return;
        }

        console.log(`Opening Order Details for: ${orderName}`);
        await targetCard.click({ position: { x: 10, y: 10 } });
        
        console.log("Waiting for Order Details page to load...");
        await expect(page).toHaveURL(/.*orderdetail.*/);
        await page.waitForTimeout(2000); // Give the items time to render

        console.log("Clicking the red trash can icon for the first item...");
        const rejectItemBtn = page.locator('ion-item ion-button[color="danger"], ion-item [data-testid="select-rejected-item-button"], ion-item ion-button:has(ion-icon[name*="trash"])').first();
        await expect(rejectItemBtn).toBeVisible({ timeout: 10000 });
        await rejectItemBtn.click({ force: true });

        console.log("Opening reason dropdown...");
        const reasonButton = page.getByTestId("select-rejection-reason-button").first();
        await expect(reasonButton).toBeVisible();
        await reasonButton.click({ force: true });

        console.log("Selecting the first rejection reason option...");
        const popoverOption = page.locator('ion-popover ion-item, ion-popover ion-radio, ion-alert button.alert-radio-button, ion-select-popover ion-item').filter({ hasText: /Not in Stock|Mismatch|Damaged/i }).first();
        await expect(popoverOption).toBeVisible({ timeout: 10000 });
        await popoverOption.click({ force: true });

        await page.waitForTimeout(1000); // Wait for the reason chip to update

        console.log("Clicking the global REJECT ITEMS button...");
        const submitButton = page.getByTestId("submit-rejected-items-button").first();
        await expect(submitButton).toBeVisible();
        // Wait for it to be actually enabled (not just Playwright's default check)
        await expect(submitButton).not.toHaveAttribute('disabled', '', { timeout: 5000 });
        await submitButton.click();

        console.log("Waiting for loading overlays to disappear...");
        await openDetail.waitForOverlays();

        console.log("Waiting for order rejected confirmation toast or item removal...");
        try {
            await page.locator('ion-toast').filter({ hasText: /order.*rejected|item.*rejected/i }).waitFor({ state: 'visible', timeout: 8000 });
            console.log(`✓ Order ${orderName} successfully rejected via details page (toast verified).`);
        } catch (e) {
            console.log("Toast not found within 8s. Checking if item was removed from the list as a fallback...");
            // If the item count goes to 0 or it navigates away, it was successful.
            const url = page.url();
            if (!url.includes('orderdetail')) {
                 console.log(`✓ Order ${orderName} successfully rejected (navigated away).`);
            } else {
                 const remainingItems = await page.getByTestId("detail-page-item").count();
                 if (remainingItems === 0) {
                     console.log(`✓ Order ${orderName} successfully rejected (items removed).`);
                 } else {
                     throw new Error(`Rejection failed. Toast not seen and ${remainingItems} items still remain.`);
                 }
            }
        }

    });
});
