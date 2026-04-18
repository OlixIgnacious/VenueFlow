import { test, expect } from '@playwright/test';
import { setupAuthMocks, performLogin } from './test_helpers';

test.describe('Admin Command & Control Matrix (Integrated)', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Setup Admin Auth
    await setupAuthMocks(page, { role: 'admin', uid: 'admin_uid', email: 'admin@venueflow.com' });

    // 2. Perform Login
    await performLogin(page, 'admin@venueflow.com', 'password123', '/admin/');
  });

  test('Personnel Oversight: Staff Matrix & AI Recommendations', async ({ page }) => {
    // Verify Admin Dashboard loads
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Global Grid')).toBeVisible({ timeout: 15000 });

    // Navigate to Intelligence Hub — click the event card directly (it has onClick)
    const eventCard = page.locator('.group').filter({ hasText: /India vs Australia/i }).first();
    await eventCard.click();

    // Verify IntelligenceHubView loaded (h2 added to component)
    await expect(page.getByText('Intelligence Hub')).toBeVisible({ timeout: 15000 });

    // Switch to Personnel Matrix tab in the Admin sidebar
    const personnelTab = page.getByRole('button', { name: 'Personnel Matrix' });
    await expect(personnelTab).toBeVisible();
    await personnelTab.click();

    // Verify the Tactical Deployment Matrix heading loads (h3 added to AdminPersonnelMatrix)
    await expect(page.getByText('Tactical Deployment Matrix')).toBeVisible({ timeout: 10000 });

    // Navigate to the AI Tactical sub-tab inside IntelligenceHubView
    await page.getByRole('button', { name: 'AI Tactical' }).click();

    // Trigger AI Recommendations via the RESCAN button
    const refreshBtn = page.locator('button:has-text("RESCAN SYSTEM PULSE")');
    await expect(refreshBtn).toBeVisible({ timeout: 10000 });
    await refreshBtn.click();

    // Verify AI Advisory panel appears (real Gemini backend call)
    await expect(page.getByText('Tactical Advisory')).toBeVisible({ timeout: 20000 });

    // Apply first AI recommendation
    await page.click('button:has-text("EXECUTE REDIRECT")');

    // Verify Dispatch Toast
    await expect(page.locator('text=Dispatch order broadcasted')).toBeVisible({ timeout: 10000 });
  });

  test('Manual Dispatch: Dynamic Personnel Allocation', async ({ page }) => {
    // Navigate to Intelligence Hub
    const eventCard = page.locator('.group').filter({ hasText: /India vs Australia/i }).first();
    await eventCard.click();
    await expect(page.getByText('Intelligence Hub')).toBeVisible({ timeout: 15000 });

    // Open Personnel Matrix
    await page.getByRole('button', { name: 'Personnel Matrix' }).click();

    // Switch to Staff sub-tab within IntelligenceHubView
    await page.getByRole('button', { name: 'Staff' }).click();

    // Click Dispatch on any staff row
    const dispatchBtn = page.locator('button:has-text("Dispatch")').first();
    await dispatchBtn.click();

    // Select Gate B from the dispatch modal gate list
    await page.click('text=Gate B');

    // Confirm the dispatch
    await page.click('button:has-text("CONFIRM DISPATCH")');

    // Verify confirmation toast
    await expect(page.locator('text=Dispatch order broadcasted')).toBeVisible({ timeout: 10000 });
  });
});
