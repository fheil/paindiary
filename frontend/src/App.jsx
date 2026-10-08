import React, { useEffect, useMemo, useState } from 'react';
import { Activity, BarChart3, Calendar, LogOut, Share2, Table } from 'lucide-react';
import './styles.css';
import { api } from './api';
import { clearKeycloakTokens, handleRedirectCallback, isKeycloakMode, logout as keycloakLogout } from './keycloak';
import Auth from './components/Auth';
import JournalTab from './components/JournalTab';
import SharesTab from './components/SharesTab';
import WeeklyTable from './components/WeeklyTable';

function MainApp({ user, logout }) {
  const [entries, setEntries] = useState([]);
  const [tab, setTab] = useState('journal');
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
      setViewingUserId(v => (v && !sharesRes.owners.some(o => o.id === v)) ? null : v);
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

  const daysSinceMedication = useMemo(() => {
    const medDates = displayedEntries
      .filter(e => e.medication_taken_at)
      .map(e => new Date(e.medication_taken_at).getTime());
    if (medDates.length === 0) return null;
    return Math.floor((Date.now() - Math.max(...medDates)) / 86400000);
  }, [displayedEntries]);

  const medicationBadge = useMemo(() => {
    if (daysSinceMedication === null) return { background: '#dcfce7', color: '#166534', days: null };
    if (daysSinceMedication < 7) return { background: '#fee2e2', color: '#991b1b', days: daysSinceMedication };
    if (daysSinceMedication <= 30) return { background: '#fef3c7', color: '#92400e', days: daysSinceMedication };
    return { background: '#dcfce7', color: '#166534', days: daysSinceMedication };
  }, [daysSinceMedication]);

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
        <button className={tab === 'table' ? 'active' : ''} onClick={() => setTab('table')}>
          <Table size={17} /> Tagebuch
        </button>
        <button className={tab === 'dashboard' ? 'active' : ''} onClick={() => setTab('dashboard')}>
          <BarChart3 size={17} /> Dashboard
        </button>
        <button className={tab === 'shares' ? 'active' : ''} onClick={() => setTab('shares')}>
          <Share2 size={17} /> Optionen
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
          <JournalTab
            user={user}
            viewingUserId={viewingUserId}
            isReadOnly={isReadOnly}
            onError={setError}
            onDataChanged={load}
          />
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
                        <small>{level}</small>
                        <div style={{ height: '150px', display: 'flex', alignItems: 'flex-end', marginTop: '0.5rem' }}>
                          <div
                            className={`pain p${level}`}
                            style={{
                              height: `${Math.max(30, (count / displayedEntries.length) * 150)}px`,
                              width: '100%',
                              borderRadius: '8px',
                              fontSize: '0.8rem'
                            }}
                          >
                            {count > 0 && `${count}x`}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {displayedEntries.length > 0 && (
              <div
                style={{
                  marginTop: '2rem',
                  background: '#fff',
                  padding: '1.5rem',
                  borderRadius: '14px',
                  boxShadow: '0 6px 18px -10px rgba(15,118,110,.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.5rem',
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <h3 style={{ marginTop: 0 }}>Medikamentenfreie Zeit</h3>
                  <p className="muted" style={{ marginTop: '0.5rem' }}>
                    Tage seit der letzten Medikamenteneinnahme.
                  </p>
                </div>
                <div
                  style={{
                    width: '140px',
                    height: '140px',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '28px',
                    background: medicationBadge.background,
                    color: medicationBadge.color,
                    textAlign: 'center'
                  }}
                >
                  {medicationBadge.days !== null ? (
                    <div>
                      <div style={{ fontSize: '2.8rem', fontWeight: 800, lineHeight: 1 }}>{medicationBadge.days}</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '0.3rem' }}>Tage</div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '1rem', fontWeight: 700, padding: '0 0.5rem' }}>Keine Daten</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'table' && <WeeklyTable entries={displayedEntries} />}

        {tab === 'shares' && <SharesTab user={user} onError={setError} onDataChanged={load} />}
      </main>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        if (isKeycloakMode()) await handleRedirectCallback();
        if (localStorage.token) {
          const d = await api('/auth/me');
          setUser(d.user);
        }
      } catch (e) {
        clearKeycloakTokens();
        localStorage.removeItem('token');
        setAuthError(e.message);
      }
    })();
  }, []);

  if (!user) {
    return <Auth onLogin={setUser} error={authError} />;
  }

  return (
    <MainApp
      user={user}
      logout={() => {
        if (isKeycloakMode()) return keycloakLogout();
        localStorage.removeItem('token');
        setUser(null);
      }}
    />
  );
}
