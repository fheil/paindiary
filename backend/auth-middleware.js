import jwt from 'jsonwebtoken';

const secret = process.env.JWT_SECRET || 'change-this-secret-in-production';
export function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentifizierung erforderlich.' });
  try { req.user = jwt.verify(token, secret); next(); }
  catch { return res.status(401).json({ error: 'Ungültiges oder abgelaufenes Token.' }); }
}
export default authenticate;
