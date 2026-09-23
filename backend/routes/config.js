import { Router } from 'express';
import db from '../db.js';
import { authenticate } from '../auth-middleware.js';

const router = Router();
router.use(authenticate);

router.get('/', (_req, res) => {
  res.json(db.prepare('SELECT compact_start, compact_end FROM config WHERE id = 1').get());
});

export default router;
