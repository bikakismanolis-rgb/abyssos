// Builds the signed release bundle (AAB) for Google Play.
//   npm run android:release
// Google Play wants the game inside the package, so this temporarily removes `server.url`
// (the live-update test channel) from capacitor.config.json, syncs, builds, and restores it.
// Needs android/keystore.properties (see android/app/build.gradle) and JAVA_HOME pointing at a JDK 21.
import { readFile, writeFile, copyFile, mkdir, stat } from 'node:fs/promises';
import { execSync } from 'node:child_process';

const root = new URL('../', import.meta.url);
const cfgPath = new URL('capacitor.config.json', root);
const original = await readFile(cfgPath, 'utf8');
const cfg = JSON.parse(original);
delete cfg.server;

try { await stat(new URL('android/keystore.properties', root)); }
catch { console.error('Missing android/keystore.properties. See android/app/build.gradle for the format.'); process.exit(1); }

const run = (cmd, cwd) => { console.log('> ' + cmd); execSync(cmd, { stdio: 'inherit', cwd: cwd ? new URL(cwd, root) : root, shell: true }); };
try {
  await writeFile(cfgPath, JSON.stringify(cfg, null, 2) + '\n');
  run('npm run build');
  run('npx cap sync android');
  run(process.platform === 'win32' ? 'gradlew.bat bundleRelease --no-daemon -q' : './gradlew bundleRelease --no-daemon -q', 'android/');
  await mkdir(new URL('release/', root), { recursive: true });
  await copyFile(new URL('android/app/build/outputs/bundle/release/app-release.aab', root), new URL('release/abyssos-release.aab', root));
  console.log('\nrelease/abyssos-release.aab is ready for the Play Console.');
} finally {
  await writeFile(cfgPath, original);   // back to the live-update config for the test channel
  run('npx cap sync android');
}
