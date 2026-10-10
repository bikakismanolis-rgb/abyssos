// a private dev server for the scenarios: no HMR, so other roles' edits do not reload a page mid-run
import base from '/home/user/abyssos/skotos/vite.config.js';
export default (env) => ({ ...base(env), root: '/home/user/abyssos/skotos', server: { hmr: false } });
