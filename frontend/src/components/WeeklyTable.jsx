import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const DAY_NAMES = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const END_SUFFIX = ' - ENDE';

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

// Assigns stable letters (A, B, C, ...) to distinct, non-empty trimmed values,
// in order of first chronological appearance across ALL entries.
function buildLegend(entriesSorted, getValue) {
  const legend = new Map(); // value -> letter
  let next = 0;
  for (const e of entriesSorted) {
    const raw = getValue(e);
    if (!raw) continue;
    const value = raw.trim();
    if (!value || legend.has(value)) continue;
    legend.set(value, String.fromCharCode(65 + (next % 26)) + (next >= 26 ? Math.floor(next / 26) : ''));
    next++;
  }
  return legend;
}

export default function WeeklyTable({ entries }) {
  const [weekOffset, setWeekOffset] = useState(0);

  const sorted = useMemo(
    () => [...entries].sort((a, b) => new Date(a.occurred_at) - new Date(b.occurred_at)),
    [entries]
  );

  const medLegend = useMemo(() => buildLegend(sorted, e => e.medication), [sorted]);
  const actLegend = useMemo(
    () => buildLegend(sorted, e => {
      if (!e.body_reaction) return '';
      const t = e.body_reaction.trim();
      return t.endsWith(END_SUFFIX) ? t.slice(0, -END_SUFFIX.length).trim() : t;
    }),
    [sorted]
  );

  const weekStart = useMemo(() => addDays(startOfWeek(new Date()), weekOffset * 7), [weekOffset]);
  const weekEnd = addDays(weekStart, 6);

  // grid[dayIndex][hour] = { pain, medLetter, actLetter }
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

    // S + M: every entry always fills its own single hour.
    for (const e of sorted) {
      const date = new Date(e.occurred_at);
      const medLetter = e.medication ? medLegend.get(e.medication.trim()) : null;
      setSlot(date, { pain: e.pain_level, medLetter: medLetter || null });
    }

    // A (+ gap-fill of S across matched start/end pairs).
    const consumed = new Set();
    for (let i = 0; i < sorted.length; i++) {
      const start = sorted[i];
      if (consumed.has(start.id)) continue;
      const raw = (start.body_reaction || '').trim();
      if (!raw || raw.endsWith(END_SUFFIX)) continue;

      let end = null;
      for (let j = i + 1; j < sorted.length; j++) {
        const cand = sorted[j];
        if (consumed.has(cand.id)) continue;
        const candRaw = (cand.body_reaction || '').trim();
        if (candRaw === raw + END_SUFFIX) { end = cand; break; }
      }

      const code = actLegend.get(raw);
      if (end) {
        consumed.add(start.id);
        consumed.add(end.id);
        let cursor = new Date(start.occurred_at);
        cursor.setMinutes(0, 0, 0);
        const endDate = new Date(end.occurred_at);
        while (cursor <= endDate) {
          const s = slotFor(cursor);
          if (s) {
            const current = g[s.dayIndex][s.hour] || {};
            g[s.dayIndex][s.hour] = {
              pain: current.pain ?? start.pain_level,
              medLetter: current.medLetter ?? null,
              actLetter: current.actLetter ?? code
            };
          }
          cursor = new Date(cursor.getTime() + 3600000);
        }
      } else {
        setSlot(new Date(start.occurred_at), { actLetter: code });
      }
    }

    // Orphaned "- ENDE" entries with no matching start still show their own hour.
    for (const e of sorted) {
      const raw = (e.body_reaction || '').trim();
      if (raw.endsWith(END_SUFFIX) && !consumed.has(e.id)) {
        const base = raw.slice(0, -END_SUFFIX.length).trim();
        setSlot(new Date(e.occurred_at), { actLetter: actLegend.get(base) || null });
      }
    }

    return g;
  }, [sorted, weekStart, weekEnd, medLegend, actLegend]);

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
          {weekOffset !== 0 && (
            <button type="button" className="icon week-today" onClick={() => setWeekOffset(0)}>
              Heute
            </button>
          )}
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
                      <td>{cell?.medLetter || ''}</td>
                      <td className="day-end">{cell?.actLetter || ''}</td>
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
          {medLegend.size === 0 && <p className="muted">Keine erfasst</p>}
          {[...medLegend.entries()].map(([value, letter]) => (
            <p key={value}><b>{letter}</b> = {value}</p>
          ))}
        </div>
        <div className="legend-box">
          <h3>Aktivitäten / Körperreaktionen</h3>
          {actLegend.size === 0 && <p className="muted">Keine erfasst</p>}
          {[...actLegend.entries()].map(([value, letter]) => (
            <p key={value}><b>{letter}</b> = {value}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
