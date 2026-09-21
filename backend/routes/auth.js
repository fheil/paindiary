import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';

const router = Router();
const secret = process.env.JWT_SECRET || 'change-this-secret-in-production';
const tokenFor = user => jwt.sign({ id: user.id, username: user.username }, secret, { expiresIn: '7d' });

router.post('/register', (req, res) => {
  const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get('registration_enabled');
  if (setting && setting.value === 'false') {
    return res.status(403).json({ error: 'Registrierung ist derzeit deaktiviert.' });
  }
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || username.trim().length < 3 || typeof password !== 'string' || password.length < 8)
    return res.status(400).json({ error: 'Benutzername (mind. 3 Zeichen) und Passwort (mind. 8 Zeichen) erforderlich.' });
  try {
    const info = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username.trim(), bcrypt.hashSync(password, 12));
    const user = { id: Number(info.lastInsertRowid), username: username.trim() };
    res.status(201).json({ token: tokenFor(user), user });
  } catch (e) { res.status(e.code === 'SQLITE_CONSTRAINT_UNIQUE' ? 409 : 500).json({ error: e.code === 'SQLITE_CONSTRAINT_UNIQUE' ? 'Benutzername bereits vergeben.' : 'Registrierung fehlgeschlagen.' }); }
});

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = db.prepare('SELECT id, username, password_hash FROM users WHERE username = ?').get(username?.trim());
  if (!user || !bcrypt.compareSync(password || '', user.password_hash)) return res.status(401).json({ error: 'Ungültige Zugangsdaten.' });
  res.json({ token: tokenFor(user), user: { id: user.id, username: user.username } });
});

router.get('/registration-status', (req, res) => {
  const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get('registration_enabled');
  const enabled = !setting || setting.value !== 'false';
  res.json({ enabled });
});

// Aktuellen User anhand des Tokens zurückgeben
router.get('/me', (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Kein Token vorhanden.' });
  try {
    const payload = jwt.verify(token, secret);
    const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(payload.id);
    if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
    res.json({ user });
  } catch (e) {
    res.status(401).json({ error: 'Token ungültig oder abgelaufen.' });
  }
});

export default router;
