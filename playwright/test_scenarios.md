# Test Scenarios Document

> [!NOTE]
> This document details the end-to-end (E2E) test scenarios for the BOPIS App, specifically focusing on the login flow and packed orders page.

## Compatibility & Metadata

| Tool / Dependency | Version / Date |
| :--- | :--- |
| **App Version** | `4.11.0` |
| **Node.js** | `v18.20.8` (or compatible `^22.0.0` as per package.json types) |
| **Playwright** | `^1.58.0` |
| **Last Updated Date** | 2026-07-17 |

## 1. Login Flow Scenarios
**File:** [login-flow.spec.js](file:///Users/varnitajain/Desktop/Projects/bopis/playwright/tests/login-flow.spec.js)

### Scenario 1.1: Successful Login (Positive)
- **Description:** Verify user can select the BOPIS app and complete the full login flow.
- **Steps:**
  1. Navigate to the BOPIS app login URL.
  2. Enter a valid OMS Name and click Next.
  3. Enter a valid Username and Password.
  4. Click Login.
- **Expected Result:** User is successfully logged in and navigated away from the login page to the authenticated session.

### Scenario 1.2: Empty OMS Field (Negative)
- **Description:** Verify error behavior when the OMS field is left empty.
- **Steps:**
  1. Navigate to the BOPIS app login URL.
  2. Attempt to proceed by clicking Next without entering the OMS Name.
- **Expected Result:** The user remains on or proceeds to the login page, where server-side validation handles the empty OMS.

### Scenario 1.3: Invalid Username (Negative)
- **Description:** Verify error message for an invalid username.
- **Steps:**
  1. Navigate to login and enter a valid OMS Name.
  2. Enter an invalid username (e.g., `invalid-user`).
  3. Leave password empty (or enter any value).
  4. Attempt to click Login if enabled.
- **Expected Result:** The login button may be disabled, or if clicked, the login fails, an error message is displayed, and the user remains on the login page.

### Scenario 1.4: Invalid Password (Negative)
- **Description:** Verify error message for an invalid password with a valid username.
- **Steps:**
  1. Navigate to login and enter a valid OMS Name.
  2. Enter a valid username.
  3. Enter an invalid password (e.g., `wrongpassword`).
  4. Click Login.
- **Expected Result:** Login fails, an error message is displayed, and the user remains on the login page.

### Scenario 1.5: Empty Username (Negative)
- **Description:** Verify error behavior when the username field is empty.
- **Steps:**
  1. Navigate to login and enter a valid OMS Name.
  2. Leave the username field empty.
  3. Enter a valid password.
  4. Attempt to click Login.
- **Expected Result:** The login button is disabled, or if clicked, the login fails and the user remains on the login page.

### Scenario 1.6: Empty Password (Negative)
- **Description:** Verify error behavior when the password field is empty.
- **Steps:**
  1. Navigate to login and enter a valid OMS Name.
  2. Enter a valid username.
  3. Leave the password field empty.
  4. Attempt to click Login.
- **Expected Result:** The login button is disabled, or if clicked, the login fails and the user remains on the login page.

### Scenario 1.7: Invalid OMS (Negative)
- **Description:** Verify error behavior when an invalid OMS is entered.
- **Steps:**
  1. Navigate to the BOPIS app login URL.
  2. Enter an invalid OMS Name (e.g., `invalid-oms-12345`).
  3. Click Next.
- **Expected Result:** The app UI may accept it and proceed to the login form, but the authentication will ultimately fail on server-side validation, keeping the user on the login page.

---

## 2. Packed Orders Page Actions (Page Object Model)
**File:** [pack-orders.page.js](file:///Users/varnitajain/Desktop/Projects/bopis/playwright/pages/orders/pack-orders.page.js)

While this is a Page Object rather than a test spec, it supports the automation of the following scenarios:

### Scenario 2.1: Navigate to Packed Tab
- **Description:** Verify the user can switch to the "Packed" tab.
- **Steps:** Click the "Packed" segment button and wait for the orders container or the "no orders" message to be visible.

### Scenario 2.2: Gift Card Activation
- **Description:** Verify the user can open an order that requires gift card activation.
- **Steps:** Filter order cards for those containing a gift card activation button and click the first available one.

### Scenario 2.3: Order Details & Handover
- **Description:** Verify the user can view order details and mark them as ready for handover.
- **Steps:**
  1. Open the first order card.
  2. Alternatively, scan up to 8 cards to find one with a "Handover/Ship" button.
  3. Click the handover button.

### Scenario 2.4: Print Packing Slip
- **Description:** Verify the user can print a packing slip from the list view.
- **Steps:** Click the packing slip button on the first order card and verify that a popup (blob or PDF) opens correctly.

---

## 3. Flow 1: BOPIS Order Lifecycle (Pickup)
**File:** [bopis-lifecycle.spec.js](file:///Users/varnitajain/Desktop/Projects/bopis/playwright/tests/pickup/bopis-lifecycle.spec.js)

### Scenario 3.1: Full Store Pickup Lifecycle (Open -> Packed -> Completed)
- **Description:** Verify the complete fulfillment lifecycle for a BOPIS (Buy Online, Pick Up In Store) order.
- **Steps:**
  1. Navigate to Settings and ensure the environment toggle is set to "Pickup" mode.
  2. Navigate to the Orders tab and scan the "Open" list for a valid, non-corrupted order.
  3. Open the order details and click "Pack".
  4. Ensure a success confirmation (toast) is received. If an API error toast occurs (due to bad ghost order data), gracefully skip and try the next order.
  5. Navigate to the "Packed" tab, search for the packed order, and open its details.
  6. Click "Handover" to hand the items to the customer.
  7. Navigate to the "Completed" tab and verify the order appears in the completed list.
- **Expected Result:** The order correctly transitions through all 3 stages without application failure.

---

## 4. Flow 2: Shipping Order Lifecycle
**Files:** 
- [shipping-lifecycle.spec.js](file:///Users/varnitajain/Desktop/Projects/bopis/playwright/tests/shipping/shipping-lifecycle.spec.js) (Via Order Details)
- [shipping-lifecycle-via-tabs.spec.js](file:///Users/varnitajain/Desktop/Projects/bopis/playwright/tests/shipping/shipping-lifecycle-via-tabs.spec.js) (Via Quick Action Buttons)

### Scenario 4.1: Assign Pickers Modal Resolution
- **Description:** Verify the application can correctly assign a picker to a shipping order using the modal.
- **Steps:**
  1. Click "Ready to Ship" on an open order.
  2. Wait for the "Assign Pickers" modal to appear.
  3. Select a picker from the modal list.
  4. Click the generic "Save" button (floppy disk icon) inside the Shadow DOM container of the modal.
- **Expected Result:** The picker is assigned and the order progresses to the packed state.

### Scenario 4.2: Full Shipping Lifecycle (Via Details Page)
- **Description:** Verify the complete fulfillment lifecycle for a Shipping order by opening the detailed view for each step.
- **Steps:**
  1. Navigate to Settings and ensure the environment toggle is set to "Shipping" mode.
  2. Iterate through open orders to find a fresh, uncorrupted order.
  3. Open the order details and click "Ready to Ship". Handle the Assign Pickers modal if it appears.
  4. Catch any unfulfillable API data errors (via toast messages). If an error occurs, the test automatically skips to the next order in the list.
  5. Once successfully packed, navigate to the "Packed" tab.
  6. Open the order details and click "Ship".
  7. Navigate to the "Completed" tab and verify the shipped order appears.
- **Expected Result:** The order correctly transitions to Dispatched/Completed state and API errors are handled gracefully without aborting the suite.

### Scenario 4.3: Full Shipping Lifecycle (Via Quick Action Tabs)
- **Description:** Verify the shipping lifecycle can be completed rapidly using only the action buttons on the order cards, without entering the detailed view.
- **Steps:**
  1. Find a valid open order card.
  2. Click the "READY TO SHIP" button directly on the card.
  3. Handle the Assign Picker modal.
  4. Wait for the success toast and gracefully handle any data-corruption errors by skipping.
  5. Go to the "Packed" tab, find the order card, and click the "SHIP" button directly on the card.
  6. Verify the order moves to the "Completed" tab.
- **Expected Result:** Card action buttons correctly trigger the API state transitions.
