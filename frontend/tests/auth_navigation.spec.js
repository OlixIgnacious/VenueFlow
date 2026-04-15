import { test, expect } from '@playwright/test';

test.describe('VenueFlow Authentication & Routing Matrix', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the app before each test
    page.on('console', msg => console.log(`BROWSER [${msg.type()}]: ${msg.text()}`));
    page.setDefaultTimeout(15000); // 15s
    await page.goto('/');
  });

  test('Admin Redirect: admin@venueflow.com -> /admin/dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@venueflow.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Should redirect to admin dashboard
    await expect(page).toHaveURL(/\/admin\/dashboard/);
    await expect(page.locator('h1')).toContainText('Admin Control');
  });

  test('Staff Redirect: staff_gate@venueflow.com -> /staff/dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'staff_gate@venueflow.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Should redirect to staff dashboard
    await expect(page).toHaveURL(/\/staff\/dashboard/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Staff Portal');
  });

  test('Attendee Redirect: tony@stark.com -> /dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'tony@stark.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Should redirect to personal dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('My Events');
  });

  test('Access Control: Attendee cannot hit /admin/dashboard', async ({ page }) => {
    // 1. Login as Attendee
    await page.goto('/login');
    await page.fill('input[type="email"]', 'tony@stark.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');

    // 2. Try to manually navigate to Admin URL
    await page.goto('/admin/dashboard');

    // 3. Should bounce back to landing page with Access Denied toast
    await expect(page).toHaveURL('/');
    // Target the entire toast container using a robust locator
    const toast = page.locator('div.fixed').filter({ hasText: 'Access Denied' });
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('You do not have permission to view this dashboard');
  });

  test('Sign Out Reliability', async ({ page }) => {
    // 1. Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@venueflow.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/admin\/dashboard/);

    // 2. Click Sign Out
    await page.click('button:has-text("Sign Out")');

    // 3. Should return to Login
    await expect(page).toHaveURL(/\/login/);
  });

  test('Registration Validation: Reject Weak Password', async ({ page }) => {
    await page.goto('/register');
    await page.fill('input[type="text"]', 'Test User');
    await page.fill('input[type="email"]', 'test.weakpass@venueflow.com');
    await page.fill('input[type="password"]', 'weak123'); // Missing uppercase or special char
    await page.click('button[type="submit"]');

    const errorMsg = page.locator('.bg-red-500\\/10');
    await expect(errorMsg).toBeVisible();
    await expect(errorMsg).toContainText('Password must be at least 8 characters');
    await expect(page).toHaveURL(/\/register/);
  });
});
