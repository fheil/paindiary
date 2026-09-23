import { Router } from 'express';
import db from '../db.js';
import { authenticate } from '../auth-middleware.js';

const router = Router();
router.use(authenticate);

const fields = ['occurred_at', 'pain_end_at', 'medication_taken_at', 'pain_level', 'situation', 'body_reaction', 'thoughts', 'feeling', 'behavior', 'medication', 'activity_id'];

function readableUserIds(userId) {
  return [userId, ...db.prepare('SELECT owner_id FROM shares WHERE viewer_id = ?').all(userId).map(x => x.owner_id)];
}

router.get('/', (req, res) => {
  const ids = readableUserIds(req.user.id);
  const qs = ids.map(() => '?').join(',');
  res.json(
    db.prepare(`
      SELECT e.*, u.username, a.code AS activity_code, a.label AS activity_label
      FROM entries e
      JOIN users u ON u.id = e.user_id
      LEFT JOIN activities a ON a.id = e.activity_id
      WHERE e.user_id IN (${qs})
      ORDER BY occurred_at DESC
    `).all(...ids)
  );
});

router.post('/', (req, res) => {
  const b = req.body || {};
  if (!b.occurred_at) return res.status(400).json({ error: 'Datum und Uhrzeit erforderlich.' });
  
  const info = db.prepare(
    'INSERT INTO entries (user_id, occurred_at, pain_end_at, medication_taken_at, pain_level, situation, body_reaction, thoughts, feeling, behavior, medication, activity_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    req.user.id,
    b.occurred_at,
    b.pain_end_at || '',
    b.medication_taken_at || '',
    Math.max(0, Math.min(10, Number(b.pain_level) || 0)),
    b.situation || '',
    b.body_reaction || '',
    b.thoughts || '',
    b.feeling || '',
    b.behavior || '',
    b.medication || '',
    b.activity_id ? Number(b.activity_id) : null
  );
  
  res.status(201).json(db.prepare('SELECT * FROM entries WHERE id=?').get(info.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const b = req.body || {};
  const current = db.prepare('SELECT * FROM entries WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!current) return res.status(404).json({ error: 'Eintrag nicht gefunden.' });

  const updates = fields.filter(f => f in b).map(f => `${f}=?`).join(',');
  if (!updates) return res.status(400).json({ error: 'Keine Felder zum Aktualisieren.' });

  const values = fields.filter(f => f in b).map(f => {
    if (f === 'pain_level') return Math.max(0, Math.min(10, Number(b[f]) || 0));
    if (f === 'activity_id') return b[f] ? Number(b[f]) : null;
    return b[f] || '';
  });

  db.prepare(`UPDATE entries SET ${updates}, updated_at=datetime('now') WHERE id=? AND user_id=?`).run(...values, req.params.id, req.user.id);
  res.json(db.prepare('SELECT * FROM entries WHERE id=?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const r = db.prepare('DELETE FROM entries WHERE id=? AND user_id=?').run(req.params.id, req.user.id);
  res.json({ deleted: r.changes });
});

export default router;
