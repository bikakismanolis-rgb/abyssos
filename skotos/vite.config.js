import { defineConfig, loadEnv, normalizePath } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath } from 'node:url';
import { realpathSync } from 'node:fs';

// `vite build`                 -> dist/           static site (models as separate .glb files)
// `vite build --mode artifact` -> dist-artifact/  same, with the models inlined into the scripts
// `vite build --mode single`   -> release/        one self-contained index.html
// `vite build --mode web`      -> dist-web/       the static site with co-op over Supabase: src/net/netcfg.web.js in
//                                                 netcfg.js's place (supabase-js, VITE_SUPABASE_URL and
//                                                 VITE_SUPABASE_ANON_KEY from .env.web.local or the shell;
//                                                 docs/coop/supabase.md). No other build carries supabase-js
// (a file as Vite names a module: its real path, forward slashes on every system (Windows too: C:/.../netcfg.js), no
// query; compared without case on Windows, whose paths have none)
const idOf = (p) => { let f = p.split('?')[0]; try { f = realpathSync(f); } catch (e) { /* as given */ } return normalizePath(f); };
const sameFile = (a, b) => (process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b);
const NETCFG = idOf(fileURLToPath(new URL('./src/net/netcfg.js', import.meta.url)));
const NETCFG_WEB = idOf(fileURLToPath(new URL('./src/net/netcfg.web.js', import.meta.url)));
// (whoever imports net/netcfg.js gets net/netcfg.web.js instead; a web build in which that did not happen would be the
// single-player game with nothing said, so it fails)
const webNetcfg = () => ({
  name: 'skotos-netcfg-web',
  enforce: 'pre',
  async resolveId(src, importer, opts) {
    if (!src.endsWith('netcfg.js')) return null;
    const r = await this.resolve(src, importer, { ...opts, skipSelf: true });
    return r && !r.external && sameFile(idOf(r.id), NETCFG) ? NETCFG_WEB : r;
  },
  buildEnd(err) {
    if (err) return;
    const ids = [...this.getModuleIds()].map(idOf);
    if (!ids.some((id) => sameFile(id, NETCFG_WEB)) || ids.some((id) => sameFile(id, NETCFG))) this.error('build:web: src/net/netcfg.web.js did not take src/net/netcfg.js\'s place, so this build would have no co-op (vite.config.js, webNetcfg)');
  }
});

export default defineConfig(({ mode }) => {
  const single = mode === 'single', artifact = mode === 'artifact', web = mode === 'web';
  if (web) {
    const env = loadEnv(mode, process.cwd(), 'VITE_SUPABASE_');
    if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) console.warn('build:web: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set: this build has no co-op (docs/coop/supabase.md)');
  }
  return {
    base: './',
    build: {
      target: 'es2020',
      outDir: single ? 'release' : artifact ? 'dist-artifact' : web ? 'dist-web' : 'dist',
      emptyOutDir: true,
      chunkSizeWarningLimit: 6000,
      assetsInlineLimit: single || artifact ? 1e8 : 4096
    },
    plugins: single ? [viteSingleFile()] : web ? [webNetcfg()] : []
  };
});
