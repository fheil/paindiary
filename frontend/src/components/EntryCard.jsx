import React from 'react';
import { Trash2, Eye, Copy } from 'lucide-react';

const fmt = iso => new Date(iso).toLocaleString('de-DE', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
});

export default function EntryCard({ entry, onEdit, onDuplicate, onDelete, isReadOnly }) {
  return (
    <div className="entry">
      <div className={`pain p${entry.pain_level}`}>
        <b>{entry.pain_level}</b>
        <span>/10</span>
      </div>
      <div>
        <p style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: 'var(--slate-400)' }}>
          <strong>Schmerzbeginn:</strong> {fmt(entry.occurred_at)}
          {entry.pain_end_at && (
            <> · <strong>Schmerzende:</strong> {fmt(entry.pain_end_at)}</>
          )}
        </p>
        <p style={{ margin: '0.3rem 0', fontSize: '0.9rem' }}>
          <strong>Aktivität:</strong> {entry.activity_label || '–'}
        </p>
        <p style={{ margin: '0.3rem 0', fontWeight: 500 }}>
          <strong>Situation:</strong> {entry.situation || '–'}
        </p>
        <p style={{ margin: '0.3rem 0', fontSize: '0.9rem' }}>
          <strong>Körperreaktion:</strong> {entry.body_reaction || '–'}
        </p>
        <p style={{ margin: '0.3rem 0', fontSize: '0.9rem' }}>
          <strong>Gedanken:</strong> {entry.thoughts || '–'}
        </p>
        <p style={{ margin: '0.3rem 0', fontSize: '0.9rem' }}>
          <strong>Gefühl:</strong> {entry.feeling || '–'}
        </p>
        <p style={{ margin: '0.3rem 0', fontSize: '0.9rem' }}>
          <strong>Verhalten:</strong> {entry.behavior || '–'}
        </p>
        <p style={{ margin: '0.3rem 0', fontSize: '0.9rem' }}>
          <strong>Medikamente:</strong> {entry.medication_name || '–'}
          {entry.medication_taken_at && (
            <> ({fmt(entry.medication_taken_at)})</>
          )}
        </p>
      </div>
      <div className="entry-actions">
        <button className="icon" onClick={() => onEdit(entry)}>
          <Eye size={18} />
        </button>
        {!isReadOnly && (
          <button className="icon" onClick={() => onDuplicate(entry)}>
            <Copy size={18} />
          </button>
        )}
        {!isReadOnly && (
          <button className="icon danger" onClick={() => onDelete(entry.id)}>
            <Trash2 size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
