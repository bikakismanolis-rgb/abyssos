import { TEXT } from './text.js';

let L = 0; // 0 Greek, 1 English
export function setLang(code) { L = code === 'en' ? 1 : 0; document.documentElement.lang = code === 'en' ? 'en' : 'el'; }
export const lang = () => (L ? 'en' : 'el');
export function t(key, ...a) {
  const e = TEXT[key];
  let s = e ? e[L] ?? e[0] : key;
  for (let i = 0; i < a.length; i++) s = s.split('{' + i + '}').join(a[i]);
  return s;
}
export const has = (key) => !!TEXT[key];
export const list = (key) => t(key).split(',');
