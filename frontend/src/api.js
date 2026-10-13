import { ensureFreshToken } from './keycloak';

const API = import.meta.env.VITE_API_BASE_URL || '';

export async function api(path, options = {}) {
  await ensureFreshToken();
  const res = await fetch(`${API}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(localStorage.token ? { Authorization: `Bearer ${localStorage.token}` } : {})
    }
  });
  const data = res.status === 204 ? null : await res.json();
  if (!res.ok) throw Error(data?.error || 'Anfrage fehlgeschlagen');
  return data;
}

// For binary downloads (ZIP, etc.) - the regular api() helper always
// tries to parse JSON, which would break on a binary response.
export async function downloadFile(path, filename) {
  const res = await fetch(`${API}/api${path}`, {
    headers: localStorage.token ? { Authorization: `Bearer ${localStorage.token}` } : {}
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw Error(data?.error || 'Download fehlgeschlagen');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Formats a Date as "YYYY-MM-DDTHH:mm" using the device's local time (not
// UTC) - matches what a datetime-local input expects/returns, so prefilled
// timestamps reflect the user's own timezone, not the server's.
export function toLocalDatetimeValue(date) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export const blank = () => {
  const start = new Date();
  return {
    occurred_at: toLocalDatetimeValue(start),
    pain_end_at: '',
    medication_taken_at: '',
    pain_level: 5,
    situation: '',
    body_reaction: '',
    thoughts: '',
    feeling: '',
    behavior: '',
    medication: '',
    activity_id: ''
  };
};
