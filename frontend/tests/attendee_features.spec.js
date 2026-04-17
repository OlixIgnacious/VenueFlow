import { test, expect } from '@playwright/test';
import { setupAuthMocks, performLogin } from './test_helpers';

test.describe('Attendee Feature Workflows (Integrated)', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Setup Attendee Auth
    await setupAuthMocks(page, { role: 'attendee', uid: 'tony_stark', email: 'tony@stark.com', name: 'Tony Stark' });
    
    // 2. Perform Login
    await performLogin(page, 'tony@stark.com', 'password123', '/dashboard');
  });

  test('AI Entrance Routing: Real-time Recommendation', async ({ page }) => {
    // Verify Attendee Dashboard loads
    await expect(page.locator('h1')).toContainText('My Events');

    // Click on an event (e.g., event_001) using robust heading filter
    // .first() ensures we get the outer card div
    const eventCard = page.locator('div').filter({ has: page.getByRole('heading', { name: 'India vs Australia — T20' }) }).first();
    await expect(eventCard).toBeVisible();
    await eventCard.click();

    // Verify detailed event page for attendee
    await expect(page.locator('h2')).toContainText('Event Information');

    // Enter Ticket ID (Ticket 'IND-AUS-101' is seeded for Tony Stark)
    await page.fill('input[placeholder="Enter your Ticket ID"]', 'IND-AUS-101');

    // Click Recommendation Button
    await page.click('text=Get Enter Recommendation →');

    // Verify AI response panel
    // Since we hit the real backend, we wait for a real response
    await expect(page.locator('text=AI ROUTING ACTIVE')).toBeVisible({ timeout: 20000 });
    
    // Verify wait time or gate identification
    await expect(page.locator('text=WAIT TIME')).toBeVisible();
    await expect(page.locator('text=POWERED BY GEMINI')).toBeVisible();
  });
});
