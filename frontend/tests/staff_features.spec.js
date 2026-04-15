import { test, expect } from '@playwright/test';

/**
 * Helper: sets up all Firebase auth mocks needed for a clean login.
 * Firebase SDK calls several endpoints after signInWithPassword:
 *   1. accounts:signInWithPassword  → returns idToken + refreshToken
 *   2. token endpoint (securetoken)  → returns refreshed token
 *   3. accounts:lookup (getAccountInfo) → returns user profile
 */
async function setupAuthMocks(page, role = 'staff', uid = 'mock-uid') {
  const email = 'staff_gate@venueflow.com';

  // Firebase: signInWithPassword
  await page.route('**/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        idToken: 'fake-id-token',
        email,
        refreshToken: 'fake-refresh-token',
        expiresIn: '3600',
        localId: uid,
        registered: true
      })
    });
  });

  // Firebase: token refresh (securetoken.googleapis.com)
  await page.route('**/securetoken.googleapis.com/v1/token**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id_token: 'fake-id-token',
        refresh_token: 'fake-refresh-token',
        expires_in: '3600',
        token_type: 'Bearer',
        user_id: uid,
        project_id: 'mock-project'
      })
    });
  });

  // Firebase: getAccountInfo / lookup (validates the token)
  await page.route('**/identitytoolkit.googleapis.com/v1/accounts:lookup**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        users: [{
          localId: uid,
          email,
          emailVerified: true,
          displayName: 'John Staff',
          providerUserInfo: [],
          validSince: String(Math.floor(Date.now() / 1000) - 3600),
          lastLoginAt: String(Date.now()),
          createdAt: String(Date.now() - 86400000)
        }]
      })
    });
  });

  // Backend: profile endpoint — AuthContext calls /api/users/me after login
  await page.route('**/api/users/me', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ uid, role: 'staff', name: 'John Staff' })
    });
  });
}

test.describe('Staff Feature Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthMocks(page, 'staff', 'mock-staff');

    // Mock the Events List — what StaffEventsDashboard fetches
    await page.route('**/api/users/me/events', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: 'mock-event-123',
          name: 'Hackathon Grand Finale',
          venue_name: 'Main Stage',
          status: 'live',
          start_time: new Date().toISOString()
        }])
      });
    });

    // Login via the UI form
    await page.goto('/login');
    await page.fill('#email', 'staff_gate@venueflow.com');
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/staff/dashboard', { timeout: 15000 });
  });

  test('Should display event list and navigate to the Live Crowd Intelligence dashboard', async ({ page }) => {
    // Verify the staff events dashboard loaded with the mocked event card
    await expect(page.locator('text=Hackathon Grand Finale')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('h1')).toContainText('Staff Portal');

    // Mock API calls that StaffDashboard makes on load
    await page.route('**/api/venue/current**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          event: { id: 'mock-event-123', name: 'Hackathon Grand Finale' },
          venue: { name: 'Test Arena', entries: {} }
        })
      });
    });
    await page.route('**/api/events/list**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          'mock-event-123': { id: 'mock-event-123', name: 'Hackathon Grand Finale' }
        })
      });
    });

    // Navigate directly to the staff gate control for the event
    await page.goto('/staff/event/mock-event-123');
    await expect(page).toHaveURL(/.*\/staff\/event\/mock-event-123/);

    // Verify the Crowd Intelligence dashboard header is rendered
    await expect(page.locator('h2')).toContainText('Crowd Intelligence');
  });
});
