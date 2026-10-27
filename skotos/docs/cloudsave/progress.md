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

## Done
- engine, backends, glue, UI, text, migration; `node tools/cloud/test-sync.mjs` 60/60, `node tools/cloud/test-saves.mjs`
  84/84 (PGlite: `npm i --no-save @electric-sql/pglite@0.5.8`).
## Next
- scenario `cloud` (fake claude db in page), run save13/save14/title/panels/combat/coast, builds, README, report.
