import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import archiver from 'archiver';
import db, { dataDir } from '../db.js';
import { authenticate, isCurrentUserAdmin } from '../auth-middleware.js';
import { getKeycloakAdminSubs, setKeycloakAdminRole } from '../keycloak-admin.js';

const authMode = process.env.AUTH_MODE === 'keycloak' ? 'keycloak' : 'classic';

const router = Router();
router.use(authenticate);

function requireAdmin(req, res, next) {
  if (!isCurrentUserAdmin(req)) return res.status(403).json({ error: 'Nur für Admins.' });
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

router.get('/users', requireAdmin, async (_req, res) => {
  const users = db.prepare('SELECT id, username, admin, keycloak_sub, created_at FROM users ORDER BY username').all();

  if (authMode !== 'keycloak') {
    return res.json(users.map(({ keycloak_sub, ...u }) => u));
  }

  try {
    const adminSubs = await getKeycloakAdminSubs();
    res.json(users.map(({ keycloak_sub, ...u }) => ({ ...u, admin: !!keycloak_sub && adminSubs.has(keycloak_sub) })));
  } catch (e) {
    console.error('Keycloak-Admin-API-Fehler:', e);
    res.status(502).json({ error: 'Keycloak nicht erreichbar.' });
  }
});

router.put('/users/:id/admin', requireAdmin, async (req, res) => {
  const targetId = Number(req.params.id);
  if (targetId === req.user.id) {
    return res.status(400).json({ error: 'Du kannst deinen eigenen Admin-Status nicht ändern.' });
  }

  const target = db.prepare('SELECT id, keycloak_sub FROM users WHERE id = ?').get(targetId);
  if (!target) return res.status(404).json({ error: 'Benutzer nicht gefunden.' });

  const admin = !!req.body?.admin;

  if (authMode === 'keycloak') {
    if (!target.keycloak_sub) return res.status(400).json({ error: 'Nutzer hat kein Keycloak-Konto.' });
    try {
      await setKeycloakAdminRole(target.keycloak_sub, admin);
    } catch (e) {
      console.error('Keycloak-Admin-API-Fehler:', e);
      return res.status(502).json({ error: 'Keycloak nicht erreichbar.' });
    }
  } else {
    db.prepare('UPDATE users SET admin = ? WHERE id = ?').run(admin ? 1 : 0, targetId);
  }

  res.json({ id: targetId, admin });
});

router.delete('/users/:id', requireAdmin, async (req, res) => {
  const targetId = Number(req.params.id);
  if (targetId === req.user.id) {
    return res.status(400).json({ error: 'Du kannst dich nicht selbst löschen.' });
  }

  const target = db.prepare('SELECT admin, keycloak_sub FROM users WHERE id = ?').get(targetId);
  if (!target) return res.status(404).json({ error: 'Benutzer nicht gefunden.' });

  let targetIsAdmin = !!target.admin;
  if (authMode === 'keycloak' && target.keycloak_sub) {
    try {
      targetIsAdmin = (await getKeycloakAdminSubs()).has(target.keycloak_sub);
    } catch (e) {
      console.error('Keycloak-Admin-API-Fehler:', e);
      return res.status(502).json({ error: 'Keycloak nicht erreichbar.' });
    }
  }
  if (targetIsAdmin) {
    return res.status(400).json({ error: 'Admins können nicht gelöscht werden.' });
  }

  // entries/shares have ON DELETE CASCADE on user_id/owner_id/viewer_id,
  // so this also removes everything that user ever entered.
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(targetId);
  res.json({ deleted: result.changes });
});

export default router;
