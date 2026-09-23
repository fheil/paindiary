import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const dataDir = process.env.DATA_DIR || '/app/data';
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'paindiary.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  admin INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS medications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  occurred_at TEXT NOT NULL,
  pain_end_at TEXT NOT NULL DEFAULT '',
  medication_taken_at TEXT NOT NULL DEFAULT '',
  pain_level INTEGER NOT NULL DEFAULT 0 CHECK (pain_level BETWEEN 0 AND 10),
  situation TEXT NOT NULL DEFAULT '',
  body_reaction TEXT NOT NULL DEFAULT '',
  thoughts TEXT NOT NULL DEFAULT '',
  feeling TEXT NOT NULL DEFAULT '',
  behavior TEXT NOT NULL DEFAULT '',
  activity_id INTEGER REFERENCES activities(id) ON DELETE SET NULL,
  medication_id INTEGER REFERENCES medications(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS shares (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(owner_id, viewer_id),
  CHECK(owner_id <> viewer_id)
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  compact_start INTEGER NOT NULL DEFAULT 6,
  compact_end INTEGER NOT NULL DEFAULT 22
);

INSERT OR IGNORE INTO settings (key, value) VALUES ('registration_enabled', 'true');
INSERT OR IGNORE INTO config (id, compact_start, compact_end) VALUES (1, 6, 22);

INSERT OR IGNORE INTO activities (code, label) VALUES
  ('Ar', 'Arbeit und Beruf'),
  ('En', 'Entspannung'),
  ('Es', 'Essen'),
  ('Fs', 'Fernsehen'),
  ('Fz', 'Freizeit'),
  ('G', 'Gespräche'),
  ('H', 'Hausarbeit'),
  ('Kö', 'Körperpflege'),
  ('Kg', 'Krankengymnastik / Physiotherapie'),
  ('L', 'Lesen'),
  ('R', 'Ruhe'),
  ('Sf', 'Schlafen'),
  ('Sg', 'Spaziergänge'),
  ('Sp', 'Sport'),
  ('U', 'Untersuchungen / Behandlungen'),
  ('Eink', 'Einkaufen');
`);

const userColumns = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
if (!userColumns.includes('admin')) {
  db.exec('ALTER TABLE users ADD COLUMN admin INTEGER NOT NULL DEFAULT 0');
}

export { dataDir };
export default db;
