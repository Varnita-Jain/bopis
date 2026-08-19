const { test: baseTest, expect } = require("@playwright/test");
const path = require("path");
const { getClientConfig } = require("./config/clients.js");

// Load environment variables from .env file
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const test = baseTest.extend({
  // Provide client config to tests
  client: [async ({ }, use, testInfo) => {
    let clientId = process.env.CLIENT; 
    
    // Extract clientId from the project name (e.g. chromium-krewe-uat)
    if (testInfo.project.name && testInfo.project.name.startsWith('chromium-')) {
      clientId = testInfo.project.name.replace('chromium-', '');
    }

    // Default fallback if running outside a specific client project
    if (!clientId) {
      clientId = 'dev-oms'; 
    }

    const clientConfig = getClientConfig(clientId);
    
    // Inject CURRENT_APP_URL into process.env so legacy tests continue to work without modification
    process.env.CURRENT_APP_URL = clientConfig.baseUrl;

    await use(clientConfig);
  }, { auto: true }],
});

module.exports = { test, expect };
