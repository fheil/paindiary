// Talks to Keycloak's Admin REST API to manage the "admin" client role on
// the paindiary client - only used when AUTH_MODE=keycloak, where that role
// (not the local users.admin column) is the source of truth for admin
// rights. Reached over the shared traefik-net Docker network, not the
// public-facing KEYCLOAK_ISSUER.
const internalUrl = process.env.KEYCLOAK_INTERNAL_URL;
const realm = process.env.KEYCLOAK_REALM;
const clientId = process.env.KEYCLOAK_CLIENT_ID;
const backendClientId = process.env.KEYCLOAK_BACKEND_CLIENT_ID;
const backendClientSecret = process.env.KEYCLOAK_BACKEND_CLIENT_SECRET;

const realmBase = `${internalUrl}/realms/${realm}`;
const adminBase = `${internalUrl}/admin/realms/${realm}`;

async function getServiceAccountToken() {
  const res = await fetch(`${realmBase}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: backendClientId,
      client_secret: backendClientSecret
    })
  });
  if (!res.ok) throw new Error(`Keycloak-Token-Anfrage fehlgeschlagen (${res.status})`);
  return (await res.json()).access_token;
}

async function adminFetch(path, token, options = {}) {
  const res = await fetch(`${adminBase}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });
  if (!res.ok) throw new Error(`Keycloak-Admin-API-Fehler (${res.status}) bei ${path}`);
  return res.status === 204 ? null : res.json();
}

async function getPaindiaryClientUuid(token) {
  const clients = await adminFetch(`/clients?clientId=${encodeURIComponent(clientId)}`, token);
  if (!clients?.[0]) throw new Error(`Keycloak-Client "${clientId}" nicht gefunden.`);
  return clients[0].id;
}

// Returns the set of Keycloak user IDs (sub) that currently hold the
// paindiary client's "admin" role.
export async function getKeycloakAdminSubs() {
  const token = await getServiceAccountToken();
  const clientUuid = await getPaindiaryClientUuid(token);
  const users = await adminFetch(`/clients/${clientUuid}/roles/admin/users`, token);
  return new Set((users || []).map(u => u.id));
}

// Grants (true) or revokes (false) the paindiary "admin" client role for a
// Keycloak user, identified by their Keycloak sub.
export async function setKeycloakAdminRole(keycloakSub, grant) {
  const token = await getServiceAccountToken();
  const clientUuid = await getPaindiaryClientUuid(token);
  const role = await adminFetch(`/clients/${clientUuid}/roles/admin`, token);
  await adminFetch(`/users/${keycloakSub}/role-mappings/clients/${clientUuid}`, token, {
    method: grant ? 'POST' : 'DELETE',
    body: JSON.stringify([{ id: role.id, name: role.name }])
  });
}
