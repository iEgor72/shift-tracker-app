# Worktree Status

Generated: 2026-05-05 12:16:40 +0000

## git status -sb
```text
## main...origin/main
 M ai-memory/PROJECT_STATE.md
```

## git branch -vv
```text
+ calendar-fix-main                             4b9e6c6 (/tmp/bloknot-batch/calendar-fix) Fix home calendar to show manual shifts only
+ chore/remove-graphs-and-restore-calendar-flow e90d829 (/tmp/bloknot-remove-graphs) refactor(app): remove remaining schedule tails
+ cleanup-archaeology                           6219db2 (/tmp/bloknot-batch/archaeology) Revert "refactor(schedule): switch app to manual-only shifts"
+ cleanup-backend                               6219db2 (/tmp/bloknot-clean/backend) Revert "refactor(schedule): switch app to manual-only shifts"
+ cleanup-backend-migrate                       6219db2 (/tmp/bloknot-batch/backend-migrate) Revert "refactor(schedule): switch app to manual-only shifts"
+ cleanup-frontend                              6219db2 (/tmp/bloknot-clean/frontend) Revert "refactor(schedule): switch app to manual-only shifts"
+ cleanup-frontend-smoke                        ed81af6 (/tmp/bloknot-batch/frontend-smoke) Hide schedule planner UI from frontend
+ cleanup-integration                           dba6ed0 (/tmp/bloknot-batch/integration) Remove schedule planner and add local smoke test
+ cleanup-review                                6219db2 (/tmp/bloknot-clean/review) Revert "refactor(schedule): switch app to manual-only shifts"
+ cleanup-test-harness                          6219db2 (/tmp/bloknot-batch/test-harness) Revert "refactor(schedule): switch app to manual-only shifts"
+ feat/manual-calendar-from-scratch             8345ab9 (/tmp/bloknot-manual-calendar) feat(home): polish manual calendar flow
* main                                          b286f5f [origin/main] feat(poekhali): derive speeds from speed documents
```

## HEAD
```text
b286f5f feat(poekhali): derive speeds from speed documents
 ai-memory/CHANGELOG.md           |    8 +
 ai-memory/sessions/2026-05-05.md |    1 +
 assets/tracker/speed-docs.json   | 3114 ++++++++++++++++++++++++++++----------
 scripts/app-constants.js         |    2 +-
 scripts/import-speed-docs.py     |  154 ++
 scripts/poekhali-tracker.js      |   15 +-
 sw.js                            |    2 +-
 7 files changed, 2470 insertions(+), 826 deletions(-)
```
