import { test, expect } from '@playwright/test';
import { setupAuthMocks } from './test_helpers';

test.describe('Unified Auth & Routing Flow', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('ADMIN: Successful Login via Seeded Credentials', async ({ page }) => {
    await setupAuthMocks(page, { role: 'admin', uid: 'admin_uid', email: 'admin@venueflow.com' });

    await page.getByPlaceholder('AUTHENTICATION EMAIL').fill('admin@venueflow.com');
    await page.getByPlaceholder('SECURE ACCESS KEY').fill('password123');
    await page.getByRole('button', { name: 'ESTABLISH LINK' }).click();

    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 15000 });
    await expect(page.getByText('Global Grid')).toBeVisible();
  });

  test('STAFF: New Enrollment Flow', async ({ page }) => {
    await setupAuthMocks(page, { role: 'staff', uid: 'staff_uid' });

    await page.getByRole('button', { name: 'New Enrollment' }).click();
    await page.getByRole('button', { name: 'Venue Staff' }).click();

    const uniqueEmail = `staff_${Date.now()}@test.com`;
    await page.getByPlaceholder('FULL LEGAL NAME').fill('Verify Staff');
    await page.getByPlaceholder('AUTHENTICATION EMAIL').fill(uniqueEmail);
    await page.getByPlaceholder('SECURE ACCESS KEY').fill('Password123!');

    await page.getByRole('button', { name: 'FINALIZE ENROLLMENT' }).click();

    await expect(page).toHaveURL(/\/staff\/dashboard/, { timeout: 15000 });
    await expect(page.getByText('Staff Portal')).toBeVisible();
  });

  test('ATTENDEE: Standard Enrollment Flow', async ({ page }) => {
    await setupAuthMocks(page, { role: 'attendee', uid: 'attendee_uid' });

    await page.getByRole('button', { name: 'New Enrollment' }).click();
    await page.getByRole('button', { name: 'Attendee' }).click();

    const uniqueEmail = `user_${Date.now()}@gmail.com`;
    await page.getByPlaceholder('FULL LEGAL NAME').fill('Verify Attendee');
    await page.getByPlaceholder('AUTHENTICATION EMAIL').fill(uniqueEmail);
    await page.getByPlaceholder('SECURE ACCESS KEY').fill('Password123!');

    await page.getByRole('button', { name: 'FINALIZE ENROLLMENT' }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    await expect(page.getByText('Tactical Ticketing')).toBeVisible();
  });

  test('ADMIN: Master Key Registration Override', async ({ page }) => {
    await setupAuthMocks(page, { role: 'admin', uid: 'admin_gen_uid' });

    await page.getByRole('button', { name: 'New Enrollment' }).click();
    await page.getByPlaceholder('SERVICE KEY (OPTIONAL)').fill('TACTICAL_2026');

    const uniqueEmail = `admin_gen_${Date.now()}@venueflow.com`;
    await page.getByPlaceholder('FULL LEGAL NAME').fill('New Admin');
    await page.getByPlaceholder('AUTHENTICATION EMAIL').fill(uniqueEmail);
    await page.getByPlaceholder('SECURE ACCESS KEY').fill('Password123!');

    await page.getByRole('button', { name: 'FINALIZE ENROLLMENT' }).click();

    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 15000 });
  });

  test('SECURITY: Public Route Protection', async ({ page }) => {
    await setupAuthMocks(page, { role: 'attendee', uid: 'attendee_uid', email: 'tony@stark.com' });

    await page.getByPlaceholder('AUTHENTICATION EMAIL').fill('tony@stark.com');
    await page.getByPlaceholder('SECURE ACCESS KEY').fill('password123');
    await page.getByRole('button', { name: 'ESTABLISH LINK' }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    await page.goto('/login');
    await expect(page).toHaveURL(/\/dashboard/);
  });

});
