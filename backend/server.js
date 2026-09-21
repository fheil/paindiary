import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import entriesRoutes from './routes/entries.js';
import sharesRoutes from './routes/shares.js';
import db from './db.js';

dotenv.config();

const app = express();

// CORS angepasst für Traefik
const corsOrigin = process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:8040';
app.use(cors({ origin: corsOrigin, credentials: true }));

app.use(express.json({ limit: '1mb' }));
app.use((req, _res, next) => { 
  console.log(new Date().toISOString(), req.method, req.url); 
  next(); 
});

// Health-Check für Traefik
app.get('/health', (_req, res) => res.json({ ok: true, service: 'paindiary-backend', time: new Date().toISOString() }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/entries', entriesRoutes);
app.use('/api/shares', sharesRoutes);

// ============ ADMIN SETUP ENDPOINT ============
app.post('/api/admin/make-admin/:username', (req, res) => {
  try {
    const result = db.prepare('UPDATE users SET admin = 1 WHERE username = ?').run(req.params.username);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'User nicht gefunden' });
    }
    
    res.json({ 
      success: true, 
      message: `${req.params.username} ist jetzt Admin` 
    });
  } catch(e) {
    console.error('Admin Setup Error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Error-Handler
app.use((err, _req, res, _next) => { 
  console.error(err); 
  res.status(500).json({ error: 'Interner Serverfehler.' }); 
});

const port = Number(process.env.PORT) || 8030;
app.listen(port, '0.0.0.0', () => console.log(`Schmerztagebuch Backend listening on http://0.0.0.0:${port}`));