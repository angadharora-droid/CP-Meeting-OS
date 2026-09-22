const CENTRAL_ID_RE = /^[a-z0-9][a-z0-9._-]{1,39}$/;
const PIN_RE = /^\d{6}$/;
const SECRET_TYPES = new Set(['pin', 'password']);
const ROLES = new Set(['admin', 'user']);

function normalizeCentralId(value) {
  return String(value || '').trim().toLowerCase();
}

function validCentralId(value) {
  return CENTRAL_ID_RE.test(value);
}

// Returns an error string, or '' when the secret is acceptable for its type.
function secretError(type, secret) {
  if (!SECRET_TYPES.has(type)) return 'Secret type must be pin or password';
  const value = String(secret || '');
  if (type === 'pin' && !PIN_RE.test(value)) return 'PIN must be exactly six digits';
  if (type === 'password' && value.length < 8) return 'Password must be at least eight characters';
  return '';
}

module.exports = { normalizeCentralId, validCentralId, secretError, SECRET_TYPES, ROLES };
