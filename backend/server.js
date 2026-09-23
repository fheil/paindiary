import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import entriesRoutes from './routes/entries.js';
import sharesRoutes from './routes/shares.js';
import activitiesRoutes from './routes/activities.js';
import medicationsRoutes from './routes/medications.js';

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
app.use('/api/activities', activitiesRoutes);
app.use('/api/medications', medicationsRoutes);

// Error-Handler
app.use((err, _req, res, _next) => { 
  console.error(err); 
  res.status(500).json({ error: 'Interner Serverfehler.' }); 
});

const port = Number(process.env.PORT) || 8030;
app.listen(port, '0.0.0.0', () => console.log(`Schmerztagebuch Backend listening on http://0.0.0.0:${port}`));