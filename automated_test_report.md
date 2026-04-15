# VenueFlow Automated Testing Report
Generated on: 2026-04-16 00:56:29

## Overall Status: ✅ SUCCESS

---

## 🏗️ Backend Access Control (Pytest)
**Status:** PASS

### Test Summary
```text
============================= test session starts ==============================
platform darwin -- Python 3.9.6, pytest-8.0.0, pluggy-1.6.0 -- /Applications/Xcode.app/Contents/Developer/usr/bin/python3
cachedir: .pytest_cache
rootdir: /Users/olixstudios/Documents/workspace/Projects/hackathons/VenueFlow
configfile: pytest.ini
plugins: anyio-4.12.1, cov-5.0.0, asyncio-1.2.0, mock-3.12.0
asyncio: mode=auto, debug=False, asyncio_default_fixture_loop_scope=None, asyncio_default_test_loop_scope=function
collecting ... collected 4 items

tests/backend/test_access_control.py::test_get_profile_admin PASSED      [ 25%]
tests/backend/test_access_control.py::test_get_events_staff_restricted PASSED [ 50%]
tests/backend/test_access_control.py::test_get_events_attendee_restricted PASSED [ 75%]
tests/backend/test_access_control.py::test_admin_api_key_required PASSED [100%]

=============================== warnings summary ===============================
../../../../../Library/Python/3.9/lib/python/site-packages/starlette/formparsers.py:12
  /Users/olixstudios/Library/Python/3.9/lib/python/site-packages/starlette/formparsers.py:12: PendingDeprecationWarning: Please use `import python_multipart` instead.
    import multipart

../../../../../Library/Python/3.9/lib/python/site-packages/google/auth/__init__.py:54
  /Users/olixstudios/Library/Python/3.9/lib/python/site-packages/google/auth/__init__.py:54: FutureWarning: You are using a Python version 3.9 past its end of life. Google will update google-auth with critical bug fixes on a best-effort basis, but not with any other fixes or features. Please upgrade your Python version, and then update google-auth.
    warnings.warn(eol_message.format("3.9"), FutureWarning)

../../../../../Library/Python/3.9/lib/python/site-packages/urllib3/__init__.py:35
  /Users/olixstudios/Library/Python/3.9/lib/python/site-packages/urllib3/__init__.py:35: NotOpenSSLWarning: urllib3 v2 only supports OpenSSL 1.1.1+, currently the 'ssl' module is compiled with 'LibreSSL 2.8.3'. See: https://github.com/urllib3/urllib3/issues/3020
    warnings.warn(

../../../../../Library/Python/3.9/lib/python/site-packages/google/oauth2/__init__.py:40
  /Users/olixstudios/Library/Python/3.9/lib/python/site-packages/google/oauth2/__init__.py:40: FutureWarning: You are using a Python version 3.9 past its end of life. Google will update google-auth with critical bug fixes on a best-effort basis, but not with any other fixes or features. Please upgrade your Python version, and then update google-auth.
    warnings.warn(eol_message.format("3.9"), FutureWarning)

-- Docs: https://docs.pytest.org/en/stable/how-to/capture-warnings.html
======================== 4 passed, 4 warnings in 2.72s =========================

```

---

## 🌐 Frontend E2E & Redirection (Playwright)
**Status:** PASS

### Test Summary
```text

Running 6 tests using 1 worker

[1A[2K[1/6] [chromium] › tests/auth_navigation.spec.js:12:3 › VenueFlow Authentication & Routing Matrix › Admin Redirect: admin@venueflow.com -> /admin/dashboard
[1A[2K[chromium] › tests/auth_navigation.spec.js:12:3 › VenueFlow Authentication & Routing Matrix › Admin Redirect: admin@venueflow.com -> /admin/dashboard
BROWSER [debug]: [vite] connecting...

[1A[2KBROWSER [debug]: [vite] connected.

[1A[2KBROWSER [debug]: [vite] connecting...

[1A[2KBROWSER [debug]: [vite] connected.

[1A[2KBROWSER [info]: %cDownload the React DevTools for a better development experience: https://react.dev/link/react-devtools font-weight:bold

[1A[2KBROWSER [debug]: [vite] connecting...

[1A[2KBROWSER [debug]: [vite] connected.

[1A[2KBROWSER [info]: %cDownload the React DevTools for a better development experience: https://react.dev/link/react-devtools font-weight:bold

[1A[2KBROWSER [log]: [VenueContext] URL Change Detected. event_id (URL): null, current (State): undefined

[1A[2KBROWSER [log]: [VenueContext] No event in state or URL, fetching default/cached.

[1A[2KBROWSER [log]: [VenueContext] URL Change Detected. event_id (URL): null, current (State): undefined

[1A[2KBROWSER [log]: [VenueContext] No event in state or URL, fetching default/cached.

[1A[2K[2/6] [chromium] › tests/auth_navigation.spec.js:23:3 › VenueFlow Authentication & Routing Matrix › Staff Redirect: staff_gate@venueflow.com -> /staff/dashboard
[1A[2K[chromium] › tests/auth_navigation.spec.js:23:3 › VenueFlow Authentication & Routing Matrix › Staff Redirect: staff_gate@venueflow.com -> /staff/dashboard
BROWSER [debug]: [vite] connecting...

[1A[2KBROWSER [debug]: [vite] connected.

[1A[2KBROWSER [info]: %cDownload the React DevTools for a better development experience: https://react.dev/link/react-devtools font-weight:bold

[1A[2KBROWSER [debug]: [vite] connecting...

[1A[2KBROWSER [debug]: [vite] connected.

[1A[2KBROWSER [info]: %cDownload the React DevTools for a better development experience: https://react.dev/link/react-devtools font-weight:bold

[1A[2KBROWSER [log]: [VenueContext] URL Change Detected. event_id (URL): null, current (State): undefined

[1A[2KBROWSER [log]: [VenueContext] No event in state or URL, fetching default/cached.

[1A[2KBROWSER [log]: [VenueContext] URL Change Detected. event_id (URL): null, current (State): undefined

[1A[2KBROWSER [log]: [VenueContext] No event in state or URL, fetching default/cached.

[1A[2K[3/6] [chromium] › tests/auth_navigation.spec.js:34:3 › VenueFlow Authentication & Routing Matrix › Attendee Redirect: tony@stark.com -> /dashboard
[1A[2K[chromium] › tests/auth_navigation.spec.js:34:3 › VenueFlow Authentication & Routing Matrix › Attendee Redirect: tony@stark.com -> /dashboard
BROWSER [debug]: [vite] connecting...

[1A[2KBROWSER [debug]: [vite] connected.

[1A[2KBROWSER [info]: %cDownload the React DevTools for a better development experience: https://react.dev/link/react-devtools font-weight:bold

[1A[2KBROWSER [debug]: [vite] connecting...

[1A[2KBROWSER [debug]: [vite] connected.

[1A[2KBROWSER [info]: %cDownload the React DevTools for a better development experience: https://react.dev/link/react-devtools font-weight:bold

[1A[2KBROWSER [log]: [VenueContext] URL Change Detected. event_id (URL): null, current (State): undefined

[1A[2KBROWSER [log]: [VenueContext] No event in state or URL, fetching default/cached.

[1A[2KBROWSER [log]: [VenueContext] URL Change Detected. event_id (URL): null, current (State): undefined

[1A[2KBROWSER [log]: [VenueContext] No event in state or URL, fetching default/cached.

[1A[2K[4/6] [chromium] › tests/auth_navigation.spec.js:45:3 › VenueFlow Authentication & Routing Matrix › Access Control: Attendee cannot hit /admin/dashboard
[1A[2K[chromium] › tests/auth_navigation.spec.js:45:3 › VenueFlow Authentication & Routing Matrix › Access Control: Attendee cannot hit /admin/dashboard
BROWSER [debug]: [vite] connecting...

[1A[2KBROWSER [debug]: [vite] connected.

[1A[2KBROWSER [info]: %cDownload the React DevTools for a better development experience: https://react.dev/link/react-devtools font-weight:bold

[1A[2KBROWSER [debug]: [vite] connecting...

[1A[2KBROWSER [debug]: [vite] connected.

[1A[2KBROWSER [info]: %cDownload the React DevTools for a better development experience: https://react.dev/link/react-devtools font-weight:bold

[1A[2KBROWSER [log]: [VenueContext] URL Change Detected. event_id (URL): null, current (State): undefined

[1A[2KBROWSER [log]: [VenueContext] No event in state or URL, fetching default/cached.

[1A[2KBROWSER [log]: [VenueContext] URL Change Detected. event_id (URL): null, current (State): undefined

[1A[2KBROWSER [log]: [VenueContext] No event in state or URL, fetching default/cached.

[1A[2KBROWSER [error]: TypeError: Failed to fetch
    at fetchEvents (http://localhost:5173/src/pages/AttendeeDashboard.jsx?t=1776280768377:23:22)

[1A[2KBROWSER [error]: TypeError: Failed to fetch
    at fetchEvents (http://localhost:5173/src/pages/AttendeeDashboard.jsx?t=1776280768377:23:22)

[1A[2KBROWSER [debug]: [vite] connecting...

[1A[2KBROWSER [debug]: [vite] connected.

[1A[2KBROWSER [info]: %cDownload the React DevTools for a better development experience: https://react.dev/link/react-devtools font-weight:bold

[1A[2KBROWSER [log]: [VenueContext] URL Change Detected. event_id (URL): null, current (State): undefined

[1A[2KBROWSER [log]: [VenueContext] No event in state or URL, fetching default/cached.

[1A[2KBROWSER [log]: [VenueContext] URL Change Detected. event_id (URL): null, current (State): undefined

[1A[2KBROWSER [log]: [VenueContext] No event in state or URL, fetching default/cached.

[1A[2K[5/6] [chromium] › tests/auth_navigation.spec.js:64:3 › VenueFlow Authentication & Routing Matrix › Sign Out Reliability
[1A[2K[chromium] › tests/auth_navigation.spec.js:64:3 › VenueFlow Authentication & Routing Matrix › Sign Out Reliability
BROWSER [debug]: [vite] connecting...

[1A[2KBROWSER [debug]: [vite] connected.

[1A[2KBROWSER [info]: %cDownload the React DevTools for a better development experience: https://react.dev/link/react-devtools font-weight:bold

[1A[2KBROWSER [debug]: [vite] connecting...

[1A[2KBROWSER [debug]: [vite] connected.

[1A[2KBROWSER [info]: %cDownload the React DevTools for a better development experience: https://react.dev/link/react-devtools font-weight:bold

[1A[2KBROWSER [log]: [VenueContext] URL Change Detected. event_id (URL): null, current (State): undefined

[1A[2KBROWSER [log]: [VenueContext] No event in state or URL, fetching default/cached.

[1A[2KBROWSER [log]: [VenueContext] URL Change Detected. event_id (URL): null, current (State): undefined

[1A[2KBROWSER [log]: [VenueContext] No event in state or URL, fetching default/cached.

[1A[2K[6/6] [chromium] › tests/auth_navigation.spec.js:79:3 › VenueFlow Authentication & Routing Matrix › Registration Validation: Reject Weak Password
[1A[2K[chromium] › tests/auth_navigation.spec.js:79:3 › VenueFlow Authentication & Routing Matrix › Registration Validation: Reject Weak Password
BROWSER [debug]: [vite] connecting...

[1A[2KBROWSER [debug]: [vite] connected.

[1A[2KBROWSER [info]: %cDownload the React DevTools for a better development experience: https://react.dev/link/react-devtools font-weight:bold

[1A[2KBROWSER [debug]: [vite] connecting...

[1A[2KBROWSER [debug]: [vite] connected.

[1A[2KBROWSER [info]: %cDownload the React DevTools for a better development experience: https://react.dev/link/react-devtools font-weight:bold

[1A[2KBROWSER [log]: [VenueContext] URL Change Detected. event_id (URL): null, current (State): undefined

[1A[2KBROWSER [log]: [VenueContext] No event in state or URL, fetching default/cached.

[1A[2KBROWSER [log]: [VenueContext] URL Change Detected. event_id (URL): null, current (State): undefined

[1A[2KBROWSER [log]: [VenueContext] No event in state or URL, fetching default/cached.

[1A[2K  6 passed (25.5s)

To open last HTML report run:

  npx playwright show-report


```

### Roles Verified
| Role | Auth Success | Correct Dashboard | Unauthorized Blocked |
| :--- | :---: | :---: | :---: |
| Admin | ✅ | ✅ | N/A |
| Staff | ✅ | ✅ | N/A |
| Attendee | ✅ | ✅ | ✅ |

---

## 🔍 System Verification Audit
This suite verified the complete Role-Based Access Control (RBAC) matrix for VenueFlow. 
- **Admin Flow**: Verified full access to `/admin/dashboard`.
- **Staff Flow**: Verified boundary protection for `/staff/dashboard`.
- **Attendee Flow**: Verified redirection to the public dashboard and active "Access Denied" bouncers on admin routes.

*Note: For detailed visual traces of frontend failures, run `npx playwright show-report` in the frontend directory.*
