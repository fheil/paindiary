function onlyLetters(name) {
  return name.replace(/[^a-zA-ZäöüÄÖÜß]/g, '');
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

// Deterministic, collision-free short code for a medication name.
// Tries "first N letters" for N=3,4,5,..., and within each length keeps the
// first (N-1) letters fixed while scanning forward through the rest of the
// word for a free last character, e.g. Ibuprofen -> Ibu, then a colliding
// Ibulaktat -> Ibl (skips the shared 3rd letter, uses the 4th instead).
// Falls back to a numeric suffix if a name is too short/degenerate to ever
// produce a free code on its own - this always terminates.
function generateMedicationCode(name, existingCodesLower) {
  const letters = onlyLetters(name);
  if (!letters) return null;

  for (let length = 3; length <= Math.max(letters.length, 3); length++) {
    const prefixLen = Math.min(length - 1, letters.length);
    const prefix = letters.slice(0, prefixLen);
    for (let i = prefixLen; i < letters.length; i++) {
      const candidate = capitalize(prefix + letters[i]);
      if (!existingCodesLower.has(candidate.toLowerCase())) return candidate;
    }
    if (letters.length >= length) {
      const candidate = capitalize(letters.slice(0, length));
      if (!existingCodesLower.has(candidate.toLowerCase())) return candidate;
    }
  }

  let n = 2;
  let candidate;
  do {
    candidate = capitalize(letters.slice(0, 3)) + n;
    n++;
  } while (existingCodesLower.has(candidate.toLowerCase()));
  return candidate;
}

// Finds an existing medication by name (case-insensitive) or creates one
// with a freshly generated unique code. Returns the medication's id.
function findOrCreateMedication(db, name) {
  const trimmed = (name || '').trim();
  if (!trimmed) return null;

  const existing = db.prepare('SELECT id FROM medications WHERE name = ? COLLATE NOCASE').get(trimmed);
  if (existing) return existing.id;

  const existingCodes = new Set(db.prepare('SELECT code FROM medications').all().map(r => r.code.toLowerCase()));
  const code = generateMedicationCode(trimmed, existingCodes);
  const info = db.prepare('INSERT INTO medications (name, code) VALUES (?, ?)').run(trimmed, code);
  return info.lastInsertRowid;
}

export { generateMedicationCode, findOrCreateMedication };
