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

export const blank = () => {
  const start = new Date();
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return {
    occurred_at: start.toISOString().slice(0, 16),
    pain_end_at: end.toISOString().slice(0, 16),
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
