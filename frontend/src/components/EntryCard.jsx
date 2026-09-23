import React from 'react';
import { Trash2, Eye } from 'lucide-react';

export default function EntryCard({ entry, onEdit, onDelete, isReadOnly }) {
  return (
    <div className="entry">
      <div className={`pain p${entry.pain_level}`}>
        <b>{entry.pain_level}</b>
        <span>/10</span>
      </div>
      <div>
        <p style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: 'var(--slate-400)' }}>
          <strong>Schmerzbeginn:</strong> {new Date(entry.occurred_at).toLocaleString('de-DE')}
          {entry.pain_end_at && (
            <> · <strong>Schmerzende:</strong> {new Date(entry.pain_end_at).toLocaleString('de-DE')}</>
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
          <strong>Medikamente:</strong> {entry.medication || '–'}
          {entry.medication_taken_at && (
            <> ({new Date(entry.medication_taken_at).toLocaleString('de-DE')})</>
          )}
        </p>
      </div>
      <div className="entry-actions">
        <button className="icon" onClick={() => onEdit(entry)}>
          <Eye size={18} />
        </button>
        {!isReadOnly && (
          <button className="icon danger" onClick={() => onDelete(entry.id)}>
            <Trash2 size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
