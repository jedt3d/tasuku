// Interface text in three languages. English is the default and the fallback.
// Components call t('key'); the text follows the current locale because i18n is reactive state.
import en from './en.js';
import ja from './ja.js';
import th from './th.js';

export const locales = ['en', 'th', 'ja'];
const catalogues = { en, th, ja };
// Thai uses the Gregorian calendar here so the three languages always show the same year.
const tags = { en: 'en-GB', th: 'th-TH-u-ca-gregory', ja: 'ja-JP' };

export const i18n = $state({ locale: 'en' });

export function setLocale(code) {
  i18n.locale = catalogues[code] ? code : 'en';
  document.documentElement.lang = i18n.locale;
}

export const formatList = (items) =>
  new Intl.ListFormat(tags[i18n.locale], { type: 'conjunction' }).format(items);

export function t(key, vars) {
  const text = catalogues[i18n.locale][key] ?? en[key] ?? key;
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (_, name) =>
    Array.isArray(vars[name]) ? formatList(vars[name]) : (vars[name] ?? ''),
  );
}

export const formatDate = (value, options = { day: 'numeric', month: 'short' }) =>
  new Intl.DateTimeFormat(tags[i18n.locale], { timeZone: 'UTC', ...options }).format(new Date(value));

export const formatDateTime = (value) =>
  formatDate(value, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });

export const relative = (amount, unit) =>
  new Intl.RelativeTimeFormat(tags[i18n.locale], { numeric: 'auto' }).format(amount, unit);
