import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../api';

const DAY_NAMES = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function fmtDate(d) {
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function WeeklyTable({ entries }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [activities, setActivities] = useState([]);
  const [medications, setMedications] = useState([]);

  useEffect(() => {
    api('/activities').then(setActivities).catch(console.error);
    api('/medications').then(setMedications).catch(console.error);
  }, []);

  const sorted = useMemo(
    () => [...entries].sort((a, b) => new Date(a.occurred_at) - new Date(b.occurred_at)),
    [entries]
  );

  const weekStart = useMemo(() => addDays(startOfWeek(new Date()), weekOffset * 7), [weekOffset]);
  const weekEnd = addDays(weekStart, 6);

  // grid[dayIndex][hour] = { pain, medCode, actCode }
  const grid = useMemo(() => {
    const g = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => null));

    const slotFor = (date) => {
      const diffDays = Math.floor((date - weekStart) / 86400000);
      if (diffDays < 0 || diffDays > 6) return null;
      return { dayIndex: diffDays, hour: date.getHours() };
    };

    const setSlot = (date, patch) => {
      const s = slotFor(date);
      if (!s) return;
      const current = g[s.dayIndex][s.hour] || {};
      g[s.dayIndex][s.hour] = { ...current, ...patch };
    };

    // S + A: fill every hour from occurred_at through pain_end_at (inclusive).
    // Falls back to just occurred_at's own hour if there's no valid end.
    const MAX_SPAN_HOURS = 24 * 31; // guard against a mistyped end date far in the future
    for (const e of sorted) {
      const start = new Date(e.occurred_at);
      const end = e.pain_end_at ? new Date(e.pain_end_at) : null;
      const spanHours = end ? (end - start) / 3600000 : 0;
      const validEnd = end && end >= start && spanHours <= MAX_SPAN_HOURS ? end : null;

      if (validEnd) {
        let cursor = new Date(start);
        cursor.setMinutes(0, 0, 0);
        while (cursor <= validEnd) {
          setSlot(cursor, { pain: e.pain_level, actCode: e.activity_code || null });
          cursor = new Date(cursor.getTime() + 3600000);
        }
      } else {
        setSlot(start, { pain: e.pain_level, actCode: e.activity_code || null });
      }
    }

    // M: placed at its own medication_taken_at hour, independent of the pain span.
    for (const e of sorted) {
      if (!e.medication_taken_at || !e.medication_code) continue;
      setSlot(new Date(e.medication_taken_at), { medCode: e.medication_code });
    }

    return g;
  }, [sorted, weekStart]);

  const usedActivities = useMemo(() => {
    const usedCodes = new Set();
    for (const day of grid) {
      for (const cell of day) {
        if (cell?.actCode) usedCodes.add(cell.actCode);
      }
    }
    return activities.filter(a => usedCodes.has(a.code));
  }, [grid, activities]);

  const painClass = level => {
    if (level == null) return '';
    const clamped = Math.max(0, Math.min(10, level));
    return `p${clamped}`;
  };

  return (
    <div className="tab-content">
      <div className="section-title">
        <h2>Tabellenblatt</h2>
        <div className="week-nav">
          <button type="button" className="icon" onClick={() => setWeekOffset(w => w - 1)}>
            <ChevronLeft size={18} />
          </button>
          <span>{fmtDate(weekStart)} – {fmtDate(weekEnd)}</span>
          <button type="button" className="icon" onClick={() => setWeekOffset(w => w + 1)}>
            <ChevronRight size={18} />
          </button>
          <button
            type="button"
            className="icon week-today"
            onClick={() => setWeekOffset(0)}
            disabled={weekOffset === 0}
          >
            Heute
          </button>
        </div>
      </div>

      <div className="weekly-table-wrapper">
        <table className="weekly-table">
          <thead>
            <tr>
              <th>Uhrzeit</th>
              {DAY_NAMES.map(d => <th key={d} colSpan={3} className="day-end">{d}</th>)}
            </tr>
            <tr>
              <th></th>
              {DAY_NAMES.map(d => (
                <React.Fragment key={d}>
                  <th className="sub">S</th>
                  <th className="sub">M</th>
                  <th className="sub day-end">A</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {HOURS.map(hour => (
              <tr key={hour}>
                <td className="hour-label">{hour}-{hour + 1}</td>
                {DAY_NAMES.map((_, dayIndex) => {
                  const cell = grid[dayIndex][hour];
                  return (
                    <React.Fragment key={dayIndex}>
                      <td className={`pain-cell ${painClass(cell?.pain)}`}>{cell?.pain ?? ''}</td>
                      <td>{cell?.medCode || ''}</td>
                      <td className="day-end">{cell?.actCode || ''}</td>
                    </React.Fragment>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="legends">
        <div className="legend-box">
          <h3>Medikamente</h3>
          {medications.length === 0 && <p className="muted">Keine erfasst</p>}
          {medications.map(m => (
            <p key={m.id}><b>{m.code}</b> = {m.name}</p>
          ))}
        </div>
        <div className="legend-box">
          <h3>Aktivitäten (diese Woche)</h3>
          {usedActivities.length === 0 && <p className="muted">Keine erfasst</p>}
          {usedActivities.map(a => (
            <p key={a.id}><b>{a.code}</b> = {a.label}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
