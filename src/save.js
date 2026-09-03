// Best depth. Same key as the original single-file version; localStorage replaces the artifact-only window.storage.
// The versioned save schema (settings, meta) comes in phase 1 step 3.
const KEY='abyssos-best';
export let best=0;
export function saveBest(v){best=v;try{localStorage.setItem(KEY,String(v));}catch(e){}}
export function loadBest(){try{best=parseInt(localStorage.getItem(KEY),10)||0;}catch(e){best=0;}return best;}
