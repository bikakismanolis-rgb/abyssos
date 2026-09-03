// Uploads release/abyssos.html to the Supabase edge function "abyssos" (project TsigenisAppC),
// which serves it as a download link. Run `npm run build:single` first.
//   npm run publish:web
// The upload token is read from the ABYSSOS_UPLOAD_TOKEN env var, or from the git-ignored
// file .upload-token in the project root. Never commit the token.
import { readFile } from 'node:fs/promises';

const ENDPOINT = 'https://ljvyosnwsdnehlbejsvx.supabase.co/functions/v1/abyssos';
const root = new URL('../', import.meta.url);

async function token() {
  if (process.env.ABYSSOS_UPLOAD_TOKEN) return process.env.ABYSSOS_UPLOAD_TOKEN.trim();
  try { return (await readFile(new URL('.upload-token', root), 'utf8')).trim(); }
  catch { console.error('No upload token: set ABYSSOS_UPLOAD_TOKEN or create .upload-token'); process.exit(1); }
}

const html = await readFile(new URL('release/abyssos.html', root));
const up = await fetch(ENDPOINT, {
  method: 'POST',
  headers: { 'x-upload-token': await token(), 'Content-Type': 'text/html; charset=utf-8' },
  body: html
});
console.log('upload:', up.status, await up.text());
if (!up.ok) process.exit(1);

const check = await fetch(ENDPOINT + '?download=1');
const body = Buffer.from(await check.arrayBuffer());
console.log('verify:', check.status, body.length, 'bytes', body.equals(html) ? '(identical to release/abyssos.html)' : '(DIFFERS!)');
console.log('download: ' + ENDPOINT + '?download=1');
