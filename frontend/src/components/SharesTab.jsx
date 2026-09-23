import React, { useEffect, useState } from 'react';
import { Download, Plus, Trash2 } from 'lucide-react';
import { api, downloadFile } from '../api';

export default function SharesTab({ user, onError }) {
  const [users, setUsers] = useState([]);
  const [shares, setShares] = useState({ viewers: [], owners: [] });
  const [error, setError] = useState('');
  const [regEnabled, setRegEnabled] = useState(true);
  const [backingUp, setBackingUp] = useState(false);
  const [activeSection, setActiveSection] = useState('shares');

  const sections = [
    { key: 'shares', label: 'Freigaben verwalten' },
    ...(user.admin ? [
      { key: 'registration', label: 'Registrierung erlauben' },
      { key: 'backup', label: 'Backup' }
    ] : [])
  ];

  const reload = async () => {
    const data = await api('/shares');
    setUsers(data.users);
    setShares({ viewers: data.viewers, owners: data.owners });
  };

  useEffect(() => {
    reload().catch(e => {
      setError(e.message);
      onError?.(e.message);
    });
    if (user.admin) {
      api('/auth/registration-status').then(d => setRegEnabled(d.enabled)).catch(e => onError?.(e.message));
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

  const add = async userId => {
    try {
      await api('/shares', { method: 'POST', body: JSON.stringify({ viewer_id: userId }) });
      setError('');
      await reload();
    } catch (e) {
      setError(e.message);
    }
  };

  const remove = async userId => {
    try {
      await api(`/shares/${userId}`, { method: 'DELETE' });
      setError('');
      await reload();
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
