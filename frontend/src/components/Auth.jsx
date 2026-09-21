import React, { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import { api } from '../api';

export default function Auth({ onLogin }) {
  const [register, setRegister] = useState(false);
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [regEnabled, setRegEnabled] = useState(true);

  useEffect(() => {
    api('/auth/registration-status')
      .then(d => setRegEnabled(d.enabled))
      .catch(() => setRegEnabled(true));
  }, []);

  const submit = async e => {
    e.preventDefault();
    setError('');
    try {
      const d = await api(`/auth/${register ? 'register' : 'login'}`, {
        method: 'POST',
        body: JSON.stringify(form)
      });
      localStorage.token = d.token;
      onLogin(d.user);
    } catch (x) {
      setError(x.message);
    }
  };

  return (
    <div className="auth">
      <div className="auth-card">
        <div className="brand-mark">
          <Activity size={32} />
        </div>
        <h1>Schmerztagebuch</h1>
        <p className="muted">Dein persönlicher Begleiter</p>

        <form onSubmit={submit} style={{ marginTop: '2rem' }}>
          <label>
            Benutzername
            <input
              type="text"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              required
            />
          </label>
          <label>
            Passwort
            <input
              type="password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
            />
          </label>
          {error && <p style={{ color: 'var(--rose-500)', fontSize: '0.9rem' }}>❌ {error}</p>}
          <button type="submit" className="primary" style={{ width: '100%', marginTop: '1rem' }}>
            {register ? 'Registrieren' : 'Anmelden'}
          </button>
        </form>

        {regEnabled && (
          <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
            {register ? 'Bereits registriert?' : 'Noch kein Konto?'}{' '}
            <button
              type="button"
              onClick={() => setRegister(!register)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--teal-700)',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              {register ? 'Anmelden' : 'Registrieren'}
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
