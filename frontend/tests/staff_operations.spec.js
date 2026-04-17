import { test, expect } from '@playwright/test';

test.describe('Staff Tactical Operational Flow', () => {
  
  test.beforeEach(async ({ page }) => {
    // Reset state and go to login
    await page.goto('/login');
  });

  test('FULL FLOW: Staff Enrollment -> Deployment -> Incident Reporting -> Admin Oversight', async ({ page }) => {
    // Increase test timeout for this comprehensive E2E flow
    test.setTimeout(90000);

    // 1. STAFF ENROLLMENT
    await page.getByRole('button', { name: 'New Enrollment' }).click();
    await page.getByRole('button', { name: 'Venue Staff' }).click();
    
    const staffEmail = `staff_tactical_${Date.now()}@test.com`;
    const staffName = 'Tactical Operator One';
    
    await page.getByPlaceholder('FULL LEGAL NAME').fill(staffName);
    await page.getByPlaceholder('AUTHENTICATION EMAIL').fill(staffEmail);
    await page.getByPlaceholder('SECURE ACCESS KEY').fill('Password123!');
    await page.getByRole('button', { name: 'FINALIZE ENROLLMENT' }).click();

    // 2. DEPLOYMENT PORTAL (Mandatory Check-in)
    // Zero-Tap: auth redirects to /staff/dashboard, which auto-launches /staff/event/:eventId
    await expect(page).toHaveURL(/\/staff\/event\//, { timeout: 25000 });
    
    // Deployment Portal heading: "Deployment <span>Required</span>" renders as "Deployment Required"
    await expect(page.getByRole('heading', { name: /Deployment/i })).toBeVisible({ timeout: 15000 });

    // Select first available gate to check-in (Gate A)
    await page.getByRole('button', { name: /Gate A/i }).click();
    
    // Wait for internal 'Scanning' animation (1200ms) then the main dashboard surface
    await expect(page.getByText('Intelligence Hub')).toBeVisible({ timeout: 10000 });
    // Verify presence indicator shows the checked-in gate
    await expect(page.getByText(/Active at Gate A/i)).toBeVisible({ timeout: 5000 });

    // 3. INCIDENT REPORTING
    // Wait for dashboard to fully hydrate after check-in transition
    await page.waitForTimeout(2000);
    
    // Click 'REPORT INCIDENT' button in header
    await page.getByRole('button', { name: /REPORT INCIDENT/i }).click();
    
    // Fill out Incident Modal
    await expect(page.getByText(/Incident Classification/i)).toBeVisible({ timeout: 5000 });
    
    // Select 'Technical Failure' type
    await page.getByRole('button', { name: /Technical Failure/i }).click();
    
    // Select 'Urgent (Bravo)' severity (default, but click to confirm)
    await page.getByRole('button', { name: /Urgent \(Bravo\)/i }).click();
    
    // Fill description
    const incidentDesc = 'Automated Test: Turnstile T-01 logic board failing.';
    await page.getByPlaceholder(/Provide tactical context/i).fill(incidentDesc);
    
    // Submit
    await page.getByRole('button', { name: /Transmit Report/i }).click();
    
    // Modal should close - wait for it to be removed from DOM
    await expect(page.getByText('Incident Classification')).not.toBeVisible({ timeout: 10000 });
    
    // 4. VERIFY LOG SYNC
    // Small delay to allow RTDB -> Frontend propagation
    await page.waitForTimeout(1500);
    
    // Switch to 'Incident Log' tab and verify transition
    const incidentLogTab = page.getByRole('button', { name: /Incident Log/i });
    await incidentLogTab.click();
    await expect(incidentLogTab).toHaveClass(/bg-rose-600/, { timeout: 10000 });
    
    // Step 1: Wait for Operational Incident Log heading to confirm tab switch
    await expect(page.getByRole('heading', { name: /Operational Incident Log/i })).toBeVisible({ timeout: 15000 });
    
    // Step 2: Wait for ANY incident card to surge (confirming RTDB hydration)
    const anyCard = page.getByTestId('incident-card').first();
    await expect(anyCard).toBeVisible({ timeout: 20000 });

    // Step 3: Wait specifically for our incident descriptionSurged 
    // We use a loose regex to avoid whitespace/newline issues in the matcher
    const incidentLabel = page.getByTestId('incident-description').filter({ hasText: /Automated Test.*Turnstile/ });
    await expect(incidentLabel).toBeVisible({ timeout: 30000 });
    
    // Final proof screenshot of the SURGED log
    await page.screenshot({ path: 'test-results/incident-log-SURGED.png' });

    // 5. ADMIN OVERSIGHT
    // Sign out as Staff
    await page.getByRole('button', { name: /Sign Out/i }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

    // Login as Admin
    await page.getByPlaceholder('AUTHENTICATION EMAIL').fill('admin@venueflow.com');
    await page.getByPlaceholder('SECURE ACCESS KEY').fill('password123');
    await page.getByRole('button', { name: /ESTABLISH LINK/i }).click();
    
    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 15000 });
    
    // Open 'Incident Command' tab
    await page.getByRole('button', { name: /Incident Command/i }).click();
    
    // Verify the incident is listed in the Admin Command Center
    // AdminDashboard renders incident.type.replace('_', ' ') — stored type is 'technical'
    await expect(page.getByText('technical')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(incidentDesc)).toBeVisible();
    await expect(page.getByText(`Reporter: ${staffName}`)).toBeVisible();
  });

});
