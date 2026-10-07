// Who is signed in, and the language they last chose. All rules live in the database (ADR 0002);
// this only reads what Row Level Security lets the person see.
import { untrack } from 'svelte';
import { setLocale } from '@ui/i18n/index.svelte.js';
import { supabase } from './supabase.js';

// `staff` and `customer` are the person's own records, or null. Someone who is both is shown the
// Staff side of Tasuku.
export const auth = $state({ ready: false, failed: false, userId: null, email: null, staff: null, customer: null });

// The browser remembers the language only for visits that are not signed in.
const LOCALE = 'tasuku.locale';
const browser = {
  get: (key) => { try { return localStorage.getItem(key); } catch { return null; } },
  set: (key, value) => { try { localStorage.setItem(key, value); } catch { /* private mode: not remembered */ } },
};

function saveLanguage(code) {
  (auth.staff ?? auth.customer).language = code;
  supabase
    .from(auth.staff ? 'staff' : 'customers')
    .update({ language: code })
    .eq('user_id', auth.userId)
    .then(({ error }) => error && console.error('Language preference was not saved:', error.message));
}

async function load(session) {
  const userId = session?.user.id ?? null;
  // Auth repeats SIGNED_IN whenever the tab regains focus; the same person needs no reload.
  if (auth.ready && userId === auth.userId) return;

  let staff = null;
  let customer = null;
  let failed = false;
  if (session) {
    // A signed-in email that is not registered gets no row, and so no stored language.
    const [asStaff, asCustomer] = await Promise.all([
      supabase.from('staff').select('name, is_task_master, language').eq('user_id', userId).maybeSingle(),
      supabase.from('customers').select('language').eq('user_id', userId).maybeSingle(),
    ]);
    staff = asStaff.data;
    customer = asCustomer.data;
    failed = Boolean(asStaff.error ?? asCustomer.error);
  }
  Object.assign(auth, { userId, email: session?.user.email ?? null, staff, customer, failed, ready: true });

  // Once signed in, the stored preference always wins over what this browser remembered.
  const stored = (staff ?? customer)?.language;
  if (stored) setLocale(stored);
}

export function start() {
  const saved = browser.get(LOCALE);
  if (saved) setLocale(saved);
  supabase.auth.onAuthStateChange((event, session) => {
    // Do not call Supabase from inside this callback: it would wait on itself.
    if (['INITIAL_SESSION', 'SIGNED_IN', 'SIGNED_OUT'].includes(event)) setTimeout(() => load(session));
  });
}

// Called with the interface language on every page; acts only when the language has changed.
export function rememberLocale(code) {
  if (code === (browser.get(LOCALE) ?? 'en')) return;
  browser.set(LOCALE, code);
  untrack(() => {
    const me = auth.staff ?? auth.customer;
    if (me && me.language !== code) saveLanguage(code);
  });
}

export const signOut = () => supabase.auth.signOut();

// How a Staff member is shown: by the name they set, or by email until they set one.
export const displayName = (person) => person.name || person.email;
