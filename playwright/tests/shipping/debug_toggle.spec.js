import { test, expect } from "../../fixtures";
import { SettingsPage } from "../../pages/settings.page";

test("Debug Settings Toggle", async ({ page }) => {
    await page.goto(process.env.CURRENT_APP_URL);
    const settings = new SettingsPage(page);
    await settings.goToSettings();
    await page.waitForTimeout(2000);

    const toggle = settings.showShippingOrdersToggle;
    
    // Dump outer HTML
    const html = await toggle.evaluate(node => node.outerHTML);
    console.log("--- TOGGLE OUTER HTML ---");
    console.log(html);

    // Read attributes
    const checkedProp = await toggle.evaluate(node => node.checked);
    const ariaChecked = await toggle.evaluate(node => node.getAttribute('aria-checked'));
    const className = await toggle.evaluate(node => node.className);
    
    console.log("--- PROPERTIES ---");
    console.log("node.checked:", checkedProp);
    console.log("aria-checked:", ariaChecked);
    console.log("className:", className);
});
