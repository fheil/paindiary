import { Router } from 'express';
import db from '../db.js';
import { authenticate } from '../auth-middleware.js';

const router = Router();
router.use(authenticate);

router.get('/', (_req, res) => {
  res.json(db.prepare('SELECT id, name, code FROM medications ORDER BY name').all());
});

export default router;
