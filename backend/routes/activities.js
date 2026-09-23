import { Router } from 'express';
import db from '../db.js';
import { authenticate } from '../auth-middleware.js';

const router = Router();
router.use(authenticate);

router.get('/', (_req, res) => {
  res.json(db.prepare('SELECT id, code, label FROM activities ORDER BY code').all());
});

export default router;
