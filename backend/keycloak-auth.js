import { randomUUID } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import db from './db.js';

const issuer = process.env.KEYCLOAK_ISSUER;
const clientId = process.env.KEYCLOAK_CLIENT_ID;

// Only constructed when actually configured, so classic-mode deployments
// never touch the network or require these env vars at all.
const jwks = issuer ? createRemoteJWKSet(new URL(`${issuer}/protocol/openid-connect/certs`)) : null;

export async function verifyKeycloakToken(token) {
  const { payload } = await jwtVerify(token, jwks, { issuer });
  return payload;
}

function insertUser(username, sub) {
  // Keycloak-provisioned users never log in with a password - the hash is
  // just there to satisfy the NOT NULL column, and is never disclosed.
  const placeholderHash = bcrypt.hashSync(randomUUID(), 12);
  return db.prepare(
    'INSERT INTO users (username, password_hash, keycloak_sub) VALUES (?, ?, ?)'
  ).run(username, placeholderHash, sub);
}

function findOrCreateLocalUser(sub, preferredUsername) {
  const existing = db.prepare('SELECT id, username FROM users WHERE keycloak_sub = ?').get(sub);
  if (existing) return existing;

  const username = preferredUsername || sub;
  try {
    const info = insertUser(username, sub);
    return { id: Number(info.lastInsertRowid), username };
  } catch (e) {
    // Username already taken by an unrelated (classic) account - disambiguate.
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      const info = insertUser(`${username}-${sub.slice(0, 8)}`, sub);
      return { id: Number(info.lastInsertRowid), username: `${username}-${sub.slice(0, 8)}` };
    }
    throw e;
  }
}

// Maps a verified Keycloak token to the local user row, auto-provisioning
// it on first login. Admin status comes from the `admin` client role on
// the `paindiary` client in Keycloak, not from the local users.admin column.
export function resolveKeycloakUser(payload) {
  const user = findOrCreateLocalUser(payload.sub, payload.preferred_username);
  const roles = payload.resource_access?.[clientId]?.roles || [];
  return { id: user.id, username: user.username, admin: roles.includes('admin') };
}
