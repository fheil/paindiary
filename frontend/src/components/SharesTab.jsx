import React, { useEffect, useState } from 'react';
import { Download, Plus, Trash2 } from 'lucide-react';
import { api, downloadFile } from '../api';

export default function SharesTab({ user, onError, onDataChanged }) {
  const [users, setUsers] = useState([]);
  const [shares, setShares] = useState({ viewers: [], owners: [] });
  const [error, setError] = useState('');
  const [regEnabled, setRegEnabled] = useState(true);
  const [backingUp, setBackingUp] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [activeSection, setActiveSection] = useState('shares');
  const [pwForm, setPwForm] = useState({ current: '', next: '', repeat: '' });
  const [pwError, setPwError] = useState('');
  const [pwMessage, setPwMessage] = useState('');

  const sections = [
    { key: 'shares', label: 'Freigaben verwalten' },
    { key: 'password', label: 'Passwort ändern' },
    ...(user.admin ? [
      { key: 'users', label: 'Benutzerverwaltung' },
      { key: 'registration', label: 'Registrierung erlauben' },
      { key: 'backup', label: 'Backup' }
    ] : [])
  ];

  const reload = async () => {
    const data = await api('/shares');
    setUsers(data.users);
    setShares({ viewers: data.viewers, owners: data.owners });
  };

  const loadAllUsers = () => api('/admin/users').then(setAllUsers).catch(e => onError?.(e.message));

  useEffect(() => {
    reload().catch(e => {
      setError(e.message);
      onError?.(e.message);
    });
    if (user.admin) {
      api('/auth/registration-status').then(d => setRegEnabled(d.enabled)).catch(e => onError?.(e.message));
      loadAllUsers();
    }
  }, [onError, user.admin]);

  const toggleRegistration = async () => {
    const next = !regEnabled;
    setRegEnabled(next);
    try {
      await api('/auth/registration-status', { method: 'PUT', body: JSON.stringify({ enabled: next }) });
    } catch (e) {
      setRegEnabled(regEnabled);
      setError(e.message);
    }
  };

  const downloadBackup = async () => {
    setBackingUp(true);
    try {
      await downloadFile('/admin/backup', `paindiary-backup-${new Date().toISOString().slice(0, 10)}.zip`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBackingUp(false);
    }
  };

  const changePassword = async e => {
    e.preventDefault();
    setPwError('');
    setPwMessage('');
    if (pwForm.next !== pwForm.repeat) {
      setPwError('Die neuen Passwörter stimmen nicht überein.');
      return;
    }
    try {
      await api('/auth/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next })
      });
      setPwMessage('Passwort erfolgreich geändert.');
      setPwForm({ current: '', next: '', repeat: '' });
    } catch (e) {
      setPwError(e.message);
    }
  };

  const deleteUser = async u => {
    if (!confirm(`Benutzer "${u.username}" wirklich löschen? Dabei werden auch ALLE seine Einträge unwiderruflich gelöscht.`)) {
      return;
    }
    try {
      await api(`/admin/users/${u.id}`, { method: 'DELETE' });
      await loadAllUsers();
      await onDataChanged?.();
    } catch (e) {
      setError(e.message);
    }
  };

  const add = async userId => {
    try {
      await api('/shares', { method: 'POST', body: JSON.stringify({ viewer_id: userId }) });
      setError('');
      await reload();
      await onDataChanged?.();
    } catch (e) {
      setError(e.message);
    }
  };

  const remove = async userId => {
    try {
      await api(`/shares/${userId}`, { method: 'DELETE' });
      setError('');
      await reload();
      await onDataChanged?.();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="tab-content" style={{ background: 'transparent', boxShadow: 'none', padding: 0 }}>
      <div className="options-layout">
        <nav className="options-nav">
          {sections.map(s => (
            <button
              key={s.key}
              type="button"
              className={activeSection === s.key ? 'active' : ''}
              onClick={() => setActiveSection(s.key)}
            >
              {s.label}
            </button>
          ))}
        </nav>

        <div className="options-panel">
          {error && <p style={{ color: 'var(--rose-500)' }}>❌ {error}</p>}

          {activeSection === 'shares' && (
            <>
              <h2 style={{ marginTop: 0 }}>Freigaben verwalten</h2>

              <div style={{ marginTop: '2rem' }}>
                <h3>Meine Daten freigeben für:</h3>
                {shares.viewers?.length === 0 ? (
                  <p className="muted">Noch keine Freigaben</p>
                ) : (
                  <div className="share-cards">
                    {shares.viewers?.map(viewer => (
                      <div key={viewer.id} className="share-card">
                        <div>
                          <strong>{viewer.username}</strong>
                          <p className="muted">Kann meine Einträge sehen</p>
                        </div>
                        <button className="secondary" onClick={() => remove(viewer.id)}>
                          <Trash2 size={16} /> Entziehen
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {users.length > 0 && (
                  <div style={{ marginTop: '2rem' }}>
                    <h3>Weitere Benutzer hinzufügen:</h3>
                    <div className="share-cards">
                      {users.map(u => (
                        <div key={u.id} className="share-card">
                          <strong>{u.username}</strong>
                          <button className="primary" onClick={() => add(u.id)}>
                            <Plus size={16} /> Freigeben
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ marginTop: '2rem' }}>
                <h3>Ich darf einsehen von:</h3>
                {shares.owners?.length === 0 ? (
                  <p className="muted">Keine Freigaben von anderen</p>
                ) : (
                  <div className="share-cards">
                    {shares.owners?.map(owner => (
                      <div key={owner.id} className="share-card">
                        <strong>{owner.username}</strong>
                        <p className="muted">Kann ich einsehen</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {activeSection === 'password' && (
            <>
              <h2 style={{ marginTop: 0 }}>Passwort ändern</h2>
              <form onSubmit={changePassword} style={{ marginTop: '1rem', maxWidth: '360px' }}>
                <label>
                  Aktuelles Passwort
                  <input
                    type="password"
                    required
                    value={pwForm.current}
                    onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
                  />
                </label>
                <label>
                  Neues Passwort
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={pwForm.next}
                    onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))}
                  />
                </label>
                <label>
                  Neues Passwort wiederholen
                  <input
                    type="password"
                    required
                    value={pwForm.repeat}
                    onChange={e => setPwForm(f => ({ ...f, repeat: e.target.value }))}
                  />
                </label>
                {pwError && <p style={{ color: 'var(--rose-500)', fontSize: '0.9rem' }}>❌ {pwError}</p>}
                {pwMessage && <p style={{ color: 'var(--teal-700)', fontSize: '0.9rem' }}>✓ {pwMessage}</p>}
                <button className="primary" style={{ marginTop: '1rem' }}>Passwort ändern</button>
              </form>
            </>
          )}

          {activeSection === 'users' && user.admin && (
            <>
              <h2 style={{ marginTop: 0 }}>Benutzerverwaltung</h2>
              <p style={{ marginTop: '0.5rem', color: 'var(--pain-7)', fontWeight: 600 }}>
                Achtung: Beim Löschen eines Benutzers werden auch alle seine Einträge unwiderruflich mitgelöscht.
              </p>
              <div className="share-cards" style={{ marginTop: '1.5rem' }}>
                {allUsers.map(u => (
                  <div key={u.id} className="share-card">
                    <div>
                      <strong>{u.username}</strong>
                      {u.admin ? <p className="muted">Admin</p> : null}
                    </div>
                    {u.id !== user.id && !u.admin && (
                      <button className="secondary" onClick={() => deleteUser(u)}>
                        <Trash2 size={16} /> Löschen
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {activeSection === 'registration' && user.admin && (
            <>
              <h2 style={{ marginTop: 0 }}>Registrierung erlauben</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.75rem' }}>
                <label className="switch">
                  <input type="checkbox" checked={regEnabled} onChange={toggleRegistration} />
                  <span className="slider"></span>
                </label>
                <span className="muted">
                  {regEnabled ? 'Neue Registrierungen sind erlaubt' : 'Registrierung ist deaktiviert'}
                </span>
              </div>
            </>
          )}

          {activeSection === 'backup' && user.admin && (
            <>
              <h2 style={{ marginTop: 0 }}>Backup</h2>
              <p className="muted" style={{ marginTop: '0.5rem' }}>
                Lädt die SQLite-Datenbankdateien als ZIP herunter.
              </p>
              <button className="primary icon" onClick={downloadBackup} disabled={backingUp} style={{ marginTop: '0.75rem' }}>
                <Download size={18} /> {backingUp ? 'Wird erstellt …' : 'Backup herunterladen'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
