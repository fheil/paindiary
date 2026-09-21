import { Router } from 'express';
import db from '../db.js';
import { authenticate } from '../auth-middleware.js';

const router = Router();
router.use(authenticate);

router.get('/', (req, res) => {
  const users = db.prepare('SELECT id, username FROM users WHERE id <> ? ORDER BY username').all(req.user.id);
  const viewers = db.prepare('SELECT u.id, u.username FROM shares s JOIN users u ON u.id = s.viewer_id WHERE s.owner_id = ? ORDER BY u.username').all(req.user.id);
  const owners = db.prepare('SELECT u.id, u.username FROM shares s JOIN users u ON u.id = s.owner_id WHERE s.viewer_id = ? ORDER BY u.username').all(req.user.id);
  
  res.json({ users, viewers, owners });
});

router.post('/', (req, res) => {
  const { viewer_id } = req.body || {};
  const viewerId = Number(viewer_id);
  
  if (!viewerId || viewerId === req.user.id) return res.status(400).json({error:'Ungültiger Benutzer.'});
  if (!db.prepare('SELECT id FROM users WHERE id = ?').get(viewerId)) return res.status(404).json({error:'Benutzer nicht gefunden.'});
  
  try {
    db.prepare('INSERT INTO shares (owner_id, viewer_id) VALUES (?, ?)').run(req.user.id, viewerId);
    res.status(201).json({ok:true});
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(409).json({error:'Freigabe besteht bereits.'});
    throw e;
  }
});

router.delete('/:viewerId', (req, res) => {
  const r = db.prepare('DELETE FROM shares WHERE owner_id = ? AND viewer_id = ?').run(req.user.id, Number(req.params.viewerId));
  r.changes ? res.status(204).end() : res.status(404).json({error:'Freigabe nicht gefunden.'});
});

export default router;
