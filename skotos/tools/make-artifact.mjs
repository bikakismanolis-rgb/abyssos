// Turns dist/index.html into a page fragment for publishing (the host adds doctype/head/body).
import { readFileSync, writeFileSync, mkdirSync, cpSync, readdirSync, rmSync } from 'node:fs';
const out = process.argv[2] || 'artifact';
rmSync(out, { recursive: true, force: true });
mkdirSync(out + '/assets', { recursive: true });
const src = process.argv[3] || 'dist-artifact';
let html = readFileSync(src + '/index.html', 'utf8');
const head = html.match(/<head>([\s\S]*?)<\/head>/)[1];
const body = html.match(/<body>([\s\S]*?)<\/body>/)[1];
const keep = head.split('\n').filter((l) => !/<meta charset|<meta name="viewport"/.test(l)).join('\n');
const page = (keep + '\n' + body).replace(/\.\/assets\//g, 'assets/').trim() + '\n';
writeFileSync(out + '/index.html', page);
for (const f of readdirSync(src + '/assets')) if (!f.startsWith('viewer')) cpSync(src + '/assets/' + f, out + '/assets/' + f);
console.log(page);
console.log(readdirSync(out + '/assets').join('\n'));
