import { test, expect } from '@playwright/test';

/**
 * Universal auth mocks dynamically returning role based on the email provided.
 */
async function setupAuthMocks(page) {
  let currentRole = 'attendee';

  await page.route('**/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword**', async route => {
    const postData = JSON.parse(route.request().postData() || '{}');
    const email = postData.email || 'test@example.com';
    
    if (email.includes('admin')) currentRole = 'admin';
    else if (email.includes('staff')) currentRole = 'staff';
    else currentRole = 'attendee';

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        idToken: 'fake-id-token',
        email,
        refreshToken: 'fake-refresh-token',
        expiresIn: '3600',
        localId: 'mock-uid',
        registered: true
      })
    });
  });

  await page.route('**/securetoken.googleapis.com/v1/token**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id_token: 'fake-id-token',
        refresh_token: 'fake-refresh-token',
        expires_in: '3600',
        token_type: 'Bearer',
        user_id: 'mock-uid',
        project_id: 'mock-project'
      })
    });
  });

  await page.route('**/identitytoolkit.googleapis.com/v1/accounts:lookup**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        users: [{
          localId: 'mock-uid',
          email: 'test@example.com',
          emailVerified: true,
          createdAt: '1234567890',
          lastLoginAt: '1234567890'
        }]
      })
    });
  });

  await page.route('**/api/users/me', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        uid: 'mock-uid',
        email: 'test@example.com',
        role: currentRole,
        created_at: new Date().toISOString()
      })
    });
  });

  await page.route('**/api/events', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([])
    });
  });
}

test.describe('VenueFlow Authentication & Routing Matrix', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the app before each test
    page.on('console', msg => console.log(`BROWSER [${msg.type()}]: ${msg.text()}`));
    page.setDefaultTimeout(15000); // 15s
    await setupAuthMocks(page);
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

    // 3. Should bounce back to their dashboard with Access Denied toast
    await expect(page).toHaveURL('/dashboard');
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

  test.describe('Authenticated Redirection (PublicRoute)', () => {
    test('Attendee should be redirected from landing page to /dashboard', async ({ page }) => {
      // 1. Mock logged in attendee
      await page.goto('/login');
      await page.fill('input[type="email"]', 'tony@stark.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL('/dashboard');

      // 2. Try to go to landing page
      await page.goto('/');
      
      // 3. Should be bounced back to dashboard
      await expect(page).toHaveURL('/dashboard');
    });

    test('Staff should be redirected from login page to /staff/dashboard', async ({ page }) => {
      // 1. Mock logged in staff
      await page.goto('/login');
      await page.fill('input[type="email"]', 'staff_gate@venueflow.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL('/staff/dashboard');

      // 2. Try to go to /login again
      await page.goto('/login');
      
      // 3. Should be bounced to staff dashboard
      await expect(page).toHaveURL('/staff/dashboard');
    });

    test('Admin should be redirected from staff login to /admin/dashboard', async ({ page }) => {
      // 1. Mock logged in admin
      await page.goto('/login');
      await page.fill('input[type="email"]', 'admin@venueflow.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL('/admin/dashboard');

      // 2. Try to go to /staff/login
      await page.goto('/staff/login');
      
      // 3. Should be bounced to admin dashboard
      await expect(page).toHaveURL('/admin/dashboard');
    });
  });
});
