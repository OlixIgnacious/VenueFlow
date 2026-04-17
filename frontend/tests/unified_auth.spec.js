import { test, expect } from '@playwright/test';
import { setupAuthMocks } from './test_helpers';

/*
- [x] Auth & Routing Unification: Tactical Entry Portal
    - [x] Routing: Consolidate `App.jsx`
        - [x] Remove `/staff/login` and `/staff/register`
        - [x] Map `/login` and `/register` to the new `AuthPortal`
    - [x] Component: Create `AuthPortal.jsx`
        - [x] Design: High-fidelity "Command & Control" look
        - [x] State: Switch between Login and Register
        - [x] Integration: `useAuth` login/register calls
        - [x] Logic: Role-based landing detection
        - [x] **New**: Service Key / Master Key support for Admin
    - [x] Cleanup: Remove old `AuthLogin.jsx` and `AuthRegister.jsx`
    - [x] Verification: Comprehensive Role-Based Tests
        - [x] Admin Test: `admin@venueflow.com` / `password123` -> `/admin/dashboard`
        - [x] Staff Test: Enrollment -> Lands on Staff Portal (Verified with Subagent)
        - [x] Attendee Test: Enrollment -> Lands on My Events
        - [x] Admin Master Key Test: Promotion via `TACTICAL_2026` secret
        - [x] Security Test: Session guard redirects authenticated users
*/

test.describe('Unified Auth & Routing Flow', () => {
  
  test.beforeEach(async ({ page }) => {
    // Reset any state and go to login
    await page.goto('/login');
  });

  test('ADMIN: Successful Login via Seeded Credentials', async ({ page }) => {
    // admin@venueflow.com is a special case in the backend
    await page.getByPlaceholder('AUTHENTICATION EMAIL').fill('admin@venueflow.com');
    await page.getByPlaceholder('SECURE ACCESS KEY').fill('password123');
    await page.getByRole('button', { name: 'ESTABLISH LINK' }).click();

    // Verify redirection to Admin Dashboard
    await expect(page).toHaveURL(/\/admin\/dashboard/);
    await expect(page.getByText('AdminNode')).toBeVisible();
  });

  test('STAFF: New Enrollment Flow', async ({ page }) => {
    await page.getByRole('button', { name: 'New Enrollment' }).click();
    
    // Select Staff Role
    await page.getByRole('button', { name: 'Venue Staff' }).click();
    
    // Fill details
    const uniqueEmail = `staff_${Date.now()}@test.com`;
    await page.getByPlaceholder('FULL LEGAL NAME').fill('Verify Staff');
    await page.getByPlaceholder('AUTHENTICATION EMAIL').fill(uniqueEmail);
    await page.getByPlaceholder('SECURE ACCESS KEY').fill('Password123!');
    
    await page.getByRole('button', { name: 'FINALIZE ENROLLMENT' }).click();

    // Verify redirection to Staff Dashboard
    await expect(page).toHaveURL(/\/staff\/dashboard/);
    await expect(page.getByText('Staff Portal')).toBeVisible();
  });

  test('ATTENDEE: Standard Enrollment Flow', async ({ page }) => {
    await page.getByRole('button', { name: 'New Enrollment' }).click();
    
    // Attendee is default, but let's click it to be sure
    await page.getByRole('button', { name: 'Attendee' }).click();
    
    const uniqueEmail = `user_${Date.now()}@gmail.com`;
    await page.getByPlaceholder('FULL LEGAL NAME').fill('Verify Attendee');
    await page.getByPlaceholder('AUTHENTICATION EMAIL').fill(uniqueEmail);
    await page.getByPlaceholder('SECURE ACCESS KEY').fill('Password123!');
    
    await page.getByRole('button', { name: 'FINALIZE ENROLLMENT' }).click();

    // Verify redirection back to /dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText('My Events')).toBeVisible();
  });

  test('ADMIN: Master Key Registration Override', async ({ page }) => {
    await page.getByRole('button', { name: 'New Enrollment' }).click();
    
    // Even if I select 'Attendee', the Service Key should promote me to Admin
    await page.getByPlaceholder('SERVICE KEY (OPTIONAL)').fill('TACTICAL_2026');
    
    const uniqueEmail = `admin_gen_${Date.now()}@venueflow.com`;
    await page.getByPlaceholder('FULL LEGAL NAME').fill('New Admin');
    await page.getByPlaceholder('AUTHENTICATION EMAIL').fill(uniqueEmail);
    await page.getByPlaceholder('SECURE ACCESS KEY').fill('Password123!');
    
    await page.getByRole('button', { name: 'FINALIZE ENROLLMENT' }).click();

    // Verify redirection to Admin Dashboard despite being an 'enrollment'
    await expect(page).toHaveURL(/\/admin\/dashboard/);
  });

  test('SECURITY: Public Route Protection', async ({ page }) => {
    // Login as attendee first
    await page.getByPlaceholder('AUTHENTICATION EMAIL').fill('tony@stark.com');
    await page.getByPlaceholder('SECURE ACCESS KEY').fill('password123');
    await page.getByRole('button', { name: 'ESTABLISH LINK' }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // Try to visit /login again
    await page.goto('/login');
    
    // Verify it bounces back to /dashboard
    await expect(page).toHaveURL(/\/dashboard/);
  });

});
