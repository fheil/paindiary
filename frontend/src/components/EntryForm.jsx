import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { api, blank } from '../api';
import AutocompleteField from './AutocompleteField';

const FIELD_CONFIG = [
  { field: 'situation', label: 'Situation/Ereignis', placeholder: 'Was war die Situation, in der der Schmerz auftrat?' },
  { field: 'body_reaction', label: 'Begleitende Körperreaktionen', placeholder: 'z. B. Verspannung, Schwitzen, Übelkeit' },
  { field: 'thoughts', label: 'Gedanken', placeholder: 'Was dachtest du in dem Moment?' },
  { field: 'feeling', label: 'Gefühl', placeholder: 'Welches Gefühl hattest du?' },
  { field: 'behavior', label: 'Verhalten', placeholder: 'Wie hast du reagiert? Was hast du gemacht?' },
  { field: 'medication', label: 'Medikamente', placeholder: 'z. B. Ibuprofen 400mg' }
];

const FREE_TEXT_FIELDS = FIELD_CONFIG.filter(({ field }) => field !== 'medication').map(({ field }) => field);

export default function EntryForm({ initial, onSave, onClose, isReadOnly }) {
  const [form, setForm] = useState(
    initial ? { ...initial, medication: initial.medication_name || '' } : blank()
  );
  const [suggestions, setSuggestions] = useState({
    medication: [], situation: [], body_reaction: [], thoughts: [], feeling: [], behavior: []
  });
  const [activities, setActivities] = useState([]);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/entries')
      .then(entries => {
        const extracted = {};
        FREE_TEXT_FIELDS.forEach(field => {
          extracted[field] = [...new Set(entries.map(e => e[field]).filter(Boolean))];
        });
        setSuggestions(s => ({ ...s, ...extracted }));
      })
      .catch(console.error);
    api('/activities').then(setActivities).catch(console.error);
    api('/medications').then(meds => {
      setSuggestions(s => ({ ...s, medication: meds.map(m => m.name) }));
    }).catch(console.error);
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async e => {
    e.preventDefault();
    setError('');
    try {
      await onSave({ ...form, pain_level: Number(form.pain_level) });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <form className="modal" onSubmit={submit} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <p className="eyebrow">EINTRAG</p>
            <h2>{initial ? 'Eintrag bearbeiten' : 'Neuer Eintrag'}</h2>
            {isReadOnly && <p style={{ color: '#f59e0b', fontSize: '0.9rem', marginTop: '0.5rem' }}>👁️ Nur-Lesen</p>}
          </div>
          <button type="button" className="icon" onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="datetime-row">
          <label>
            Schmerzbeginn
            <input
              required
              type="datetime-local"
              value={form.occurred_at}
              onChange={e => set('occurred_at', e.target.value)}
              disabled={isReadOnly}
            />
          </label>
          <label>
            Schmerzende
            <input
              type="datetime-local"
              value={form.pain_end_at}
              onChange={e => set('pain_end_at', e.target.value)}
              disabled={isReadOnly}
            />
          </label>
          <label>
            Medikamenteneinnahme
            <input
              type="datetime-local"
              value={form.medication_taken_at}
              onChange={e => set('medication_taken_at', e.target.value)}
              disabled={isReadOnly}
            />
          </label>
        </div>

        <label>
          Schmerzstärke <b className="pain-value">{form.pain_level}/10</b>
          <input
            type="range"
            min="0"
            max="10"
            value={form.pain_level}
            onChange={e => set('pain_level', e.target.value)}
            disabled={isReadOnly}
          />
        </label>

        <label>
          Aktivität
          <select
            value={form.activity_id || ''}
            onChange={e => set('activity_id', e.target.value ? Number(e.target.value) : '')}
            disabled={isReadOnly}
          >
            <option value="">– keine Auswahl –</option>
            {activities.map(a => (
              <option key={a.id} value={a.id}>{a.code} – {a.label}</option>
            ))}
          </select>
        </label>

        {FIELD_CONFIG.map(({ field, label, placeholder }) => (
          <AutocompleteField
            key={field}
            field={field}
            label={label}
            placeholder={placeholder}
            value={form[field]}
            suggestions={suggestions[field] || []}
            activeDropdown={activeDropdown}
            setActiveDropdown={setActiveDropdown}
            onChange={set}
            disabled={isReadOnly}
          />
        ))}

        {error && <p style={{ color: 'var(--rose-500)', fontSize: '0.9rem' }}>❌ {error}</p>}

        <div className="actions">
          <button type="button" className="secondary" onClick={onClose}>
            Abbrechen
          </button>
          {!isReadOnly && <button className="primary">Speichern</button>}
        </div>
      </form>
    </div>
  );
}
