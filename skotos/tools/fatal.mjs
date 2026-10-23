// The game's runtime errors from timers and the update loop go to the on-screen #fatal box (boot.js fatal()), not to
// the console, so a run that only listens to the console misses them. watchFatal(pageOrContext, sink, label) has every
// page report any new #fatal text into sink (an array), as it appears, reloads and closed pages included; a run fails
// when sink is not empty (fatalFail).
export async function watchFatal(target, sink, label = '') {
  const fn = '__fatalOut';
  if (!target.__fatalWatched) {
    target.__fatalWatched = true;
    await target.exposeFunction(fn, (t) => { sink.push((label ? '[' + label + '] ' : '') + 'fatal: ' + String(t).slice(0, 400)); });
    await target.addInitScript((fn) => {
      let seen = 0;
      setInterval(() => {
        const el = document.getElementById('fatal'), t = el?.textContent || '';
        if (t.length > seen) { const add = t.slice(seen); seen = t.length; try { window[fn](add); } catch (e) { /* the page is going */ } }
      }, 100);
    }, fn);
  }
}
// a browser whose every new context is watched, so every page a scenario opens beside its own (browser.newPage makes
// its page's context through browser.newContext)
export function watchBrowser(browser, sink) {
  const nc = browser.newContext.bind(browser);
  let k = 0;
  browser.newContext = async (...a) => { const c = await nc(...a); await watchFatal(c, sink, k ? 'page' + k : ''); k++; return c; };
  return browser;
}
// a scenario's result with the #fatal text folded in: any fatal fails it
export function fatalFail(res, sink) {
  if (!sink.length) return res;
  const r = res && typeof res === 'object' ? res : { value: res };
  return Object.assign(r, { pass: false, fatal: sink.slice(0, 10) });
}
