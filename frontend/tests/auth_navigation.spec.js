import { test, expect } from '@playwright/test';
import { setupAuthMocks, performLogin } from './test_helpers';

test.describe('VenueFlow Authentication & Routing Matrix (Integrated)', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the app before each test
    page.setDefaultTimeout(15000); 
    await setupAuthMocks(page);
    await page.goto('/');
  });

  test('Admin Redirect: admin@venueflow.com -> /admin/dashboard', async ({ page }) => {
    await performLogin(page, 'admin@venueflow.com', 'password123', '/admin/dashboard');

    // Verify Admin Dashboard specific labels
    await expect(page.locator('h1')).toContainText('Admin Control');
    await expect(page.locator('text=Global Events Overview')).toBeVisible();
  });

  test('Staff Redirect: staff_1@venueflow.com -> /staff/dashboard', async ({ page }) => {
    // Note: Using staff_1 which is seeded in the backend
    await performLogin(page, 'staff_1@venueflow.com', 'password123', '/staff/dashboard');

    // Verify Staff Portal labels
    await expect(page.locator('h1')).toContainText('Staff Portal');
    await expect(page.locator('text=Monitor Intelligence')).toBeVisible();
  });

  test('Attendee Redirect: tony@stark.com -> /dashboard', async ({ page }) => {
    await performLogin(page, 'tony@stark.com', 'password123', '/dashboard');

    // Verify Attendee Dashboard labels
    await expect(page.locator('h1')).toContainText('My Events');
  });

  test('Access Control: Attendee cannot hit /admin/dashboard', async ({ page }) => {
    // 1. Login as Attendee
    await performLogin(page, 'tony@stark.com', 'password123', '/dashboard');

    // 2. Try to manually navigate to Admin URL
    await page.goto('/admin/dashboard');

    // 3. Should bounce back to their dashboard with Access Denied toast
    await expect(page).toHaveURL('/dashboard');
    const toast = page.locator('div').filter({ hasText: 'Access Denied' });
    await expect(toast).toBeVisible();
  });

  test('Sign Out Reliability', async ({ page }) => {
    await performLogin(page, 'admin@venueflow.com', 'password123', '/admin/dashboard');

    // Click Sign Out
    await page.click('button:has-text("Sign Out")');

    // Should return to Login
    await expect(page).toHaveURL(/\/login/);
  });
});
