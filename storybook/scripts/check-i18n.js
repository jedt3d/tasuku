// Fails when the three languages do not define exactly the same keys.
// Covers interface text (src/i18n/*.js) and design notes (src/i18n/notes/*.js).
const sets = {
  messages: ['en', 'th', 'ja'].map((l) => [l, `../src/i18n/${l}.js`]),
  notes: ['en', 'th', 'ja'].map((l) => [l, `../src/i18n/notes/${l}.js`]),
};

// Design notes are nested one level: compare "entry.field" paths.
const keysOf = (catalogue) =>
  Object.entries(catalogue).flatMap(([key, value]) =>
    typeof value === 'object' ? Object.keys(value).map((field) => `${key}.${field}`) : [key],
  );

let failed = false;
for (const [name, files] of Object.entries(sets)) {
  const loaded = await Promise.all(
    files.map(async ([locale, path]) => [locale, new Set(keysOf((await import(path)).default))]),
  );
  const [, reference] = loaded[0];
  for (const [locale, keys] of loaded.slice(1)) {
    const missing = [...reference].filter((k) => !keys.has(k));
    const extra = [...keys].filter((k) => !reference.has(k));
    if (missing.length || extra.length) {
      failed = true;
      console.error(`${name}/${locale}: missing [${missing.join(', ')}] extra [${extra.join(', ')}]`);
    }
  }
  console.log(`${name}: ${reference.size} keys in ${loaded.length} languages`);
}
process.exit(failed ? 1 : 0);
