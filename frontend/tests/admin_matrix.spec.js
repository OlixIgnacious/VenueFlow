import { test, expect } from '@playwright/test';
import { setupAuthMocks, setupRtdbMock, performLogin } from './test_helpers';

const MOCK_ENTRY_POINTS = {
  event_001: {
    gate_a: { label: 'Gate A', status: 'low', density: 12 },
    gate_b: { label: 'Gate B', status: 'high', density: 88 },
    gate_c: { label: 'Gate C', status: 'medium', density: 45 },
  }
};

const MOCK_STAFF_PRESENCE = {
  event_001: {
    staff_uid_1: { status: 'active', current_gate_id: 'gate_a', last_seen: Date.now() }
  }
};

// Admin dashboard has a fixed 288px sidebar — requires desktop viewport to avoid layout overlap
test.use({ viewport: { width: 1280, height: 720 } });

test.describe('Admin Command & Control Matrix (Integrated)', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Setup Admin Auth mocks
    await setupAuthMocks(page, { role: 'admin', uid: 'admin_uid', email: 'admin@venueflow.com' });

    // 2. Mock Firebase RTDB (replaces WebSocket so loading resolves immediately)
    await setupRtdbMock(page, { entryPoints: MOCK_ENTRY_POINTS, staffPresence: MOCK_STAFF_PRESENCE });

    // 3. Override events mock AFTER setupAuthMocks (LIFO — this takes precedence)
    await page.route('**/api/users/me/events', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'event_001', name: 'India vs Australia', status: 'live', start_time: new Date().toISOString() },
          { id: 'event_003', name: 'Champions League Final', status: 'upcoming', start_time: new Date().toISOString() }
        ])
      });
    });

    // 4. Mock admin personnel endpoint
    await page.route('**/api/admin/personnel/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { uid: 'staff_uid_1', name: 'Alex Rivera', email: 'alex@venueflow.com', role: 'staff' }
        ])
      });
    });

    // 5. Mock AI dispatch advice
    await page.route('**/api/admin/dispatch-advice/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          recommendations: [
            { staff_uid: 'staff_uid_1', staff_name: 'Alex Rivera', target_gate_id: 'gate_b', reason: 'Gate B is at critical capacity. Immediate redirect required.' }
          ]
        })
      });
    });

    // 6. Mock dispatch POST
    await page.route('**/api/admin/dispatch', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"status":"ok"}' });
    });

    // 7. Perform Login
    await performLogin(page, 'admin@venueflow.com', 'password123', '/admin/');
  });

  test('Personnel Oversight: Staff Matrix & AI Recommendations', async ({ page }) => {
    // Verify Admin Dashboard loads
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Global Grid')).toBeVisible({ timeout: 15000 });

    // Navigate to Intelligence Hub — click the event card directly (it has onClick)
    const eventCard = page.locator('.group').filter({ hasText: /India vs Australia/i }).first();
    await eventCard.click();

    // Verify IntelligenceHubView loaded
    await expect(page.getByRole('heading', { name: 'Intelligence Hub' })).toBeVisible({ timeout: 15000 });

    // Switch to Personnel Matrix tab in the Admin sidebar
    const personnelTab = page.getByRole('button', { name: 'Personnel Matrix' });
    await expect(personnelTab).toBeVisible();
    await personnelTab.click();

    // Verify the Tactical Deployment Matrix heading loads
    await expect(page.getByText('Tactical Deployment Matrix')).toBeVisible({ timeout: 10000 });

    // Navigate to the AI Tactical sub-tab inside IntelligenceHubView (role="tab" not "button")
    await page.getByRole('tab', { name: 'AI Tactical' }).click();

    // Trigger AI Recommendations via the RESCAN button
    const refreshBtn = page.locator('button:has-text("RESCAN SYSTEM PULSE")');
    await expect(refreshBtn).toBeVisible({ timeout: 10000 });
    await refreshBtn.click();

    // Verify AI Advisory panel appears
    await expect(page.getByText('Tactical Advisory')).toBeVisible({ timeout: 10000 });

    // Apply first AI recommendation
    await page.click('button:has-text("EXECUTE REDIRECT")');

    // Verify Dispatch Toast
    await expect(page.locator('text=Dispatch order broadcasted')).toBeVisible({ timeout: 10000 });
  });

  test('Manual Dispatch: Dynamic Personnel Allocation', async ({ page }) => {
    // Navigate to Intelligence Hub
    const eventCard = page.locator('.group').filter({ hasText: /India vs Australia/i }).first();
    await eventCard.click();
    await expect(page.getByRole('heading', { name: 'Intelligence Hub' })).toBeVisible({ timeout: 15000 });

    // Open Personnel Matrix (sidebar tab — re-mounts IntelligenceHubView with initialTab="personnel")
    await page.getByRole('button', { name: 'Personnel Matrix' }).click();

    // Click the Staff sub-tab to ensure we're on the personnel panel (role="tab" not "button")
    await page.getByRole('tab', { name: 'Staff' }).click();

    // Click Redeploy on the online staff row (button text is "Redeploy" in AdminPersonnelMatrix)
    const redeployBtn = page.locator('button:has-text("Redeploy")').first();
    await expect(redeployBtn).toBeVisible({ timeout: 10000 });
    await redeployBtn.click();

    // Select Gate B from the dispatch modal gate list
    await page.click('text=Gate B');

    // Confirm the dispatch
    await page.click('button:has-text("CONFIRM DISPATCH")');

    // Verify confirmation toast
    await expect(page.locator('text=Dispatch order broadcasted')).toBeVisible({ timeout: 10000 });
  });
});
