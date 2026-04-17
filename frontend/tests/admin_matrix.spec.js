import { test, expect } from '@playwright/test';
import { setupAuthMocks, performLogin } from './test_helpers';

test.describe('Admin Command & Control Matrix (Integrated)', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Setup Admin Auth
    await setupAuthMocks(page, { role: 'admin', uid: 'admin_uid', email: 'admin@venueflow.com' });
    
    // 2. Perform Login
    await performLogin(page, 'admin@venueflow.com', 'password123', '/admin/dashboard');
  });

  test('Personnel Oversight: Staff Matrix & AI Recommendations', async ({ page }) => {
    // Verify Admin Dashboard loads events
    await expect(page.getByText('Global Events Overview')).toBeVisible({ timeout: 10000 });
    
    // Navigate to Intelligence Hub for event_001
    // Using robust locator: .first() ensures we get the OUTER card div
    const eventCard = page.locator('div').filter({ has: page.getByRole('heading', { name: 'India vs Australia — T20' }) }).first();
    await eventCard.getByText('Monitor Dash →').first().click();
    
    await expect(page.getByRole('heading', { name: 'Intelligence Hub' })).toBeVisible({ timeout: 15000 });

    // Switch to Personnel Matrix tab (Sidebar)
    const personnelTab = page.getByRole('button', { name: 'Personnel Matrix' });
    await expect(personnelTab).toBeVisible();
    await personnelTab.click();

    // Verify Matrix loads
    await expect(page.getByText('Tactical Deployment Matrix')).toBeVisible();

    // Trigger AI Tactical Recommendations
    const refreshBtn = page.locator('button:has-text("Refresh Analytics")');
    await expect(refreshBtn).toBeVisible();
    await refreshBtn.click();

    // Verify AI Recommendation Panel appears
    // Since we hit the real backend, we wait for a real Gemini response
    // The user wants to "always hit the backend/get the data"
    await expect(page.locator('text=AI TACTICAL RECOMMENDATIONS')).toBeVisible({ timeout: 20000 });
    
    // Verify at least one recommendation is visible
    // Recommendation cards usually have "Move [Staff Name]"
    await expect(page.locator('text=Move')).toBeVisible();

    // Apply AI Recommendation
    await page.click('button:has-text("APPLY AI RECOMMENDATION")');
    
    // Verify Dispatch Toast
    await expect(page.locator('text=Dispatch order broadcasted')).toBeVisible();
  });

  test('Manual Dispatch: Dynamic Personnel Allocation', async ({ page }) => {
    await page.goto('/staff/event/event_001');
    await page.click('button:has-text("Personnel Matrix")');

    // Click Dispatch on any staff row
    const dispatchBtn = page.locator('button:has-text("Dispatch")').first();
    await dispatchBtn.click();

    // Verify Gate list dropdown/options (Chinnaswamy labels derived from seeding)
    // Seeding uses "Gate A", "Gate B", "Accessibility Ramp"
    await page.click('text=Gate B');

    // Verify confirmation
    await expect(page.locator('text=Dispatch order broadcasted')).toBeVisible();
  });
});
