// The text of every email, in the recipient's language. The catalogues are checked with the
// interface text (storybook/scripts/check-i18n.js). What people wrote is never translated.
import en from './en.js';
import ja from './ja.js';
import th from './th.js';

const catalogues = { en, th, ja };

// `kind`: added, comment, resolved, reminder, closed, cancelled, assigned, unassigned or
// transferred. `values`: id, title, actor, link, and where the text names them `hours` (how long
// before the Task closes by itself) and `owner` (the Owner of the Task).
export function write(language, kind, values) {
  const fill = (text) => text.replace(/\{(\w+)\}/g, (_, key) => values[key]);
  const { subject, body } = (catalogues[language] ?? en)[kind];
  // A subject is one line, whatever the title of the Task holds.
  return { subject: fill(subject).replace(/\s+/g, ' '), text: fill(body) };
}
