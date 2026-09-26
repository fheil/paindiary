import jwt from 'jsonwebtoken';
import db from './db.js';
import { verifyKeycloakToken, resolveKeycloakUser } from './keycloak-auth.js';

const secret = process.env.JWT_SECRET || 'change-this-secret-in-production';
const authMode = process.env.AUTH_MODE === 'keycloak' ? 'keycloak' : 'classic';

export async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentifizierung erforderlich.' });

  if (authMode === 'keycloak') {
    try {
      const payload = await verifyKeycloakToken(token);
      req.user = resolveKeycloakUser(payload);
      return next();
    } catch {
      return res.status(401).json({ error: 'Ungültiges oder abgelaufenes Token.' });
    }
  }

  try { req.user = jwt.verify(token, secret); next(); }
  catch { return res.status(401).json({ error: 'Ungültiges oder abgelaufenes Token.' }); }
}

// Single place that decides "is the current request's user an admin" - in
// Keycloak mode this trusts the (signature-verified, short-lived) token's
// role claim; in classic mode it re-checks users.admin fresh from the DB
// on every call, never trusting a value cached on req.user.
export function isCurrentUserAdmin(req) {
  if (authMode === 'keycloak') return !!req.user?.admin;
  const row = db.prepare('SELECT admin FROM users WHERE id = ?').get(req.user.id);
  return !!row?.admin;
}

export default authenticate;
