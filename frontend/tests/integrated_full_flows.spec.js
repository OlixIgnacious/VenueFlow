import { test, expect } from '@playwright/test';

/**
 * System-Wide Integrated Flow Verification
 * Persona Coverage:
 * 1. Attendee: Login -> View/Claim Ticket -> AI Routing
 * 2. Admin: Login -> Event Monitor -> Personnel Matrix -> Dispatch
 * 3. Staff: Enrollment -> Zero-Tap Redirect -> Incident Reporting
 */

test.describe('VenueFlow: Integrated System Flows', () => {

  test('ATTENDEE: Full Operational Flow', async ({ page }) => {
    // 1. Establish Link
    await page.goto('/login');
    await page.getByPlaceholder('AUTHENTICATION EMAIL').fill('tony@stark.com');
    await page.getByPlaceholder('SECURE ACCESS KEY').fill('password123');
    await page.getByRole('button', { name: 'ESTABLISH LINK' }).click();
    
    // 2. Dashboard - Verified claimed ticket from seed
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText('My Events')).toBeVisible();
    await expect(page.getByText('India vs Australia — T20')).toBeVisible();

    // 3. Request AI Routing via Event Selection
    await page.getByText('India vs Australia — T20').click();
    
    // 4. Verify AI Insights
    await expect(page).toHaveURL(/\/recommendation/);
    await expect(page.getByText('AI is calculating', { exact: false })).not.toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Your Optimal Gate')).toBeVisible();
    await expect(page.getByText('POWERED BY GEMINI')).toBeVisible();
    
    // Verify specific recommendation for Stark's ticket (IND-AUS-101 is Gate A)
    await expect(page.getByRole('heading', { name: 'Gate A' })).toBeVisible();
  });

  test('ADMIN: Full Operational Flow', async ({ page }) => {
    // 1. Command & Control Login
    await page.goto('/login');
    await page.getByPlaceholder('AUTHENTICATION EMAIL').fill('admin@venueflow.com');
    await page.getByPlaceholder('SECURE ACCESS KEY').fill('password123');
    await page.getByRole('button', { name: 'ESTABLISH LINK' }).click();
    
    // 2. Oversight Dashboard
    await expect(page).toHaveURL(/\/admin\/dashboard/);
    await expect(page.getByRole('heading', { name: 'Operational Overview' })).toBeVisible();

    // 3. Inspect Active Event
    const eventCard = page.locator('div').filter({ has: page.getByRole('heading', { name: 'India vs Australia — T20' }) }).first();
    await eventCard.getByText('View Intel').first().click();
    
    // 4. Intelligence Hub Verification
    await expect(page.getByText('Intelligence Hub')).toBeVisible();
    await expect(page.getByText('India vs Australia — T20')).toBeVisible();

    // 5. Personnel Matrix Hub
    await page.getByRole('button', { name: /Personnel Matrix/i }).click();
    await expect(page.getByText('Tactical Deployment Matrix')).toBeVisible();

    // 6. Manual Dispatch Order
    // Wait for staff cards to load from RTDB in the matrix
    await expect(page.getByRole('button', { name: /TACTICAL REDIRECT/i }).first()).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: /TACTICAL REDIRECT/i }).first().click();
    
    // Select Gate C in the modal
    await page.locator('button').filter({ hasText: 'Gate C' }).first().click();
    await page.getByRole('button', { name: 'CONFIRM DISPATCH' }).click();
    await expect(page.getByText('Dispatch order broadcasted')).toBeVisible();
  });

  test('STAFF: Full Operational Flow (Zero-Tap)', async ({ page }) => {
    // 1. New Site Enrollment
    await page.goto('/login');
    await page.getByRole('button', { name: 'New Enrollment' }).click();
    await page.getByRole('button', { name: 'Venue Staff' }).click();
    
    const staffEmail = `staff_auto_${Date.now()}@test.com`;
    await page.getByPlaceholder('FULL LEGAL NAME').fill('Integrated Staff');
    await page.getByPlaceholder('AUTHENTICATION EMAIL').fill(staffEmail);
    await page.getByPlaceholder('SECURE ACCESS KEY').fill('Password123!');
    await page.getByRole('button', { name: 'FINALIZE ENROLLMENT' }).click();

    // 2. Zero-Tap Redirection
    await expect(page).toHaveURL(/\/staff\/event\//, { timeout: 20000 });
    
    // 3. Deployment Check-in
    await page.getByRole('button', { name: 'Gate A' }).click();
    await expect(page.getByText('ACTIVE AT GATE A')).toBeVisible();

    // 4. Tactical Incident Transmission
    await page.getByRole('button', { name: /REPORT INCIDENT/i }).click();
    await page.getByRole('button', { name: 'Technical Failure' }).click();
    await page.getByRole('button', { name: 'Urgent (Bravo)' }).click();
    
    const incidentDesc = 'Automated Integrated Report: Logic board failure detected.';
    await page.getByPlaceholder(/Provide tactical context/i).fill(incidentDesc);
    await page.getByRole('button', { name: 'Transmit Report' }).click();

    // 5. Operational Log Verification
    await page.getByRole('button', { name: /Incident Log/i }).click();
    // Use regex and first() to avoid ambiguity with previous test runs
    await expect(page.getByTestId('incident-description').filter({ hasText: /Automated Integrated Report/ }).first()).toBeVisible({ timeout: 20000 });
  });

});
