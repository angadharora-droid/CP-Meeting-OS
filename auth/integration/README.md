# Wiring an app to central sign-on

Nothing about the app's existing login changes. SSO is an extra way in that only works when the
portal cookie is present. If the environment variables below are not set, the app behaves exactly as today.

App keys (must match the portal): `meeting-os`, `flash-report`, `cp-leads`, `assets`, `handover`,
`procurement-model`, `cpa-controller`, `mickys-crm`, `purosoul`, `purosoul-cash`, `hr-recruitment`,
`interview`, `careers`, `executive-scheduler`.

## 1. Backend: accept a hand-off token

Copy [`node/ssoClient.js`](node/ssoClient.js) into the backend and set:

```
AUTH_SERVICE_URL=https://auth.centrepointgroup.in
SSO_APP_KEY=<app key>
SSO_SHARED_SECRET=<same value as the auth service>
```

Add a login route that takes the token, verifies it, finds the local user by ID, and then does
**whatever the normal login does** (issue the app's own JWT, set its session, return its user JSON):

```js
const { verifySsoToken } = require('./lib/ssoClient');

router.post('/auth/sso', async (req, res) => {
  const verified = await verifySsoToken(req.body.token);
  if (!verified) return res.status(401).json({ error: 'SSO sign-in failed' });
  const user = await User.findById(verified.localUserId);        // however the app looks users up
  if (!user || user.active === false) return res.status(404).json({ error: 'No account linked' });
  return res.json({ token: signToken(user), user: user.toSafe() }); // same shape as the normal login
});
```

`verified.localUserId` is the value the admin typed in the link table for this app, so use whatever
the app already treats as its user ID (Mongo `_id`, `userId`, `username`, email, ...).

## 2. Backend: expose the user list (optional but recommended)

Lets the admin screen load the app's users for matching instead of pasting a CSV.

```js
const { directoryGuard } = require('./lib/ssoClient');

router.get('/sso/users', directoryGuard, async (_req, res) => {
  const users = await User.find({}, { name: 1, email: 1, role: 1 }).lean();
  res.json(users.map((u) => ({ id: String(u._id), name: u.name, email: u.email, role: u.role })));
});
```

Return `secret` too only if the app stores a readable PIN you want carried over (Meeting OS does).
Then set `SSO_USERS_URL_<APP_KEY_UPPER>=https://<app-backend>/api/sso/users` on the auth service.

## 3. Frontend: skip the login screen when the cookie is present

Before showing the login page (in the auth context / protected route), when there is no local session:

```js
const AUTH_URL = import.meta.env.VITE_AUTH_URL;   // empty = SSO off

async function trySso() {
  if (!AUTH_URL) return false;
  const res = await fetch(`${AUTH_URL}/auth/resolve?app=<app key>`, { credentials: 'include' });
  if (!res.ok) return false;                       // not signed in to the portal, or not linked
  const { token } = await res.json();
  const login = await fetch('/api/auth/sso', {     // the route from step 1
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }),
  });
  if (!login.ok) return false;
  const data = await login.json();
  saveSession(data);                               // exactly what the normal login does with its response
  return true;
}
```

Call `trySso()` once on load; fall through to the existing login page when it returns false.
On the app's own logout, also `POST ${AUTH_URL}/auth/logout` with credentials, otherwise the next
page load signs the person straight back in.

## 4. CORS

Add the app's browser origin to `AUTH_CORS_ORIGINS` on the auth service.
