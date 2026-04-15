import { test, expect } from '@playwright/test';

/**
 * Helper: sets up all Firebase auth mocks needed for a clean login.
 * Firebase SDK calls several endpoints after signInWithPassword:
 *   1. accounts:signInWithPassword  → returns idToken + refreshToken
 *   2. token endpoint (securetoken)  → returns refreshed token
 *   3. accounts:lookup (getAccountInfo) → returns user profile
 */
async function setupAuthMocks(page, role = 'attendee', uid = 'mock-uid') {
  const email = role === 'staff' ? 'staff_gate@venueflow.com' : 'jane@example.com';

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
          displayName: role === 'staff' ? 'John Staff' : 'Jane Attendee',
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
      body: JSON.stringify({ uid, role, name: role === 'staff' ? 'John Staff' : 'Jane Attendee' })
    });
  });
}

test.describe('Attendee Feature Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthMocks(page, 'attendee', 'mock-attendee');

    // Mock Attendee events so the dashboard renders the event card
    await page.route('**/api/users/me/events', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: 'mock-event-123',
          name: 'Mock Event',
          status: 'live',
          start_time: new Date().toISOString()
        }])
      });
    });

    // Login via the UI form
    await page.goto('/login');
    await page.fill('#email', 'jane@example.com');
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
  });

  test('Should fetch and display AI Recommendation from raw reference', async ({ page }) => {
    // Mock the AI recommendation endpoint — auto-called on page load with ?ref=
    await page.route('**/api/recommend**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          recommended_entry: 'Entry Gate 4 - VIP Only',
          wait_minutes: 2,
          crowd_level: 'low',
          reason: 'Currently the lowest congestion for your VIP status.',
          alt_entry_id: 'Gate 1',
          tips: 'Have your credentials ready.'
        })
      });
    });

    // Mock VenueContext config
    await page.route('**/api/venue/current**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          event: { id: 'mock-event-123', name: 'Mock Event' },
          venue: { name: 'Mock Arena', entries: {} }
        })
      });
    });

    // Navigate to Recommendation page with required ?ref= param
    await page.goto('/recommendation?ref=VIP-1&eventId=mock-event-123');

    // Verify the AI result is rendered — the page heading and Gemini attribution
    // always render once the /api/recommend call succeeds
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=AI Recommendation')).toBeVisible();
    await expect(page.locator('text=Powered by Gemini 2.5 Flash')).toBeVisible();
  });
});
