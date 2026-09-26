import { Router } from 'express';
import db from '../db.js';
import { authenticate, isCurrentUserAdmin } from '../auth-middleware.js';

const router = Router();
router.use(authenticate);

router.get('/', (_req, res) => {
  res.json(db.prepare('SELECT compact_start, compact_end FROM config WHERE id = 1').get());
});

router.put('/', (req, res) => {
  if (!isCurrentUserAdmin(req)) return res.status(403).json({ error: 'Nur für Admins.' });

  const start = Number((req.body || {}).compact_start);
  const end = Number((req.body || {}).compact_end);
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start > 23 || end < 1 || end > 24 || start >= end) {
    return res.status(400).json({ error: 'Ungültiger Stundenbereich.' });
  }

  db.prepare('UPDATE config SET compact_start = ?, compact_end = ? WHERE id = 1').run(start, end);
  res.json({ compact_start: start, compact_end: end });
});

export default router;
