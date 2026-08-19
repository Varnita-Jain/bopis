import { test, expect } from "../../fixtures";
import { SettingsPage } from "../../pages/settings.page";
import { OrderPage } from "../../pages/orders/orders.page";

test("Dump Shipping Orders Card Actions", async ({ page }) => {
    test.setTimeout(120000);
    await page.goto(process.env.CURRENT_APP_URL);
    await page.waitForLoadState("networkidle");

    const settingsPage = new SettingsPage(page);
    await settingsPage.ensureShippingMode();

    const orderPage = new OrderPage(page);
    
    // Switch to New tab (first segment button in Shipping mode)
    await page.getByTestId("orders-tab-button").click();
    await page.waitForTimeout(5000);
    
    const newTab = page.locator("ion-segment-button").nth(0);
    await newTab.click();
    await page.waitForTimeout(5000);

    const firstCard = page.getByTestId("order-card").first();
    await expect(firstCard).toBeVisible({ timeout: 15000 });
    
    const orderName = await firstCard.getByTestId("order-name-tag").innerText();
    console.log("Found Order:", orderName);

    const buttons = await firstCard.locator("ion-button").allInnerTexts();
    console.log("ACTION BUTTONS ON CARD:", buttons);
});
