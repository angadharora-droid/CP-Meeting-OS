const COOKIE_NAME = process.env.COOKIE_NAME || 'cpg_sso';
const SESSION_DAYS = Number(process.env.SESSION_DAYS || 7);

function isSecure() {
  if (process.env.COOKIE_SECURE === 'true') return true;
  if (process.env.COOKIE_SECURE === 'false') return false;
  return process.env.NODE_ENV === 'production';
}

function baseOptions() {
  const options = {
    httpOnly: true,
    secure: isSecure(),
    sameSite: 'lax',
    path: '/',
  };
  if (process.env.COOKIE_DOMAIN) options.domain = process.env.COOKIE_DOMAIN;
  return options;
}

function sessionCookieOptions() {
  return { ...baseOptions(), maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000 };
}

function clearCookieOptions() {
  return baseOptions();
}

function sessionExpiry() {
  return new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
}

module.exports = { COOKIE_NAME, SESSION_DAYS, sessionCookieOptions, clearCookieOptions, sessionExpiry };
