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

  test('Intelligence Hub Dashboard (Staff View) should be accessible', async ({ page }) => {
    // Audit the complex tactical hub
    await setupAuthMocks(page, { role: 'staff', email: 'staff_1@venueflow.com' });
    await performLogin(page, 'staff_1@venueflow.com', 'password123', '/staff/');
    await page.goto('/staff/event/event_001');

    // Wait for data to load ensuring we audit the actual interactive state
    await expect(page.locator('h2')).toContainText('Intelligence Hub', { timeout: 15000 });

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
