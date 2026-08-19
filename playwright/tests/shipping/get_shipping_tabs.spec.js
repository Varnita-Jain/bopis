import { test, expect } from "../../fixtures";
import { SettingsPage } from "../../pages/settings.page";

test("Dump Shipping Tabs", async ({ page }) => {
    test.setTimeout(120000);
    await page.goto(process.env.CURRENT_APP_URL);
    await page.waitForLoadState("networkidle");

    const settingsPage = new SettingsPage(page);
    await settingsPage.goToSettings();

    // Ensure Shipping Orders is ON
    const isChecked = await settingsPage.showShippingOrdersToggle.evaluate(el => el.shadowRoot.querySelector('input').getAttribute('aria-checked'));
    console.log("Shipping Orders Toggle is initially:", isChecked);

    // Go to Orders tab
    await page.getByTestId("orders-tab-button").click();
    await page.waitForTimeout(5000);

    // Dump all segment buttons (tabs)
    const tabs = await page.locator("ion-segment-button").allInnerTexts();
    console.log("AVAILABLE TABS IN SHIPPING MODE:");
    console.log(tabs);
});
