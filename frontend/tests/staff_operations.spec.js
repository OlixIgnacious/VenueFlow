import { test, expect } from '@playwright/test';
import { setupAuthMocks, setupRtdbMock, performLogin } from './test_helpers.js';

const MOCK_ENTRY_POINTS = {
  event_001: {
    gate_a: { label: 'Gate A', status: 'low', density: 10, wait_minutes: 2 },
    gate_b: { label: 'Gate B', status: 'high', density: 88, wait_minutes: 12 },
  }
};

const MOCK_EVENT = { id: 'event_001', name: 'India vs Australia', status: 'live', start_time: new Date().toISOString() };

// Staff dashboard has a fixed sidebar — requires desktop viewport to avoid layout overlap
test.use({ viewport: { width: 1280, height: 720 } });

test.describe('Staff Tactical Operational Flow', () => {

  test('FULL FLOW: Staff Deployment → Incident Reporting → Admin Oversight', async ({ page }) => {
    test.setTimeout(90000);

    const STAFF_EMAIL = 'staff_1@venueflow.com';
    const ADMIN_EMAIL = 'admin@venueflow.com';
    const INCIDENT_DESC = 'Automated Test: Turnstile T-01 logic board failing.';

    // --- MOCKS SETUP ---
    await setupAuthMocks(page, { role: 'staff', uid: 'staff_uid', email: STAFF_EMAIL, name: 'Mock Staff' });

    // Stateful RTDB mock: no pre-seeded presence (deployment portal will show)
    await setupRtdbMock(page, { entryPoints: MOCK_ENTRY_POINTS });

    // Backend: one event so StaffEventsDashboard auto-redirects to /staff/event/event_001
    await page.route('**/api/users/me/events', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([MOCK_EVENT]) });
    });

    // VenueContext: provides event data (eventId fallback from URL works too if this fails)
    await page.route('**/api/venue/current**', async route => {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ venue: { id: 'venue_001', name: 'Test Arena' }, event: MOCK_EVENT })
      });
    });

    // Event switcher list in StaffDashboard sidebar
    await page.route('**/api/events/list', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ event_001: MOCK_EVENT }) });
    });

    // --- PHASE 1: STAFF LOGIN ---
    await performLogin(page, STAFF_EMAIL, 'password123', '/staff/');

    // StaffEventsDashboard sees 1 event → auto-redirects to /staff/event/event_001
    await expect(page).toHaveURL(/\/staff\/event\//, { timeout: 25000 });

    // --- PHASE 2: DEPLOYMENT PORTAL ---
    // No presence pre-seeded → deployment portal shows
    await expect(page.getByRole('heading', { name: /Deployment/i })).toBeVisible({ timeout: 15000 });

    // Gate buttons appear from RTDB mock entry points
    await expect(page.getByRole('button', { name: /Gate A/i })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Gate A/i }).click();

    // After 1200ms scanning + RTDB write + push → presence sets → full dashboard shows
    await expect(page.getByRole('heading', { name: 'Intelligence Hub' })).toBeVisible({ timeout: 15000 });

    // --- PHASE 3: INCIDENT REPORTING ---
    await page.getByRole('button', { name: /REPORT INCIDENT/i }).click();
    await expect(page.getByText(/Incident Classification/i)).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: /Technical Failure/i }).click();
    await page.getByRole('button', { name: /Urgent.*Bravo/i }).click();
    await page.getByPlaceholder(/tactical context/i).fill(INCIDENT_DESC);
    await page.getByRole('button', { name: /Transmit Report/i }).click();

    // Modal closes after successful submit
    await expect(page.getByText('Incident Classification')).not.toBeVisible({ timeout: 10000 });

    // --- PHASE 4: VERIFY INCIDENT IN LOG TAB ---
    await page.waitForTimeout(500);
    await page.getByRole('tab', { name: 'Log' }).click();

    await expect(page.getByText('technical')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(INCIDENT_DESC)).toBeVisible({ timeout: 10000 });

    // --- PHASE 5: ADMIN OVERSIGHT ---
    await page.getByRole('button', { name: /Disconnect/i }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

    // Override auth mocks for admin (LIFO — these take precedence)
    await page.route('**/accounts:signInWithPassword**', async route => {
      const postData = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ idToken: 'fake-id-token-admin', email: postData.email, refreshToken: 'fake-refresh-token', expiresIn: '999999', localId: 'admin_uid', registered: true })
      });
    });
    await page.route('**/accounts:lookup**', async route => {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ users: [{ localId: 'admin_uid', email: ADMIN_EMAIL, emailVerified: true, displayName: 'Admin User', validSince: '1', lastLoginAt: String(Date.now()), createdAt: String(Date.now() - 86400000) }] })
      });
    });
    await page.route('**/api/users/me', async route => {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ uid: 'admin_uid', email: ADMIN_EMAIL, name: 'Mock Admin', role: 'admin' })
      });
    });
    await page.route('**/api/users/me/events', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([MOCK_EVENT]) });
    });
    await page.route('**/api/admin/personnel/**', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    await page.getByPlaceholder('AUTHENTICATION EMAIL').fill(ADMIN_EMAIL);
    await page.getByPlaceholder('SECURE ACCESS KEY').fill('password123');
    await page.getByRole('button', { name: 'ESTABLISH LINK' }).click();

    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 15000 });

    // Navigate to Intelligence Hub, then Incident Command
    await page.waitForLoadState('networkidle');
    const eventCard = page.locator('.group').filter({ hasText: /India vs Australia/i }).first();
    await expect(eventCard).toBeVisible({ timeout: 15000 });
    await eventCard.click();
    await expect(page.getByRole('heading', { name: 'Intelligence Hub' })).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'Incident Command' }).click();

    // Incident written by staff should be visible (RTDB store persisted across WS connections)
    await expect(page.getByText('technical')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(INCIDENT_DESC)).toBeVisible({ timeout: 10000 });
  });

});
