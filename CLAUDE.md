# CLAUDE.md – Planner

Vanilla JS ohne Build, gleiche Supabase-Datenbank wie die Handwerk-ERP (`../handwerk-erp`). Arbeitssprache Deutsch.
Die Migrationen für Planner und ERP und die Regeln dazu stehen im ERP-Repo (`../handwerk-erp/CLAUDE.md`).

## Testumgebung – erst testen, dann live (Details: `../handwerk-erp/TESTUMGEBUNG.md`)
- **Immer auf den Zweig `test` pushen** (`git push origin HEAD:test`), nie direkt auf `main`.
  `test` läuft unter https://test-planner.joke-solutions.eu auf der Testdatenbank (oranges Band oben).
- `config.js` wählt die Datenbank nach der Adresse: nur `planner.joke-solutions.eu` ist live.
- **Live erst nach ausdrücklicher Freigabe des Nutzers im Chat**: `git push origin origin/test:main` (nur vorspulen).
- Neue Migration in `supabase/migrations/`: Kopie in `../handwerk-erp/supabase/tests/planner/` mitziehen und dort
  mit `npm run testdb -- migrate` zuerst auf die Testdatenbank spielen.
- Tests: `npm test` (Playwright im Demo-Modus).
