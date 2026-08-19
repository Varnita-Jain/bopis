// @ts-check
import { defineConfig, devices } from "@playwright/test";

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import clientsModule from './playwright/config/clients.js';
import authModule from './playwright/helpers/auth.js';

const { getAllClients } = clientsModule;
const { getAuthStatePath } = authModule;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '.env') });

const clients = getAllClients();

const clientProjects = clients.map(client => ({
  name: `chromium-${client.clientId}`,
  dependencies: ["setup"],
  testIgnore: [/auth\.setup\.js/, /login-flow\.spec\.js/],
  use: { 
    ...devices["Desktop Chrome"], 
    storageState: getAuthStatePath(client.clientId),
  },
}));

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./playwright/tests",
  /* Run tests in files in parallel */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 1 : 0,
  /* Use only 1 worker for sequential test execution */
  workers: 1,
  /* Increase timeout to 3 minutes */
  timeout: 180000,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: "html",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.js/,
    },
    ...clientProjects
  ],
});
