import db from './db.js';

const arg = process.argv[2];

if (arg !== 'on' && arg !== 'off' && arg !== 'status') {
  console.log('Nutzung: node toggle-registration.js on|off|status');
  process.exit(1);
}

if (arg === 'status') {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('registration_enabled');
  const value = row ? row.value : 'true';
  console.log(`Registrierung: ${value}`);
  process.exit(0);
}

const value = arg === 'off' ? 'false' : 'true';
db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(value, 'registration_enabled');
console.log(`Registrierung: ${value}`);
