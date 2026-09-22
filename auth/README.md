# CPG central sign-on (auth service)

One login for the Centre Point Group portal and every app under `*.centrepointgroup.in`.

- A person signs in once on the portal with a **central ID** and a **PIN or password** (their choice).
- The service sets a cookie for `.centrepointgroup.in`, so every app subdomain receives it.
- A **link table** maps each central ID to the ID the person already has inside each app.
  App user tables are never changed, and every app's own login keeps working.

## Run locally

```bash
cd auth
cp .env.example .env      # fill in MONGO_URI, AUTH_TOKEN_SECRET, SSO_SHARED_SECRET, AUTH_ADMIN_*
npm install
npm run dev               # http://localhost:4100
```

On first start, if no admin exists, `AUTH_ADMIN_ID` / `AUTH_ADMIN_SECRET` are used to create one.

Point the portal and Meeting OS at it:

| Where | Variable | Local value |
|---|---|---|
| `dashboard/.env` | `VITE_AUTH_URL` | `http://localhost:4100` |
| `frontend/.env` | `VITE_AUTH_URL` | `http://localhost:4100` |
| `backend/.env` | `AUTH_SERVICE_URL` | `http://localhost:4100` |
| `backend/.env` | `SSO_APP_KEY` | `meeting-os` |
| `backend/.env` | `SSO_SHARED_SECRET` | same value as in `auth/.env` |

Leave `VITE_AUTH_URL` / `AUTH_SERVICE_URL` empty and everything behaves exactly as before SSO.

## Deploy

1. Host this service (same platform as the Meeting OS backend is fine; it needs Node 22 and the Mongo cluster).
2. Give it a hostname **on the parent domain**, e.g. `auth.centrepointgroup.in` (a CNAME to the host).
   The cookie is only sent to app subdomains if the service itself lives under `centrepointgroup.in`.
3. Set in the service: `COOKIE_DOMAIN=.centrepointgroup.in`, `COOKIE_SECURE=true`, `NODE_ENV=production`,
   and `AUTH_CORS_ORIGINS` listing every browser origin that will call it (portal, Meeting OS, later each app).
4. Set `VITE_AUTH_URL=https://auth.centrepointgroup.in` on the portal and each app frontend, and
   `AUTH_SERVICE_URL=https://auth.centrepointgroup.in` on each app backend, then redeploy them.
5. Set `SSO_USERS_URL_MEETING_OS=https://<meeting-os-backend>/api/sso/users` so the admin screen can pull
   Meeting OS users for matching.

## Admin flow (on the portal)

1. Sign in with the admin ID, open the user menu, choose **People & app links**.
2. **Match app users** tab: pick an app, click **Load from app** (or paste `id,name,email` lines),
   type each person's central ID, and press **Create & link** or **Link**.
   Meeting OS PINs are carried over as the central PIN, so nobody sets a new secret.
3. **People** tab: add people by hand, reset a PIN/password, switch a person between PIN and password,
   deactivate, or edit their links per app.

## HTTP contract

All browser calls use `credentials: "include"`.

| Method | Path | Who | Purpose |
|---|---|---|---|
| POST | `/auth/login` `{centralId, secret}` | browser | Sets the cookie; returns `{user, links, prefs}` |
| POST | `/auth/logout` | browser | Ends the session everywhere |
| GET | `/auth/me` | browser | Current user, links and portal prefs |
| GET | `/auth/resolve?app=KEY` | app frontend | Returns a 60-second hand-off `token` for that app, or 404 `not_linked` |
| POST | `/auth/verify` `{token}` | app backend | Returns `{app, localUserId, centralId, name, role}` |
| POST | `/auth/secret` | browser | Change own PIN/password |
| PUT | `/auth/prefs` | browser | Favourites and recents |
| `/admin/*` | | admin | Users, links, app directories (see `src/routes/admin.js`) |

Five wrong sign-in attempts lock an ID for five minutes.

## Adding an app

See [integration/README.md](integration/README.md). Three small pieces per app: a verify call on the backend,
a cookie check on the frontend's login screen, and an optional user-directory endpoint for the matching screen.
