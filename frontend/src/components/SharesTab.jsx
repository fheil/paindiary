import React, { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '../api';

export default function SharesTab({ user, onError }) {
  const [users, setUsers] = useState([]);
  const [shares, setShares] = useState({ viewers: [], owners: [] });
  const [error, setError] = useState('');

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
  }, [onError]);

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
    <div className="tab-content">
      <h2>Freigaben verwalten</h2>

      {error && <p style={{ color: 'var(--rose-500)' }}>❌ {error}</p>}

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
    </div>
  );
}
