const fs = require('fs');
const path = require('path');
const { expect } = require("@playwright/test");

const AUTH_DIR = path.join(__dirname, '../.auth');

function ensureAuthDir() {
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }
}

function getAuthStatePath(clientId) {
  return path.join(AUTH_DIR, `${clientId}.json`);
}

async function performLogin(page, clientConfig) {
  // Mock the appVersions API to prevent the 404 error on UAT from crashing the Login UI
  await page.route('**/appVersions**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({})
  }));

  const { clientId, baseUrl, username, password, oms } = clientConfig;
  
  if (!username || !password) {
    throw new Error(`Credentials missing for ${clientId}. Provide username/password in CLIENTS JSON or env.`);
  }

  console.log(`\nStarting direct login flow for BOPIS (${clientId})...`);
  console.log(`Navigating to ${baseUrl}`);
  await page.goto(baseUrl);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000); // Give Vue/Ionic time to settle

  // Handle Launchpad redirect for OMS input
  const nextBtn = page.locator('ion-button:has-text("NEXT"), button:has-text("NEXT")').first();
  if (await nextBtn.isVisible().catch(() => false)) {
    console.log(`Launchpad OMS screen detected. Filling OMS...`);
    const omsInput = page.locator('ion-input, input[type="text"]').first();
    // Default to the full url for the client, similar to Fulfillment
    const omsUrl = oms || `https://${clientId}.hotwax.io`;
    
    await omsInput.click();
    await page.keyboard.type(omsUrl, { delay: 50 });
    await page.waitForTimeout(1000); // Wait for Vue to detect input and enable the NEXT button
    
    await nextBtn.click({ force: true }).catch(() => {});
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(2000);
  }

  // Fill login form
  const userField = page.locator('input[name="username"], input[name="USERNAME"], ion-input[name="username"] input, input[placeholder*="sername"]').first();
  await expect(userField).toBeVisible({ timeout: 15000 });
  
  console.log(`Filling credentials for ${clientId}...`);
  await userField.click();
  await page.keyboard.type(username, { delay: 50 });
  
  const passField = page.locator('input[name="password"], input[type="password"]').first();
  await passField.click();
  await page.keyboard.type(password, { delay: 50 });
  await passField.press('Enter');
  
  // Try to find OMS field if it's on the same screen (for non-Launchpad direct logins)
  const omsField = page.locator('input[name="oms"]').first();
  if (await omsField.isVisible().catch(() => false)) {
    await omsField.click();
    await page.keyboard.type(oms || `https://${clientId}.hotwax.io`, { delay: 50 });
  }

  await page.waitForTimeout(1000);
  const loginBtn = page.locator('ion-button:has-text("Login"), button:has-text("Login"), ion-button:has-text("LOGIN"), button:has-text("LOGIN")').first();
  if (await loginBtn.isVisible().catch(() => false)) {
      await loginBtn.click({ force: true }).catch(() => {});
  }
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(5000); // Give extra time for tokens to be saved in LocalStorage

  // Final verification that we are successfully logged in
  try {
    await Promise.any([
      page.waitForURL(/\/tabs\/orders/i, { timeout: 15000 }),
      page.waitForSelector('ion-menu', { state: 'visible', timeout: 15000 })
    ]);
  } catch (e) {
     const permissionError = page.locator(':has-text("You do not have permission")').first();
     if (await permissionError.isVisible().catch(() => false)) {
        throw new Error(`Login Failed for ${clientId}: You do not have permission to access the app.`);
     }
     
     const invalidAuth = page.locator(':has-text("Invalid username or password")').first();
     if (await invalidAuth.isVisible().catch(() => false)) {
        throw new Error(`Login Failed for ${clientId}: Invalid username or password.`);
     }

     throw new Error(`Login Failed for ${clientId}: Did not reach the dashboard after login. URL: ${page.url()}`);
  }

  console.log(`Successfully logged into BOPIS for ${clientId}`);
}

function saveAuthState(clientId, state) {
  ensureAuthDir();
  fs.writeFileSync(getAuthStatePath(clientId), JSON.stringify(state, null, 2));
}

function loadAuthState(clientId) {
  const filePath = getAuthStatePath(clientId);
  return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf-8')) : null;
}

function isSessionValid(clientId) {
  return fs.existsSync(getAuthStatePath(clientId));
}

module.exports = {
  performLogin,
  saveAuthState,
  loadAuthState,
  isSessionValid,
  getAuthStatePath
};
