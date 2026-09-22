import React, { useEffect, useMemo, useState } from 'react';
import { Activity, BarChart3, Calendar, LogOut, Plus, Share2, Table } from 'lucide-react';
import './styles.css';
import { api } from './api';
import Auth from './components/Auth';
import EntryForm from './components/EntryForm';
import EntryCard from './components/EntryCard';
import SharesTab from './components/SharesTab';
import WeeklyTable from './components/WeeklyTable';

function MainApp({ user, logout }) {
  const [entries, setEntries] = useState([]);
  const [tab, setTab] = useState('journal');
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [viewingUserId, setViewingUserId] = useState(null);
  const [shares, setShares] = useState({ viewers: [], owners: [] });

  const load = async () => {
    try {
      const [entriesRes, sharesRes] = await Promise.all([
        api('/entries'),
        api('/shares')
      ]);
      setEntries(entriesRes);
      setShares(sharesRes);
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const isReadOnly = viewingUserId !== null;
  const displayedEntries = viewingUserId !== null
    ? entries.filter(e => e.user_id === viewingUserId)
    : entries.filter(e => e.user_id === user.id);

  const avg = useMemo(() => (
    displayedEntries.length
      ? (displayedEntries.reduce((s, e) => s + e.pain_level, 0) / displayedEntries.length).toFixed(1)
      : '–'
  ), [displayedEntries]);

  const max = useMemo(() => (
    displayedEntries.length ? Math.max(...displayedEntries.map(e => e.pain_level)) : '–'
  ), [displayedEntries]);

  const min = useMemo(() => (
    displayedEntries.length ? Math.min(...displayedEntries.map(e => e.pain_level)) : '–'
  ), [displayedEntries]);

  const save = async e => {
    try {
      await api(e.id ? `/entries/${e.id}` : '/entries', {
        method: e.id ? 'PUT' : 'POST',
        body: JSON.stringify(e)
      });
      setEditing(null);
      load();
    } catch (x) {
      setError(x.message);
    }
  };

  const remove = async id => {
    if (confirm('Eintrag wirklich löschen?')) {
      try {
        await api(`/entries/${id}`, { method: 'DELETE' });
        load();
      } catch (e) {
        setError(e.message);
      }
    }
  };

  return (
    <div className="app">
      <div className="app-top">
      <header>
        <div className="top-brand">
          <div className="brand-mark small">
            <Activity />
          </div>
          <div>
            <strong>Schmerztagebuch</strong>
            <span>Dein persönlicher Begleiter</span>
          </div>
        </div>
        <div className="user-menu">
          {shares.owners?.length > 0 && (
            <select
              value={viewingUserId || ''}
              onChange={e => setViewingUserId(e.target.value ? Number(e.target.value) : null)}
              className="view-selector"
            >
              <option value="">📊 Meine Daten</option>
              {shares.owners.map(owner => (
                <option key={owner.id} value={owner.id}>
                  👁️ {owner.username}'s Daten
                </option>
              ))}
            </select>
          )}
          <span>{user.username}</span>
          <button className="icon" onClick={logout}>
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <nav>
        <button className={tab === 'journal' ? 'active' : ''} onClick={() => setTab('journal')}>
          <Calendar size={17} /> Journal
        </button>
        <button className={tab === 'dashboard' ? 'active' : ''} onClick={() => setTab('dashboard')}>
          <BarChart3 size={17} /> Dashboard
        </button>
        <button className={tab === 'table' ? 'active' : ''} onClick={() => setTab('table')}>
          <Table size={17} /> Tabellenblatt
        </button>
        <button className={tab === 'shares' ? 'active' : ''} onClick={() => setTab('shares')}>
          <Share2 size={17} /> Freigaben
        </button>
      </nav>
      </div>

      <main>
        {error && (
          <div style={{ padding: '1rem', background: '#fee2e2', color: '#dc2626', borderRadius: '8px', marginBottom: '1rem' }}>
            ❌ {error}
          </div>
        )}

        {tab === 'journal' && (
          <div className="tab-content">
            <div className="section-title">
              <h2>Meine Einträge</h2>
              {!isReadOnly && (
                <button className="primary icon" onClick={() => setEditing({})}>
                  <Plus size={18} /> Neuer Eintrag
                </button>
              )}
            </div>

            {displayedEntries.length === 0 ? (
              <div className="empty">
                <Calendar size={48} />
                <h3>Noch keine Einträge</h3>
                <p>Starten Sie mit dem ersten Eintrag, um Ihre Schmerzgeschichte zu dokumentieren.</p>
              </div>
            ) : (
              <div className="entries">
                {displayedEntries
                  .sort((a, b) => new Date(b.occurred_at) - new Date(a.occurred_at))
                  .map(entry => (
                    <EntryCard
                      key={entry.id}
                      entry={entry}
                      onEdit={setEditing}
                      onDelete={remove}
                      isReadOnly={isReadOnly}
                    />
                  ))}
              </div>
            )}
          </div>
        )}

        {tab === 'dashboard' && (
          <div className="tab-content">
            <h2>Übersicht</h2>
            <div className="stats">
              <div>
                <span>Durchschnittliche Schmerzstärke</span>
                <b>{avg}</b>
                <small>/10</small>
              </div>
              <div>
                <span>Höchste Schmerzstärke</span>
                <b>{max}</b>
                <small>/10</small>
              </div>
              <div>
                <span>Niedrigste Schmerzstärke</span>
                <b>{min}</b>
                <small>/10</small>
              </div>
              <div>
                <span>Einträge insgesamt</span>
                <b>{displayedEntries.length}</b>
                <small>Aufzeichnungen</small>
              </div>
            </div>

            {displayedEntries.length > 0 && (
              <div style={{ marginTop: '2rem', background: '#fff', padding: '1.5rem', borderRadius: '14px', boxShadow: '0 6px 18px -10px rgba(15,118,110,.2)' }}>
                <h3>Schmerzstärke-Verteilung</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(60px, 1fr))', gap: '0.5rem', marginTop: '1rem' }}>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => {
                    const count = displayedEntries.filter(e => e.pain_level === level).length;
                    return (
                      <div key={level} style={{ textAlign: 'center' }}>
                        <div
                          className={`pain p${level}`}
                          style={{
                            height: `${Math.max(30, (count / displayedEntries.length) * 150)}px`,
                            borderRadius: '8px',
                            marginBottom: '0.5rem'
                          }}
                        />
                        <small>{level}</small>
                        {count > 0 && <p style={{ fontSize: '0.8rem', margin: '0.3rem 0 0' }}>{count}x</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'table' && <WeeklyTable entries={displayedEntries} />}

        {tab === 'shares' && <SharesTab user={user} onError={setError} />}
      </main>

      {editing !== null && (
        <EntryForm
          initial={editing.id ? editing : null}
          onSave={save}
          onClose={() => setEditing(null)}
          isReadOnly={isReadOnly}
        />
      )}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (localStorage.token) {
      api('/auth/me')
        .then(d => setUser(d.user))
        .catch(() => {
          localStorage.removeItem('token');
        });
    }
  }, []);

  if (!user) {
    return <Auth onLogin={setUser} />;
  }

  return (
    <MainApp
      user={user}
      logout={() => {
        localStorage.removeItem('token');
        setUser(null);
      }}
    />
  );
}
