# Cloud save: progress notes (session claude/skotos-cloudsave)

Task: cloud saves (artifact db + Supabase web build), never lose a hero. Report to the lead session
session_01PwjhM4jRXTtNyMawnxVoaV when done (send_message).

## Design (decided)
- `src/game/cloudsync.js`: pure sync engine (no game imports, node-testable). 3-way per hero: base (last agreed
  cloud rev + content hash without `played`) vs local disk record vs cloud record. Newer `played` wins a conflict; the
  loser goes to local backups (`skotos.cloud.bak.v1`, last 6). Tombstones local + cloud.
- `src/game/cloud.js`: glue (save.js applyCloud, throttle, triggers, status for UI).
- `src/net/cloudart.js`: artifact db backend (`data/users/<uid>/h-<heroId>` docs).
- `src/net/cloudsb.js`: Supabase backend, own client (storageKey `skotos-save`, localStorage), save code.
- migration `supabase/migrations/20261027120000_skotos_saves.sql` (NOT applied).
- `src/ui/cloudui.js`: settings row + cloud panel.
- tests: `tools/cloud/test-sync.mjs`, `tools/cloud/test-saves-migration.mjs` (PGlite); scenario `cloud`.

## Done (27 October)
- Everything in README.md. Tests: test-sync 60/60, test-saves 86/86, scenarios cloud, cloudweb, save13, save14, title,
  panels, combat, coast pass; vite build, build:artifact (no supabase-js), build:web OK.
- Reported to the lead (send_message).

## Second review fixed (27 October)
- Sync and other tabs: the record read after the heroes, a hero replaced or dropped only while its stored record is the
  one read, and at the end only the sync's own base and tombstone changes merged onto the record as it is then; a page
  that finds its hero written over marks the base lost (`{ lost: true }`), which no sync puts back.
- Artifact writes leased (`acquire`, shortened after the write), and each document carries a chain of its last 16
  (rev, sum): a base whose write did not stand is weighed as a conflict, never a one-sided change.
- A page left open writes nothing (clock-only changes neither dirty nor pushed); `CLOUD.busy` only while this page syncs.
- Restore: dated after a standing tombstone; `restored` backups protected. A newer version's hero greyed on the title and
  refused by `startHero`.
- Supabase: `p_player` on every call of the player's saves (`moved`), `save_hello(p_code)` with `code_ok`, the code kept
  as `{ player, code }` and shown only once confirmed, New code lets go every other user, write buckets per user, the
  players cap no longer locks out a kept code. Claim under the `skotos-cloud` lock. README: `db: {}`, who can save.
- Tests: test-sync 167/167, test-saves 126/126; scenarios cloud, cloudweb, title, save13, save14, panels, combat pass.
