import dotenv from 'dotenv';
dotenv.config();

// Fail fast rather than silently signing/verifying tokens with a secret
// that's hardcoded (and public, since this repo is public) in the source.
if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET ist nicht gesetzt. Server wird nicht gestartet.');
  process.exit(1);
}

import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import entriesRoutes from './routes/entries.js';
import sharesRoutes from './routes/shares.js';
import activitiesRoutes from './routes/activities.js';
import medicationsRoutes from './routes/medications.js';
import adminRoutes from './routes/admin.js';
import configRoutes from './routes/config.js';

const app = express();

// Backend only ever sits behind exactly one hop (Traefik, same Docker
// network) - trust its X-Forwarded-For so req.ip (and rate limiting) sees
// the real client IP instead of Traefik's internal address.
app.set('trust proxy', 1);

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
app.use('/api/activities', activitiesRoutes);
app.use('/api/medications', medicationsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/config', configRoutes);

// Error-Handler
app.use((err, _req, res, _next) => { 
  console.error(err); 
  res.status(500).json({ error: 'Interner Serverfehler.' }); 
});

const port = Number(process.env.PORT) || 8030;
app.listen(port, '0.0.0.0', () => console.log(`Schmerztagebuch Backend listening on http://0.0.0.0:${port}`));