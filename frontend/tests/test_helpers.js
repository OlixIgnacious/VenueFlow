import { expect } from '@playwright/test';

/**
 * Universal helper for Firebase Auth and Backend Profile mocks.
 * This ensures the frontend 'thinks' it's authenticated while 
 * allowing it to hit the real backend API (via the auth bypass).
 */
export async function setupAuthMocks(page, options = {}) {
  const { role = 'admin', email = 'test@example.com', uid = 'mock-uid', name = 'Mock User' } = options;
  
  // Log all requests for debugging
  page.on('request', request => {
    if (!request.url().includes('static') && !request.url().includes('google-analytics')) {
      console.log(`[Network] ${request.method()} ${request.url()}`);
    }
  });

  // 1. Firebase Auth Mocks (Required to satisfy the Firebase JS SDK)
  
  // Catch-all for other auth requests to see what's happening
  await page.route('**/identitytoolkit.googleapis.com/v1/**', async route => {
    console.log(`[Mock] Firebase Global Request: ${route.request().url()}`);
    await route.continue();
  });

  // signInWithPassword
  await page.route('**/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword**', async route => {
    const postData = JSON.parse(route.request().postData() || '{}');
    const requestedEmail = postData.email || email;
    console.log(`[Mock] Firebase SignIn Intercepted: ${requestedEmail}`);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        idToken: `fake-id-token-${role}`,
        email: requestedEmail,
        refreshToken: 'fake-refresh-token',
        expiresIn: '999999', // Ensure it doesn't expire immediately
        localId: uid,
        registered: true
      })
    });
  });

  // token refresh
  await page.route('**/securetoken.googleapis.com/v1/token**', async route => {
    console.log(`[Mock] Firebase Token Refresh Request`);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id_token: `fake-id-token-${role}`,
        refresh_token: 'fake-refresh-token',
        expires_in: '999999',
        token_type: 'Bearer',
        user_id: uid,
        project_id: 'mock-project'
      })
    });
  });

  // getAccountInfo (lookup)
  await page.route('**/identitytoolkit.googleapis.com/v1/accounts:lookup**', async route => {
    console.log(`[Mock] Firebase Lookup Intercepted`);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        users: [{
          localId: uid,
          email: email, 
          emailVerified: true,
          displayName: `Mock ${role}`,
          providerUserInfo: [],
          validSince: '1', // Set to very old time
          lastLoginAt: String(Date.now()),
          createdAt: String(Date.now() - 86400000)
        }]
      })
    });
  });

  /**
   * NOTE: We are NOT mocking /api/users/me or other backend endpoints here.
   * This allows the tests to HIT THE REAL BACKEND as requested, 
   * thanks to the 'fake-id-token' bypass in auth_middleware.py.
   */
}

/**
 * Helper to perform a full UI login for any role.
 */
export async function performLogin(page, email, password, targetUrl) {
  console.log(`[Test] Attempting login: ${email} -> expecting: ${targetUrl}`);
  await page.goto('/login');
  
  // Choose Email/Password if tab exists (it depends on UI)
  const emailTab = page.locator('button:has-text("Email")');
  if (await emailTab.isVisible()) {
    await emailTab.click();
  }

  await page.fill('#email', email);
  await page.fill('#password', password);
  
  console.log(`[Test] Waiting for submit button to be enabled...`);
  await page.waitForSelector('button[type="submit"]:not(:disabled)', { timeout: 15000 });
  
  console.log(`[Test] Clicking submit button...`);
  await page.click('button[type="submit"]');
  
  console.log(`[Test] Waiting for URL: ${targetUrl}`);
  await page.waitForURL(new RegExp(targetUrl), { timeout: 30000 });
  console.log(`[Test] Landed on: ${page.url()}`);
}
