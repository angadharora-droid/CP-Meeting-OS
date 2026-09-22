// Client for the central sign-on service. The portal works without it when
// VITE_AUTH_URL is not set: no login button, favourites stay in this browser.
const AUTH_URL = (import.meta.env.VITE_AUTH_URL || "").replace(/\/+$/, "");

export const authEnabled = Boolean(AUTH_URL);

async function call(path, options = {}) {
  const response = await fetch(`${AUTH_URL}${path}`, {
    credentials: "include",
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(data?.error || `Request failed (${response.status})`);
    error.status = response.status;
    error.code = data?.error;
    throw error;
  }
  return data;
}

export const authApi = {
  me: () => call("/auth/me"),
  login: (centralId, secret) => call("/auth/login", { method: "POST", body: JSON.stringify({ centralId, secret }) }),
  logout: () => call("/auth/logout", { method: "POST" }),
  // keepalive lets the request finish even when the page is navigating away
  savePrefs: (prefs, keepalive = false) => call("/auth/prefs", { method: "PUT", body: JSON.stringify(prefs), keepalive }),
  changeSecret: (current, next, type) => call("/auth/secret", { method: "POST", body: JSON.stringify({ current, next, type }) }),
  admin: {
    users: () => call("/admin/users"),
    createUser: (payload) => call("/admin/users", { method: "POST", body: JSON.stringify(payload) }),
    updateUser: (centralId, payload) => call(`/admin/users/${encodeURIComponent(centralId)}`, { method: "PATCH", body: JSON.stringify(payload) }),
    deleteUser: (centralId) => call(`/admin/users/${encodeURIComponent(centralId)}`, { method: "DELETE" }),
    setLink: (centralId, link) => call(`/admin/users/${encodeURIComponent(centralId)}/links`, { method: "PUT", body: JSON.stringify(link) }),
    removeLink: (centralId, app) => call(`/admin/users/${encodeURIComponent(centralId)}/links/${encodeURIComponent(app)}`, { method: "DELETE" }),
    apps: () => call("/admin/apps"),
    appUsers: (app) => call(`/admin/apps/${encodeURIComponent(app)}/users`),
  },
};
