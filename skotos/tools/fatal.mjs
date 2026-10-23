// The game's runtime errors from its timers, the update loop, a zone's entry and a hero's start go to an on-screen #fatal
// box (boot.js fatal()), not the console, so a tool that listens only to the console misses them. watchFatal(browser)
// makes every page the browser opens (browser.newPage and every browser.newContext's pages) report each new line of the
// box as it appears, and returns the list of lines seen so far (a page reloaded or closed keeps what it reported);
// fatalNow(pages) reads the boxes still on screen, for whatever the last poll missed.
const MARK = '#fatal: ';
export function watchFatal(browser) {
  const lines = [], newContext = browser.newContext.bind(browser);
  browser.newContext = async (...a) => {
    const ctx = await newContext(...a);
    await ctx.addInitScript((mark) => {
      let n = 0;
      setInterval(() => { const t = document.getElementById('fatal')?.textContent || ''; if (t.length > n) { console.error(mark + t.slice(n).replace(/^\n/, '')); n = t.length; } }, 250);
    }, MARK);
    ctx.on('console', (m) => { const t = m.text(); if (m.type() === 'error' && t.startsWith(MARK)) lines.push(t.slice(MARK.length)); });
    return ctx;
  };
  return lines;
}
export async function fatalNow(pages) {
  const out = [];
  for (const p of pages) { const t = await p.evaluate(() => document.getElementById('fatal')?.textContent || '').catch(() => ''); if (t) out.push(t); }
  return out;
}
// every line seen and every box still on screen, without repeats
export async function fatalAll(browser, lines) {
  const seen = new Set(lines), now = await fatalNow(browser.contexts().flatMap((c) => c.pages()));
  for (const t of now) for (const l of t.split('\n')) if (l && ![...seen].some((s) => s.includes(l))) seen.add(l);
  return [...seen];
}
