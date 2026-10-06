const q = new URLSearchParams(location.search);
// the debug views have no loading screen
if (q.has('cview') || q.has('viewer') || q.has('world')) window.__boot?.done();
if (q.has('cview')) import('./debug/creatureview.js').then((m) => m.startCreatureView(q));
else if (q.has('viewer')) import('./debug/viewer.js').then((m) => m.startViewer(q));
else if (q.has('world')) import('./debug/viewer.js').then((m) => m.startWorld(q));
else {
  window.__boot?.set(0.06, window.__boot.L?.game);
  // while the loading screen is up its bar shows the error; later ones go to the game's own error overlay
  import('./game/boot.js').then((m) => m.boot(q)).catch((e) => { if (document.getElementById('boot')) window.__boot?.fail(e?.message || e); else throw e; });
}
