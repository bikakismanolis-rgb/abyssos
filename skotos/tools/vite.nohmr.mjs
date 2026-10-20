// a private dev server without hot reload (several sessions can run their own: vite --config tools/vite.nohmr.mjs --port N)
import { defineConfig } from 'vite';
export default defineConfig({ root: new URL('..', import.meta.url).pathname, server: { hmr: false } });
