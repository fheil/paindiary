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
