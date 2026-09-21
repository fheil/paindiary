const API = import.meta.env.VITE_API_BASE_URL || '';

export async function api(path, options = {}) {
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

export const blank = () => ({
  occurred_at: new Date().toISOString().slice(0, 16),
  pain_level: 5,
  situation: '',
  body_reaction: '',
  thoughts: '',
  feeling: '',
  behavior: ''
});
