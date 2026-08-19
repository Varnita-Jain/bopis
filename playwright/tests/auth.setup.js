import { test as setup, expect } from "@playwright/test";
import { getAllClients } from "../config/clients.js";
import { performLogin, getAuthStatePath } from "../helpers/auth.js";
import fs from "fs";
import path from "path";

const clients = getAllClients();

for (const client of clients) {
  setup(`authenticate ${client.clientId}`, async ({ page }) => {
    const authFile = getAuthStatePath(client.clientId);
    fs.mkdirSync(path.dirname(authFile), { recursive: true });

    await performLogin(page, client);
    await page.context().storageState({ path: authFile });
  });
}
