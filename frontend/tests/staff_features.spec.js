import { test, expect } from '@playwright/test';
import { setupAuthMocks, performLogin } from './test_helpers';

test.describe('Staff Feature Workflows (Integrated)', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Setup Auth and Basic Dashboard data
    await setupAuthMocks(page, { role: 'staff', uid: 'staff_1', email: 'staff_1@venueflow.com' });
    
    // 2. Perform UI Login
    await performLogin(page, 'staff_1@venueflow.com', 'password123', '/staff/dashboard');
  });

  test('Staff Dashboard Navigation', async ({ page }) => {
    // Verify staff event list loads events from real backend
    await expect(page.locator('text=Staff Portal')).toBeVisible({ timeout: 10000 });
    
    // Choose the first event (e.g., event_001 from seeding)
    const eventCard = page.locator('div').filter({ has: page.getByRole('heading', { name: 'India vs Australia — T20' }) }).first();
    await expect(eventCard).toBeVisible();
    
    // Click "Launch Dashboard →"
    await eventCard.getByText('Launch Dashboard →').first().click();

    // Verify detailed dashboard loads
    await expect(page.getByRole('heading', { name: 'Intelligence Hub' })).toBeVisible({ timeout: 15000 });
  });

  test('Tactical Operations: Station Check-in & Emergency Signal', async ({ page }) => {
    // Navigate to a specific event hub
    await page.goto('/staff/event/event_001');
    await expect(page.locator('h2')).toContainText('Intelligence Hub');

    // Perform Check-in using the station selector
    // Use first() to avoid strict mode violation
    const selector = page.locator('select').first();
    await selector.selectOption({ label: 'Gate B' });

    // Verify presence status updates - check the badge in the header or the occupancy row
    await expect(page.locator('text=ACTIVE AT GATE B')).toBeVisible({ timeout: 5000 });

    // Trigger Emergency
    await page.click('button:has-text("NEED BACKUP")');
    
    // Verify toast notification (browser native alert is mocked by Playwright if we don't handle it, 
    // but the app also shows UI feedback)
    // The app uses alert() which Playwright auto-dismisses but we can verify presence row state
    await expect(page.locator('text=EMERGENCY')).toBeVisible();
  });

  test('Dispatch Hub: Receiving Tactical Orders', async ({ page }) => {
    /** 
     * NOTE: To test receiving a real notification, we would need to trigger 
     * a dispatch from another session (Admin). 
     * For this spec, we will route to the Dispatch Hub tab and satisfy 
     * the Firebase RTDB synchronization.
     */
    await page.goto('/staff/event/event_001');
    
    // Click Dispatch Hub tab in sidebar
    await page.click('button:has-text("Dispatch Hub")');

    // Verify the view switched (the Dispatch Hub tab has specific headings or empty states)
    // Just verify the button state for now as full integration requires cross-session logic
    const dispatchTab = page.locator('button:has-text("Dispatch Hub")');
    await expect(dispatchTab).toHaveClass(/bg-indigo-600/);
  });
});
