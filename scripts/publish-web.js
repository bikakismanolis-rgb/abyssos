// Uploads the test builds to the Supabase edge function "abyssos" (project TsigenisAppC),
// which serves them as download links:
//   release/abyssos.html  (npm run build:single)          -> ...?download=1
//   release/abyssos.apk   (android debug build, optional) -> ...?apk=1
//   npm run publish:web
// The upload token is read from the ABYSSOS_UPLOAD_TOKEN env var, or from the git-ignored
// file .upload-token in the project root. Never commit the token.
import { readFile, stat } from 'node:fs/promises';

const ENDPOINT = 'https://ljvyosnwsdnehlbejsvx.supabase.co/functions/v1/abyssos';
const root = new URL('../', import.meta.url);

async function token() {
  if (process.env.ABYSSOS_UPLOAD_TOKEN) return process.env.ABYSSOS_UPLOAD_TOKEN.trim();
  try { return (await readFile(new URL('.upload-token', root), 'utf8')).trim(); }
  catch { console.error('No upload token: set ABYSSOS_UPLOAD_TOKEN or create .upload-token'); process.exit(1); }
}
const TOKEN = await token();

async function publish(file, query, type, verifyQuery) {
  const path = new URL('release/' + file, root);
  try { await stat(path); } catch { console.log(file + ': not built, skipped'); return; }
  const body = await readFile(path);
  const up = await fetch(ENDPOINT + query, { method: 'POST', headers: { 'x-upload-token': TOKEN, 'Content-Type': type }, body: body });
  console.log(file + ' upload:', up.status, await up.text());
  if (!up.ok) process.exit(1);
  const check = await fetch(ENDPOINT + verifyQuery);
  const got = Buffer.from(await check.arrayBuffer());
  console.log(file + ' verify:', check.status, check.headers.get('content-type'), got.length, 'bytes', got.equals(body) ? '(identical)' : '(DIFFERS!)');
  console.log('  ' + ENDPOINT + verifyQuery);
}

await publish('abyssos.html', '', 'text/html; charset=utf-8', '?download=1');
await publish('abyssos.apk', '?f=apk', 'application/vnd.android.package-archive', '?apk=1');
