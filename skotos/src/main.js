const q = new URLSearchParams(location.search);
if (q.has('cview')) import('./debug/creatureview.js').then((m) => m.startCreatureView(q));
else if (q.has('viewer')) import('./debug/viewer.js').then((m) => m.startViewer(q));
else if (q.has('world')) import('./debug/viewer.js').then((m) => m.startWorld(q));
else import('./game/boot.js').then((m) => m.boot(q));
