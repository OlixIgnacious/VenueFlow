import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { setupAuthMocks, performLogin } from './test_helpers';

test.describe('Accessibility Audits (WCAG AA)', () => {
  test('Landing Page should not have any automatically detectable accessibility issues', async ({ page }) => {
    await page.goto('/');
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Auth Login should not have any automatically detectable accessibility issues', async ({ page }) => {
    await page.goto('/login');
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Staff Portal should be accessible', async ({ page }) => {
    await setupAuthMocks(page, { role: 'staff', email: 'staff_1@venueflow.com' });

    // Return 2 events so the event list renders (1 would auto-redirect; 0 shows text-slate-500 empty state)
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

    await performLogin(page, 'staff_1@venueflow.com', 'password123', '/staff/');

    await expect(page.getByText('Staff Portal')).toBeVisible({ timeout: 15000 });

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
