import { } from '@playwright/test';

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

  // signUp (registration)
  await page.route('**/identitytoolkit.googleapis.com/v1/accounts:signUp**', async route => {
    const postData = JSON.parse(route.request().postData() || '{}');
    const requestedEmail = postData.email || email;
    console.log(`[Mock] Firebase SignUp Intercepted: ${requestedEmail}`);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        idToken: `fake-id-token-${role}`,
        email: requestedEmail,
        refreshToken: 'fake-refresh-token',
        expiresIn: '999999',
        localId: uid,
        kind: 'identitytoolkit#SignupNewUserResponse'
      })
    });
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

  // Mock /api/users/me so login redirect works without TESTING=true on the backend
  await page.route('**/api/users/me/events', async route => {
    console.log(`[Mock] /api/users/me/events intercepted`);
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });

  await page.route('**/api/users/me', async route => {
    console.log(`[Mock] /api/users/me intercepted`);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ uid, email, name, role })
    });
  });

  // Mock /api/auth/sync for registration flows
  await page.route('**/api/auth/sync', async route => {
    const postData = JSON.parse(route.request().postData() || '{}');
    const syncRole = postData.service_key ? 'admin' : (postData.role || role);
    console.log(`[Mock] /api/auth/sync intercepted, role: ${syncRole}`);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: { uid, email: postData.email || email, name: postData.name || name, role: syncRole }
      })
    });
  });
}

/**
 * Stateful Firebase RTDB WebSocket mock. Handles listen, unlisten, and write
 * operations. State persists across WebSocket reconnections (e.g., auth changes)
 * so data written by one role is visible to another within the same test.
 */
export async function setupRtdbMock(page, { entryPoints = {}, staffPresence = {}, incidents = {} } = {}) {
  // Shared store + listeners persist across WebSocket reconnections
  const store = {};
  const activeListeners = new Map(); // normalizedPath → true

  const setStore = (path, data) => {
    const keys = path.split('/').filter(Boolean);
    let obj = store;
    for (let i = 0; i < keys.length - 1; i++) {
      if (obj[keys[i]] == null || typeof obj[keys[i]] !== 'object') obj[keys[i]] = {};
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = data;
  };

  const getStore = (path) => {
    const keys = path.split('/').filter(Boolean);
    let obj = store;
    for (const key of keys) {
      if (obj == null || typeof obj !== 'object') return null;
      obj = obj[key];
    }
    return obj ?? null;
  };

  // Pre-seed store
  Object.entries(entryPoints).forEach(([eventId, data]) => setStore(`entry_points/${eventId}`, data));
  Object.entries(staffPresence).forEach(([eventId, data]) => setStore(`staff_presence/${eventId}`, data));
  Object.entries(incidents).forEach(([eventId, data]) => setStore(`incidents/${eventId}`, data));

  await page.routeWebSocket(/wss:\/\/.*\.firebaseio\.com/, ws => {
    // Firebase RTDB hello handshake
    ws.send(JSON.stringify({
      t: 'c',
      d: { t: 'h', d: { ts: Date.now(), v: '5', h: 'venueflow-185ef-default-rtdb.firebaseio.com', s: 'mock-session' } }
    }));

    const sendData = (listenPath, wsRef) => {
      const norm = listenPath.replace(/^\//, '');
      const data = getStore(norm);
      const p = listenPath.startsWith('/') ? listenPath : `/${listenPath}`;
      wsRef.send(JSON.stringify({ t: 'd', d: { a: 'd', b: { p, d: data } } }));
    };

    ws.onMessage(rawMsg => {
      try {
        const msg = JSON.parse(rawMsg);
        if (msg.t !== 'd') return;
        const { r: reqNum, a: action, b: body } = msg.d || {};

        if (action === 'auth' || action === 'gauth' || action === 's') {
          if (reqNum) ws.send(JSON.stringify({ t: 'd', d: { r: reqNum, b: { s: 'ok', d: null } } }));
          return;
        }

        if (action === 'q' && body?.p) {
          const norm = body.p.replace(/^\//, '');
          activeListeners.set(norm, true);
          const data = getStore(norm);
          ws.send(JSON.stringify({ t: 'd', d: { r: reqNum, b: { s: 'ok', d: data } } }));
          ws.send(JSON.stringify({ t: 'd', d: { a: 'd', b: { p: body.p, d: data } } }));
          return;
        }

        if (action === 'p' && body?.p) {
          const norm = body.p.replace(/^\//, '');
          setStore(norm, body.d);
          ws.send(JSON.stringify({ t: 'd', d: { r: reqNum, b: { s: 'ok', d: null } } }));
          // Push updated data to all matching active listeners
          for (const listenerPath of activeListeners.keys()) {
            if (norm === listenerPath || norm.startsWith(listenerPath + '/') || listenerPath.startsWith(norm + '/')) {
              sendData(listenerPath, ws);
            }
          }
          return;
        }

        if (action === 'n' && body?.p) {
          const norm = body.p.replace(/^\//, '');
          activeListeners.delete(norm);
          if (reqNum) ws.send(JSON.stringify({ t: 'd', d: { r: reqNum, b: { s: 'ok', d: null } } }));
          return;
        }

        if (reqNum) ws.send(JSON.stringify({ t: 'd', d: { r: reqNum, b: { s: 'ok', d: null } } }));
      } catch (e) {
        console.log('[RTDB Mock] Parse error:', String(rawMsg).slice(0, 100), e.message);
      }
    });
  });
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

  console.log(`[Test] Submitting form via Enter...`);
  await page.press('#password', 'Enter');
  
  console.log(`[Test] Waiting for URL: ${targetUrl}`);
  await page.waitForURL(new RegExp(targetUrl), { timeout: 30000 });
  console.log(`[Test] Landed on: ${page.url()}`);
}
