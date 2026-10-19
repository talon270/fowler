# Fowler — suggestions

Written 2026-10-19, against commit `a0cb076` (working tree clean before this
pass).
Method: headless Chromium on `fowler.html` via `file://`, light and dark, at
390, 1440 and 1920 px, with a click-through. An unreadable-data probe on
`fowler.state.v1`. The service worker run on one local origin next to `vis`.
A read of `Store` and the worker's activate step.

**One fix applied in this pass (A1). Everything else is a suggestion and is
not implemented.** `sw.js` was clean in git, so git is the backup.

## Result

Zero page errors and console errors, both themes, all three widths. No
sideways scroll at 390 px. An unreadable save is copied to
`fowler.state.v1.corrupt.<ms>` and a toast says so.

## Part A — findings, ranked

### A1 · BUG (high): the service worker deleted every other app's offline cache — FIXED

The site is live at `talon270.github.io/fowler/`, the same origin as vis,
Study, Docket, attendance-budget, epok, inkstone, filin and shirorekha, which
share one CacheStorage. On activate, `sw.js` deleted every cache except
`fowler-v2`. Reproduced with one of the apps carrying the same filter: `vis`
opened offline afterwards returns 504 "Offline, and this file was never
cached."
**Fix (applied):** delete only names starting `fowler-`. That is one line plus
a comment. The `deleted.indexOf(true)` "upgraded" signal that reloads open
tabs still works, because it is computed over the same array. Checked on one
local origin: `vis-shell-3` survives, a planted `fowler-stale-old` is deleted,
and `fowler-v2` installs.

### A2 · DESIGN RISK (medium, unconfirmed here): a second open tab can erase the first's progress

There is no `storage` listener. Same shape as Study and Ledger, where it was
reproduced (1 → 0) and fixed. **Suggested fix:** `Store.load()` +
`Router.show()` on `storage`, as Ferm does. Not applied, because a re-render
mid-drill would reset the item on screen.

### A3 · DESIGN RISK (low): restore has no undo

`Store.importJSON()` replaces everything and saves at once. Port Inkstone's
`.pre-import` stash and Undo button.

### A4 · INCONSISTENCY (low): `PLAN-fowler.md` still says "Nothing below is implemented"

The app shipped (commits through `a0cb076`). Add a **Status:** line, as the
other plans have.
