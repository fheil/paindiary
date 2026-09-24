import React, { useEffect, useState } from 'react';
import { Calendar, ChevronLeft, Plus } from 'lucide-react';
import { api, blank } from '../api';
import EntryForm from './EntryForm';
import EntryCard from './EntryCard';

const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

function currentYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function shiftMonth(yearMonth, delta) {
  const [y, m] = yearMonth.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonth(yearMonth) {
  const [y, m] = yearMonth.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

export default function JournalTab({ user, viewingUserId, isReadOnly, onError, onDataChanged }) {
  const curYM = currentYearMonth();
  const prevYM = shiftMonth(curYM, -1);

  const [currentEntries, setCurrentEntries] = useState([]);
  const [previousEntries, setPreviousEntries] = useState([]);
  const [months, setMonths] = useState([]);
  const [viewingMonth, setViewingMonth] = useState(null);
  const [viewedEntries, setViewedEntries] = useState([]);
  const [expandedYears, setExpandedYears] = useState(new Set());
  const [editing, setEditing] = useState(null);

  const fetchMonth = ym => api(`/entries?month=${ym}`);

  const loadDefault = async () => {
    try {
      const [cur, prev] = await Promise.all([fetchMonth(curYM), fetchMonth(prevYM)]);
      setCurrentEntries(cur);
      setPreviousEntries(prev);
    } catch (e) {
      onError(e.message);
    }
  };

  const loadMonths = () => api('/entries/months').then(setMonths).catch(e => onError(e.message));

  const loadViewingMonth = async ym => {
    try {
      setViewedEntries(await fetchMonth(ym));
    } catch (e) {
      onError(e.message);
    }
  };

  useEffect(() => {
    loadDefault();
    loadMonths();
  }, []);

  useEffect(() => {
    if (viewingMonth) loadViewingMonth(viewingMonth);
  }, [viewingMonth]);

  const refreshAfterChange = async () => {
    await loadMonths();
    if (viewingMonth) await loadViewingMonth(viewingMonth);
    else await loadDefault();
    onDataChanged?.();
  };

  const save = async e => {
    try {
      await api(e.id ? `/entries/${e.id}` : '/entries', {
        method: e.id ? 'PUT' : 'POST',
        body: JSON.stringify(e)
      });
      setEditing(null);
      await refreshAfterChange();
    } catch (x) {
      onError(x.message);
    }
  };

  const duplicate = entry => {
    setEditing({
      occurred_at: new Date().toISOString().slice(0, 16),
      pain_end_at: entry.pain_end_at || '',
      medication_taken_at: entry.medication_taken_at || '',
      pain_level: entry.pain_level,
      situation: entry.situation || '',
      body_reaction: entry.body_reaction || '',
      thoughts: entry.thoughts || '',
      feeling: entry.feeling || '',
      behavior: entry.behavior || '',
      medication: entry.medication_name || '',
      activity_id: entry.activity_id || ''
    });
  };

  const remove = async id => {
    if (confirm('Eintrag wirklich löschen?')) {
      try {
        await api(`/entries/${id}`, { method: 'DELETE' });
        await refreshAfterChange();
      } catch (e) {
        onError(e.message);
      }
    }
  };

  const forUser = list => {
    const uid = viewingUserId ?? user.id;
    return list.filter(e => e.user_id === uid).sort((a, b) => new Date(b.occurred_at) - new Date(a.occurred_at));
  };

  const toggleYear = y => setExpandedYears(s => {
    const next = new Set(s);
    next.has(y) ? next.delete(y) : next.add(y);
    return next;
  });

  // Bucket the "has data" months (excluding current+previous, already shown)
  // into "recent" (up to 12 months back) individual buttons, and "older"
  // grouped by year.
  const excludeSet = new Set([curYM, prevYM]);
  const recentWindow = new Set(Array.from({ length: 10 }, (_, i) => shiftMonth(curYM, -(i + 2))));
  const recentMonths = months.filter(m => recentWindow.has(m)).sort().reverse();
  const olderMonths = months.filter(m => !excludeSet.has(m) && !recentWindow.has(m));
  const yearGroups = {};
  for (const m of olderMonths) {
    const y = m.slice(0, 4);
    (yearGroups[y] ||= []).push(m);
  }
  const years = Object.keys(yearGroups).sort().reverse();

  const EntryList = ({ entries }) => (
    entries.length === 0 ? (
      <div className="empty">
        <Calendar size={48} />
        <h3>Noch keine Einträge</h3>
        <p>Starte mit deinem ersten Eintrag, um deine Schmerzgeschichte zu dokumentieren.</p>
      </div>
    ) : (
      <div className="entries">
        {entries.map(entry => (
          <EntryCard
            key={entry.id}
            entry={entry}
            onEdit={setEditing}
            onDuplicate={duplicate}
            onDelete={remove}
            isReadOnly={isReadOnly}
          />
        ))}
      </div>
    )
  );

  const monthBtnStyle = {
    padding: '0.6rem 0.5rem', borderRadius: '10px', border: '1px solid #e2e8f0',
    background: '#f8fafc', font: 'inherit', fontSize: '0.85rem', fontWeight: 600,
    color: 'var(--slate-700)', cursor: 'pointer'
  };

  return (
    <div className="tab-content">
      <div className="section-title">
        <h2>Meine Einträge</h2>
        {!isReadOnly && (
          <button className="primary icon" onClick={() => setEditing(blank())}>
            <Plus size={18} /> Neuer Eintrag
          </button>
        )}
      </div>

      {viewingMonth ? (
        <>
          <button
            type="button"
            className="icon"
            style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '1rem' }}
            onClick={() => setViewingMonth(null)}
          >
            <ChevronLeft size={16} /> Zurück zu aktuellen Einträgen
          </button>
          <h3 style={{ marginTop: 0 }}>{formatMonth(viewingMonth)}</h3>
          <EntryList entries={forUser(viewedEntries)} />
        </>
      ) : (
        <>
          <h3 style={{ marginTop: 0 }}>{formatMonth(curYM)}</h3>
          <EntryList entries={forUser(currentEntries)} />

          <h3>{formatMonth(prevYM)}</h3>
          <EntryList entries={forUser(previousEntries)} />

          {(recentMonths.length > 0 || years.length > 0) && (
            <div style={{ marginTop: '2rem', background: '#fff', padding: '1.25rem 1.5rem', borderRadius: '14px', boxShadow: '0 6px 18px -10px rgba(15,118,110,.2)' }}>
              <h3 style={{ marginTop: 0 }}>Ältere Einträge</h3>

              {recentMonths.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.5rem', marginBottom: years.length > 0 ? '1.25rem' : 0 }}>
                  {recentMonths.map(m => (
                    <button key={m} type="button" style={monthBtnStyle} onClick={() => setViewingMonth(m)}>
                      {formatMonth(m)}
                    </button>
                  ))}
                </div>
              )}

              {years.map(y => (
                <div key={y} style={{ marginBottom: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => toggleYear(y)}
                    style={{
                      padding: '0.6rem 1rem', borderRadius: '10px',
                      border: `1px solid ${expandedYears.has(y) ? 'var(--teal-700)' : '#e2e8f0'}`,
                      background: expandedYears.has(y) ? 'var(--teal-50)' : '#f8fafc',
                      font: 'inherit', fontSize: '0.9rem', fontWeight: 700,
                      color: expandedYears.has(y) ? 'var(--teal-700)' : 'var(--slate-700)',
                      cursor: 'pointer'
                    }}
                  >
                    {y}
                  </button>
                  {expandedYears.has(y) && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.5rem', marginTop: '0.5rem', paddingLeft: '0.5rem' }}>
                      {yearGroups[y].map(m => (
                        <button key={m} type="button" style={monthBtnStyle} onClick={() => setViewingMonth(m)}>
                          {formatMonth(m)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {editing !== null && (
        <EntryForm
          initial={editing}
          onSave={save}
          onClose={() => setEditing(null)}
          isReadOnly={isReadOnly}
        />
      )}
    </div>
  );
}
