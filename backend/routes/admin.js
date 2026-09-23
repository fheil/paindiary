import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import archiver from 'archiver';
import db, { dataDir } from '../db.js';
import { authenticate } from '../auth-middleware.js';

const router = Router();
router.use(authenticate);

function requireAdmin(req, res, next) {
  const dbUser = db.prepare('SELECT admin FROM users WHERE id = ?').get(req.user.id);
  if (!dbUser?.admin) return res.status(403).json({ error: 'Nur für Admins.' });
  next();
}

router.get('/backup', requireAdmin, (req, res) => {
  // Flush as much of the WAL into the main file as possible without
  // blocking writers, so the downloaded .db is as self-contained as
  // reasonably possible.
  db.pragma('wal_checkpoint(PASSIVE)');

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  res.attachment(`paindiary-backup-${stamp}.zip`);

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', err => {
    console.error('Backup-Fehler:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Backup fehlgeschlagen.' });
  });
  archive.pipe(res);

  for (const name of ['paindiary.db', 'paindiary.db-wal', 'paindiary.db-shm']) {
    const filePath = path.join(dataDir, name);
    if (fs.existsSync(filePath)) archive.file(filePath, { name });
  }

  archive.finalize();
});

router.get('/users', requireAdmin, (_req, res) => {
  res.json(db.prepare('SELECT id, username, admin, created_at FROM users ORDER BY username').all());
});

router.delete('/users/:id', requireAdmin, (req, res) => {
  const targetId = Number(req.params.id);
  if (targetId === req.user.id) {
    return res.status(400).json({ error: 'Du kannst dich nicht selbst löschen.' });
  }

  const target = db.prepare('SELECT admin FROM users WHERE id = ?').get(targetId);
  if (!target) return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
  if (target.admin) {
    return res.status(400).json({ error: 'Admins können nicht gelöscht werden.' });
  }

  // entries/shares have ON DELETE CASCADE on user_id/owner_id/viewer_id,
  // so this also removes everything that user ever entered.
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(targetId);
  res.json({ deleted: result.changes });
});

export default router;
