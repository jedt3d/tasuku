// Fails when the three languages disagree: a key missing or extra, or a {placeholder} that differs.
// Covers interface text (src/i18n/*.js) and design notes (src/i18n/notes/*.js).
const sets = {
  messages: ['en', 'th', 'ja'].map((l) => [l, `../src/i18n/${l}.js`]),
  notes: ['en', 'th', 'ja'].map((l) => [l, `../src/i18n/notes/${l}.js`]),
};

// Design notes are nested one level: flatten to "entry.field" → text.
const flatten = (catalogue) =>
  new Map(
    Object.entries(catalogue).flatMap(([key, value]) =>
      typeof value === 'object'
        ? Object.entries(value).map(([field, text]) => [`${key}.${field}`, [text].flat().join('\n')])
        : [[key, value]],
    ),
  );
const placeholders = (text) => (text.match(/\{\w+\}/g) ?? []).sort().join();

let failed = false;
for (const [name, files] of Object.entries(sets)) {
  const loaded = await Promise.all(
    files.map(async ([locale, path]) => [locale, flatten((await import(path)).default)]),
  );
  const [, reference] = loaded[0];
  for (const [locale, texts] of loaded.slice(1)) {
    const missing = [...reference.keys()].filter((k) => !texts.has(k));
    const extra = [...texts.keys()].filter((k) => !reference.has(k));
    const differing = [...reference.keys()].filter(
      (k) => texts.has(k) && placeholders(texts.get(k)) !== placeholders(reference.get(k)),
    );
    if (missing.length || extra.length || differing.length) {
      failed = true;
      console.error(
        `${name}/${locale}: missing [${missing.join(', ')}] extra [${extra.join(', ')}] placeholders differ [${differing.join(', ')}]`,
      );
    }
  }
  console.log(`${name}: ${reference.size} keys in ${loaded.length} languages`);
}
process.exit(failed ? 1 : 0);
