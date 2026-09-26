import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { authenticate, isCurrentUserAdmin } from '../auth-middleware.js';

const router = Router();
const secret = process.env.JWT_SECRET || 'change-this-secret-in-production';
const tokenFor = user => jwt.sign({ id: user.id, username: user.username }, secret, { expiresIn: '7d' });

router.post('/register', (req, res) => {
  const { registration_enabled } = db.prepare('SELECT registration_enabled FROM config WHERE id = 1').get();
  if (!registration_enabled) {
    return res.status(403).json({ error: 'Registrierung ist derzeit deaktiviert.' });
  }
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || username.trim().length < 3 || typeof password !== 'string' || password.length < 8)
    return res.status(400).json({ error: 'Benutzername (mind. 3 Zeichen) und Passwort (mind. 8 Zeichen) erforderlich.' });
  try {
    const info = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username.trim(), bcrypt.hashSync(password, 12));
    const user = { id: Number(info.lastInsertRowid), username: username.trim() };
    res.status(201).json({ token: tokenFor(user), user: { ...user, admin: false } });
  } catch (e) { res.status(e.code === 'SQLITE_CONSTRAINT_UNIQUE' ? 409 : 500).json({ error: e.code === 'SQLITE_CONSTRAINT_UNIQUE' ? 'Benutzername bereits vergeben.' : 'Registrierung fehlgeschlagen.' }); }
});

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = db.prepare('SELECT id, username, password_hash, admin FROM users WHERE username = ?').get(username?.trim());
  if (!user || !bcrypt.compareSync(password || '', user.password_hash)) return res.status(401).json({ error: 'Ungültige Zugangsdaten.' });
  res.json({ token: tokenFor(user), user: { id: user.id, username: user.username, admin: !!user.admin } });
});

router.get('/registration-status', (req, res) => {
  const { registration_enabled } = db.prepare('SELECT registration_enabled FROM config WHERE id = 1').get();
  res.json({ enabled: !!registration_enabled });
});

router.put('/registration-status', authenticate, (req, res) => {
  if (!isCurrentUserAdmin(req)) return res.status(403).json({ error: 'Nur für Admins.' });

  const enabled = !!(req.body || {}).enabled;
  db.prepare('UPDATE config SET registration_enabled = ? WHERE id = 1').run(enabled ? 1 : 0);
  res.json({ enabled });
});

router.put('/password', authenticate, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    return res.status(400).json({ error: 'Neues Passwort muss mindestens 8 Zeichen haben.' });
  }
  const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
  if (!user || !bcrypt.compareSync(currentPassword || '', user.password_hash)) {
    return res.status(401).json({ error: 'Aktuelles Passwort ist falsch.' });
  }
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(newPassword, 12), req.user.id);
  res.json({ success: true });
});

// Aktuellen User anhand des Tokens zurückgeben
router.get('/me', authenticate, (req, res) => {
  res.json({ user: { id: req.user.id, username: req.user.username, admin: isCurrentUserAdmin(req) } });
});

export default router;
