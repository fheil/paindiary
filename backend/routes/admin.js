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

export default router;
