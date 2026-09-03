// Tiny i18n: t(key, params) looks the key up in the current language, falling back to Greek.
// Static DOM text is marked with data-i18n="key" and refreshed by applyDom() on every language change.
import el from './el.js';
import en from './en.js';

const DICTS = { el: el, en: en };
export const LANGS = ['el', 'en'];
export let lang = 'el';

export function deviceLang() {
  const l = (navigator.language || '').toLowerCase();
  return l.startsWith('el') ? 'el' : 'en';
}

export function setLang(l) {
  lang = DICTS[l] ? l : 'el';
  document.documentElement.lang = lang;
  applyDom();
}

export function t(key, params) {
  let s = DICTS[lang][key];
  if (s === undefined) s = el[key];
  if (s === undefined) return key;
  if (params) s = s.replace(/\{(\w+)\}/g, function (m, k) { return params[k] !== undefined ? params[k] : m; });
  return s;
}

export function applyDom() {
  document.querySelectorAll('[data-i18n]').forEach(function (n) { n.textContent = t(n.getAttribute('data-i18n')); });
  document.querySelectorAll('[data-i18n-aria]').forEach(function (n) { n.setAttribute('aria-label', t(n.getAttribute('data-i18n-aria'))); });
  document.title = t('app.name');
}

// Thousands separator follows the language: 1.234 in Greek, 1,234 in English
export function thousands() { return lang === 'el' ? '.' : ','; }
