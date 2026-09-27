// Minimal Authorization Code + PKCE flow against Keycloak - no library,
// since the only things needed are: redirect to login, exchange the code,
// and refresh the (short-lived, by design) access token before it expires.
const ISSUER = import.meta.env.VITE_KEYCLOAK_ISSUER;
const CLIENT_ID = import.meta.env.VITE_KEYCLOAK_CLIENT_ID;

export const isKeycloakMode = () => import.meta.env.VITE_AUTH_MODE === 'keycloak';

function randomString(byteLength = 32) {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

async function codeChallengeFor(verifier) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function redirectUri() {
  return `${window.location.origin}/`;
}

function storeTokens(data) {
  localStorage.token = data.access_token;
  localStorage.refreshToken = data.refresh_token;
  localStorage.tokenExpiresAt = String(Date.now() + data.expires_in * 1000);
  if (data.id_token) localStorage.idToken = data.id_token;
}

export function clearKeycloakTokens() {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('tokenExpiresAt');
  localStorage.removeItem('idToken');
}

// Ends the local session AND Keycloak's own SSO session (otherwise
// "logging out" of paindiary silently re-authenticates you on the next
// login attempt via Keycloak's still-active session cookie). Navigates
// away, so nothing after calling this runs.
export function logout() {
  const idToken = localStorage.idToken;
  clearKeycloakTokens();

  const url = new URL(`${ISSUER}/protocol/openid-connect/logout`);
  url.searchParams.set('client_id', CLIENT_ID);
  url.searchParams.set('post_logout_redirect_uri', redirectUri());
  if (idToken) url.searchParams.set('id_token_hint', idToken);
  window.location.href = url.toString();
}

export async function startLogin() {
  const codeVerifier = randomString();
  const state = randomString();
  sessionStorage.setItem('kc_code_verifier', codeVerifier);
  sessionStorage.setItem('kc_state', state);

  const url = new URL(`${ISSUER}/protocol/openid-connect/auth`);
  url.searchParams.set('client_id', CLIENT_ID);
  url.searchParams.set('redirect_uri', redirectUri());
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid');
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', await codeChallengeFor(codeVerifier));
  url.searchParams.set('code_challenge_method', 'S256');
  window.location.href = url.toString();
}

async function requestToken(body) {
  const res = await fetch(`${ISSUER}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body)
  });
  if (!res.ok) throw new Error('Keycloak-Anmeldung fehlgeschlagen.');
  return res.json();
}

// Call once on app startup. Returns true if the URL contained a Keycloak
// redirect callback (code + state) and it was processed successfully.
// Always strips code/state from the address bar, even on failure.
export async function handleRedirectCallback() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');
  if (!code || !state) return false;

  const expectedState = sessionStorage.getItem('kc_state');
  const codeVerifier = sessionStorage.getItem('kc_code_verifier');
  sessionStorage.removeItem('kc_state');
  sessionStorage.removeItem('kc_code_verifier');
  window.history.replaceState({}, '', window.location.pathname);

  if (!codeVerifier || state !== expectedState) {
    throw new Error('Ungültige Anmeldeantwort von Keycloak.');
  }

  storeTokens(await requestToken({
    grant_type: 'authorization_code',
    client_id: CLIENT_ID,
    code,
    redirect_uri: redirectUri(),
    code_verifier: codeVerifier
  }));
  return true;
}

// Refreshes the access token if it's missing or close to expiry. No-op
// outside Keycloak mode, so classic-mode deployments never touch this.
export async function ensureFreshToken() {
  if (!isKeycloakMode() || !localStorage.refreshToken) return;

  const expiresAt = Number(localStorage.tokenExpiresAt || 0);
  if (Date.now() < expiresAt - 10_000) return;

  try {
    storeTokens(await requestToken({
      grant_type: 'refresh_token',
      client_id: CLIENT_ID,
      refresh_token: localStorage.refreshToken
    }));
  } catch {
    clearKeycloakTokens();
  }
}
