// Tiny event bus between game logic and UI.
const H = {};
export const on = (ev, fn) => (H[ev] ||= []).push(fn);
export const emit = (ev, ...a) => { const l = H[ev]; if (l) for (const fn of l) fn(...a); };
