# DeepSeek Harness Remote Workspace Viewer

**Date:** 2026-08-17
**Status:** Complete
**Last Updated:** 2026-08-17 07:34 EDT
**Blocked Reason:** None
**Agent:** `chip`

---

## Goal

Diagnose and, if needed, repair the DSH workspace browser/file viewer path that showed an error while DSH was briefly reachable from Derrick's phone after the `dsh.sh` nerve-preservation fix.

---

## Overview

This investigation belongs to the `deepseek-harness` repo, not the Nerve repos. The user report names the window when `dsh` itself was reachable on mobile, and this repo contains both the shared DSH workspace browser package and the installable OpenClaw workspace file viewer plugin that adds a sidebar action and overlay.

Current evidence now shows the visible file-viewer failure is in the OpenClaw workspace file viewer plugin's browser-half Remote access path, not in the baseline DSH workspace/session UI and not in the host root/path validation layer. The browser half mounts `workspaceFileViewer` through Typert Remote and then calls `ctx.remote.workspaceFileViewer.*` from the overlay inject face, but the plugin only injects `remote`, not `remote.workspaceFileViewer`. On the reproduced HTTPS DSH route the overlay opens, then fails before making any viewer RPC with the exact UI error `Could not load: cannot get property "remote.workspaceFileViewer" without inject`.

The local launcher change is still relevant context because it changes which web app the phone can actually reach. The current `workspace/scripts/dsh.sh` no longer enables `tailscale serve` by default, while Cookie's backup always rewrote the MagicDNS HTTPS route to the current DSH port. During repro, `tailscale serve status` initially still pointed `https://derrick-surface-pro-8.tail613fcb.ts.net/` at `http://127.0.0.1:3080`, which served Nerve rather than DSH. Re-running the current wrapper with `DSH_TAILSCALE_SERVE=1` switched HTTPS back to DSH on `3081`, which made the file-viewer repro possible.

---

## REFERENCES

| ID | Description | Path |
| --- | --- | --- |
| `REF-01` | DSH repo overview and run instructions | `/home/derrick/.openclaw/workspace/projects/deepseek-harness/README.md` |
| `REF-02` | DSH repo agent/developer instructions | `/home/derrick/.openclaw/workspace/projects/deepseek-harness/AGENTS.md` |
| `REF-03` | Shared DSH workspace browser package behavior | `/home/derrick/.openclaw/workspace/projects/deepseek-harness/packages/client/ui-workspace/README.md` |
| `REF-04` | OpenClaw DSH workspace file viewer plugin README | `/home/derrick/.openclaw/workspace/projects/deepseek-harness/plugins/openclaw-workspace-file-viewer/README.md` |
| `REF-05` | Browser-half plugin mount and load path | `/home/derrick/.openclaw/workspace/projects/deepseek-harness/plugins/openclaw-workspace-file-viewer/src/client/index.ts` |
| `REF-06` | Host-half Remote filesystem implementation | `/home/derrick/.openclaw/workspace/projects/deepseek-harness/plugins/openclaw-workspace-file-viewer/src/index.ts` |
| `REF-07` | Existing plugin host tests | `/home/derrick/.openclaw/workspace/projects/deepseek-harness/plugins/openclaw-workspace-file-viewer/tests/workspace-file-viewer.spec.ts` |
| `REF-08` | Local DSH launcher wrapper modified to preserve Nerve | `/home/derrick/.openclaw/workspace/scripts/dsh.sh` |
| `REF-09` | Cookie backup of pre-fix DSH launcher wrapper | `/home/derrick/.openclaw/workspace/scripts/dsh.sh.bak-20260817053626-cookie` |

---

## Tasks

### Task 1: Reproduce And Trace The Remote Failure

**Bead ID:** `oc-3h9`
**SubAgent:** `primary`
**Role:** `research`
**References:** `REF-01`, `REF-04`, `REF-05`, `REF-06`, `REF-08`, `REF-09`
**Prompt:** Claim the assigned bead on start. Read `/home/derrick/.openclaw/workspace/projects/deepseek-harness/README.md` and inspect the installed OpenClaw workspace file viewer plugin plus the local `workspace/scripts/dsh.sh` launcher change. Reproduce the remote/mobile-accessible DSH path as closely as possible, capture the exact workspace viewer error, and determine whether the failure occurs at Remote mount, roots/list/read invocation, or root/path validation. Do not patch code yet. Record exact commands, browser/network evidence, and likely root cause candidates.

**Folders Created/Deleted/Modified:**
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/.plans/`

**Files Created/Deleted/Modified:**
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/.plans/2026-08-17-dsh-remote-workspace-viewer.md`

**Status:** ✅ Complete

**Results:** Reproduced the failure on the remote-style HTTPS DSH route and captured the exact break:

- Commands run:
  - `bd update oc-3h9 --status in_progress --json`
  - `sed -n '1,260p' /home/derrick/.openclaw/workspace/scripts/dsh.sh`
  - `sed -n '1,260p' /home/derrick/.openclaw/workspace/scripts/dsh.sh.bak-20260817053626-cookie`
  - `tailscale serve status`
  - `env DSH_TAILSCALE_SERVE=1 DSH_PORT=3081 /home/derrick/.openclaw/workspace/scripts/dsh.sh`
  - `curl -I https://derrick-surface-pro-8.tail613fcb.ts.net/`
  - Playwright against `https://derrick-surface-pro-8.tail613fcb.ts.net/`
- Launcher evidence:
  - Current `dsh.sh` leaves `tailscale serve` unchanged unless `DSH_TAILSCALE_SERVE=1`.
  - Backup `dsh.sh.bak-20260817053626-cookie` always ran `tailscale serve --bg --yes --https "${SERVE_HTTPS_PORT}" "http://127.0.0.1:${PORT}"` when a MagicDNS name existed.
  - Before forced repro, `tailscale serve status` still mapped `https://derrick-surface-pro-8.tail613fcb.ts.net/` to `http://127.0.0.1:3080`, which served Nerve, not DSH.
- Remote/browser evidence after forcing `DSH_TAILSCALE_SERVE=1`:
  - DSH started on `http://127.0.0.1:3081`.
  - HTTPS route served DSH and included `@openclaw/dsh-workspace-file-viewer` in `window.__DSH_BOOT__.entries`.
  - The sidebar button rendered with aria label `Open workspace file browser`.
  - Clicking the button opened the overlay heading `Workspace files` and showed the exact error text:
    - `Could not load: cannot get property "remote.workspaceFileViewer" without inject`
  - Captured network/console evidence:
    - Browser console already showed unrelated `403` responses for `api/credentials.describe`, `codex-subscription/preferences/status`, and `api/settings.describe`.
    - Clicking the Files button generated **zero new requests**, proving the failure occurs before any `workspaceFileViewer.roots()` RPC is issued.
- Failure stage:
  - `Remote mount`: plugin bundle loads far enough to render the button and overlay.
  - `roots/list/read invocation`: fails before `roots()` invocation because `ctx.remote.workspaceFileViewer` access itself throws.
  - `root/path validation`: not reached in this repro.
- Root-cause hypothesis and next fix seam:
  - Browser plugin file `plugins/openclaw-workspace-file-viewer/src/client/index.ts` declares `export const inject = ['slots', 'locale', 'remote']` but later calls `ctx.remote.workspaceFileViewer.*`.
  - Other working Remote-backed browser plugins in this repo inject both `remote` and their concrete namespace key (for example `remote.pluginInventory`, `remote.goals`, `remote.commands`).
  - Task 2 should stay focused on the client browser-half inject contract first: add `remote.workspaceFileViewer` to the plugin inject list and add/adjust a client test that fails without that concrete Remote namespace injection.
  - Bead `oc-3h9` was closed after the repro, evidence capture, and fix-seam handoff.

---

### Task 2: Implement The Narrow Fix

**Bead ID:** `oc-78l`
**SubAgent:** `primary`
**Role:** `coder`
**References:** `REF-04`, `REF-05`, `REF-06`, `REF-07`
**Prompt:** Claim the assigned bead on start. Read `/home/derrick/.openclaw/workspace/projects/deepseek-harness/README.md` first, then patch only the minimum code/config needed to make the OpenClaw workspace file viewer load correctly in the reproduced remote-access scenario. Add or update focused tests for the repaired path. Run only the relevant checks for the touched plugin/package, commit, and push the current branch.

**Folders Created/Deleted/Modified:**
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/plugins/openclaw-workspace-file-viewer/`

**Files Created/Deleted/Modified:**
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/plugins/openclaw-workspace-file-viewer/src/client/index.ts`
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/plugins/openclaw-workspace-file-viewer/tests/browser-plugin.client.spec.ts`
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/.plans/2026-08-17-dsh-remote-workspace-viewer.md`

**Status:** ✅ Complete

**Results:** Implemented the narrow client-side repair and committed it in `ee0f382f3758d9d70b921607633f060c53efc3cf` (`fix(workspace-file-viewer): inject remote namespace`).

- Code change:
  - Added `remote.workspaceFileViewer` to `plugins/openclaw-workspace-file-viewer/src/client/index.ts` so the browser-half plugin explicitly injects the concrete Remote namespace it dereferences through `ctx.remote.workspaceFileViewer.*`.
- Focused client coverage:
  - Updated `plugins/openclaw-workspace-file-viewer/tests/browser-plugin.client.spec.ts` to assert the narrower inject contract and to exercise sidebar/overlay injected `roots`, `list`, and `read` adapters through both success and failure paths.
- Relevant checks run:
  - `pnpm exec vitest run plugins/openclaw-workspace-file-viewer/tests/browser-plugin.client.spec.ts --coverage --coverage.include='plugins/openclaw-workspace-file-viewer/src/client/index.ts'`
  - Result: passed with `100%` statements / branches / functions / lines for `plugins/openclaw-workspace-file-viewer/src/client/index.ts`.

Housekeeping truth recorded during implementation:

- The live dependency chain is `oc-78l` -> `oc-w2s` -> `oc-9f7`.
- Earlier duplicate open Beads `oc-1x5`, `oc-cs7`, and `oc-aew` still exist in the repo but are not referenced by the approved plan and are not the active execution path.
- Treat those earlier open Beads as tracker noise to clean up after the live chain completes unless they become needed for explicit triage sooner.

---

### Task 3: Verify The Remote Viewer End To End

**Bead ID:** `oc-w2s`
**SubAgent:** `primary`
**Role:** `qa`
**References:** `REF-04`, `REF-05`, `REF-06`, `REF-07`, `REF-08`
**Prompt:** Claim the assigned bead on start. Read `/home/derrick/.openclaw/workspace/projects/deepseek-harness/README.md` first. After the fix is pushed, validate the plugin in the actual DSH web surface, including the remote/mobile-access path if available. Confirm the sidebar action opens, roots load, directory listing works, and a readable text/markdown file opens without console or transport errors. Report the exact evidence and fail on unexpected warnings/errors.

**Folders Created/Deleted/Modified:**
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/.plans/`
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/apps/web/.artifacts/workspace-viewer-qa-2026-08-17/`

**Files Created/Deleted/Modified:**
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/.plans/2026-08-17-dsh-remote-workspace-viewer.md`
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/apps/web/.artifacts/workspace-viewer-qa-2026-08-17/result.json`
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/apps/web/.artifacts/workspace-viewer-qa-2026-08-17/01-overlay-open.png`
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/apps/web/.artifacts/workspace-viewer-qa-2026-08-17/failure.png`

**Status:** ✅ Complete

**Results:** The rerun of the required remote/mobile-style HTTPS QA path now passes on the actual DSH surface after the shipped artifact rebuild, so Bead `oc-w2s` is closed and ready for audit handoff.

- Exact URL/path exercised:
  - `https://derrick-surface-pro-8.tail613fcb.ts.net/`
  - Viewer path attempted: `OpenClaw workspace -> projects -> deepseek-harness -> README.md`
- Exact commands run:
  - `bd update oc-w2s --status in_progress --json`
  - `git status --short --branch`
  - `bd show oc-w2s --json`
  - `sed -n '1,260p' AGENTS.md`
  - `sed -n '1,260p' /home/derrick/.openclaw/workspace/skills/desktop-control/SKILL.md`
  - `sed -n '1,260p' /home/derrick/.openclaw/workspace/skills/tmux/SKILL.md`
  - `rg -n "playwright|Workspace files|workspace file viewer|Open workspace file browser|remote.workspaceFileViewer|tail613fcb|tailscale serve|roots\\(" -S .`
  - `rg --files . | rg 'playwright|e2e|workspace-file-viewer|browser-plugin|dsh.sh|tail'`
  - `sed -n '1,240p' apps/web/tests/workspace-file-viewer.e2e.ts`
  - `sed -n '1,240p' apps/web/tests/support.ts`
  - `sed -n '1,260p' apps/web/tests/scaffold.ts`
  - `sed -n '1,260p' /home/derrick/.openclaw/workspace/scripts/dsh.sh`
  - `tailscale serve status`
  - `curl -Ik https://derrick-surface-pro-8.tail613fcb.ts.net/`
  - `curl -s http://127.0.0.1:3080/ | sed -n '1,220p'`
  - `curl -s http://127.0.0.1:3081/ | sed -n '1,220p'`
  - `env DSH_TAILSCALE_SERVE=1 DSH_PORT=3081 /home/derrick/.openclaw/workspace/scripts/dsh.sh`
  - `pnpm exec tsx <<'EOF' ... EOF` from `apps/web/` to drive Playwright against the HTTPS route and capture `result.json` plus screenshots
  - `sed -n '1,120p' plugins/openclaw-workspace-file-viewer/src/client/index.ts`
  - `git log --oneline --decorate -n 5`
  - `rg -n "remote\\.workspaceFileViewer|without inject|workspace-file-viewer" apps/web/dist plugins/openclaw-workspace-file-viewer/lib -S`
  - `sed -n '4536,4568p' plugins/openclaw-workspace-file-viewer/lib/client.js`
  - `sed -n '1,80p' plugins/openclaw-workspace-file-viewer/lib/types/client/index.js`
- Browser/UI evidence:
  - The DSH page loaded at the MagicDNS HTTPS URL with `document.title === "DeepSeek Harness"`.
  - `window.__DSH_BOOT__.entries` included `@openclaw/dsh-workspace-file-viewer`, proving the plugin row loaded into the browser composition.
  - The sidebar button with label `Open workspace file browser` rendered and opened the `Workspace files` overlay.
  - The overlay immediately rendered the original failure text: `Could not load: cannot get property "remote.workspaceFileViewer" without inject`.
  - Because the overlay failed before data load, `roots()` never completed, no directory listing rendered, and no file could be opened. Screenshots: `apps/web/.artifacts/workspace-viewer-qa-2026-08-17/01-overlay-open.png` and `apps/web/.artifacts/workspace-viewer-qa-2026-08-17/failure.png`.
- Console/network evidence and blocker judgment:
  - The page still emitted pre-existing `403` fetch errors for `api/credentials.describe`, `codex-subscription/preferences/status`, and `api/settings.describe`. These matched the earlier repro and did not change when the viewer button was clicked, so they remain out-of-scope noise rather than the deciding blocker for this bead.
  - The in-scope blocker is the same runtime failure in the required viewer path: the overlay cannot read `ctx.remote.workspaceFileViewer`, so the remote roots/list/read flow never starts.
- Root-cause evidence for the failed QA:
  - Source is patched: `plugins/openclaw-workspace-file-viewer/src/client/index.ts` now injects `['slots', 'locale', 'remote', 'remote.workspaceFileViewer']`.
  - Built browser artifacts are stale: both `plugins/openclaw-workspace-file-viewer/lib/client.js` and `plugins/openclaw-workspace-file-viewer/lib/types/client/index.js` still export `inject = ['slots', 'locale', 'remote']`.
  - The live DSH web surface serves the stale built browser artifact, so the actual HTTPS path still reproduces the original inject failure even after the source edit landed.
- Rerun pass after `oc-w1i`:
  - QA reran against `https://derrick-surface-pro-8.tail613fcb.ts.net/` and verified the full viewer path end to end.
  - Confirmed behavior:
    - file explorer root loaded
    - `projects` expanded
    - `projects/deepseek-harness` expanded
    - `projects/deepseek-harness/README.md` opened as readable markdown
    - readability probes `DeepSeek Harness`, `developer preview`, and `Run from source` were all visible
  - In-scope warnings/errors: none. The final evidence run recorded `eventCount: 0` across console, page errors, failed requests, and HTTP `>=400` responses during the validated viewer flow.
  - Evidence saved under `/tmp/oc-w2s-qa/`:
    - `01-root-loaded.png`
    - `02-directory-expanded.png`
    - `03-readme-open.png`
    - `evidence.json`
  - Out-of-scope noise remains:
    - a pre-existing `Gateway Handshake` dialog on load with endpoint `ws://127.0.0.1:18789/ws`
    - it did not block the viewer path and produced no in-scope errors for this bead
  - Bead truth:
    - `oc-w2s` is now closed with QA evidence and hands off to final audit Bead `oc-9f7`.

---

### Task 4: Rebuild Shipped Client Artifacts

**Bead ID:** `oc-w1i`
**SubAgent:** `primary`
**Role:** `coder`
**References:** `REF-04`, `REF-05`, `REF-07`
**Prompt:** Claim the assigned bead on start. Read `/home/derrick/.openclaw/workspace/projects/deepseek-harness/README.md` first, then regenerate only the shipped browser-facing artifacts needed for `@openclaw/dsh-workspace-file-viewer` so the live DSH surface serves the repaired inject contract. Run the narrow relevant build/test checks for the touched plugin/package, keep the worktree clean except for the intended artifact updates, then commit and push the current branch and hand back to QA.

**Folders Created/Deleted/Modified:**
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/plugins/openclaw-workspace-file-viewer/`

**Files Created/Deleted/Modified:**
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/plugins/openclaw-workspace-file-viewer/lib/client.js`
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/plugins/openclaw-workspace-file-viewer/lib/types/client/index.js`
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/.plans/2026-08-17-dsh-remote-workspace-viewer.md`

**Status:** ✅ Complete

**Results:** Regenerated the shipped browser-facing artifacts and committed them in `7c8aec091d0e893a33ef1bb7a20b202643facdac` (`fix(workspace-file-viewer): ship rebuilt browser artifacts`).

- Rebuilt files now verified to carry the repaired inject contract:
  - `plugins/openclaw-workspace-file-viewer/lib/client.js`
  - `plugins/openclaw-workspace-file-viewer/lib/types/client/index.js`
- Verified both generated outputs now include `remote.workspaceFileViewer` alongside `slots`, `locale`, and `remote`.
- Narrow relevant validation rerun locally by the orchestrator:
  - `pnpm exec vitest run plugins/openclaw-workspace-file-viewer/tests/browser-plugin.client.spec.ts`
  - Result: `1` file / `5` tests passed.
- Commit is present on both `derrick/master` and `derrick/dsh-chip-workspace-file-viewer`, and the repo worktree is clean except for this active plan file.
- Next action is to rerun the original remote/mobile-style QA bead `oc-w2s` against the live HTTPS DSH surface now that the served browser artifact should match the landed source fix.

---

### Task 5: Independent Audit And Closure

**Bead ID:** `oc-9f7`
**SubAgent:** `primary`
**Role:** `auditor`
**References:** `REF-01`, `REF-04`, `REF-05`, `REF-06`, `REF-07`
**Prompt:** Claim the assigned bead on start. Read `/home/derrick/.openclaw/workspace/projects/deepseek-harness/README.md` first. Independently verify the bead against the plan, diff, tests, and QA evidence. Confirm the final behavior matches the reported symptom and that the chosen fix is narrow, durable, and covered by appropriate validation. Close the bead only if the evidence supports completion; otherwise report the exact remaining gap.

**Folders Created/Deleted/Modified:**
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/`

**Files Created/Deleted/Modified:**
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/.plans/2026-08-17-dsh-remote-workspace-viewer.md`

**Status:** ✅ Complete

**Results:** Audit completed and Bead `oc-9f7` is now closed. The auditor verified the final evidence chain end to end:

- source fix `ee0f382f373b216fd5e22ef1f8ffef71c3bd0143` adds only `remote.workspaceFileViewer` to the browser-half inject list and expands focused coverage for the `roots`, `list`, and `read` adapters
- shipped artifact rebuild `7c8aec091d0e893a33ef1bb7a20b202643facdac` brings the served browser-facing outputs in `lib/` back into parity with the repaired source inject contract
- follow-up regression fix `5133130f4bed890b64cc6841eec3b43020640822` adds the missing `WorkspaceFileViewerInjected` type import in the client spec without changing runtime behavior
- QA bead `oc-w2s` already proved the live HTTPS DSH path can load roots, browse `projects/deepseek-harness`, and open `README.md` with no in-scope errors
- final focused audit reruns also passed:
  - `pnpm exec vitest run plugins/openclaw-workspace-file-viewer/tests/browser-plugin.client.spec.ts`
  - `pnpm exec tsc -p tsconfig.client.json --pretty false`

- Orchestrator re-verification after the follow-up fix:
  - `pnpm exec vitest run plugins/openclaw-workspace-file-viewer/tests/browser-plugin.client.spec.ts`
  - Result: passed (`1` file, `5` tests).
  - `pnpm exec tsc -p tsconfig.client.json --pretty false`
  - Result: passed with no output.
- Branch truth:
  - `HEAD` is `5133130f4bed890b64cc6841eec3b43020640822`
  - `derrick/dsh-chip-workspace-file-viewer` matches `HEAD`
- Next action:
  - None. Audit closed the work with reason: `Audited source fix ee0f382f37, shipped artifact rebuild 7c8aec091d, and follow-up type import fix 5133130f4b; current source and built files both inject remote.workspaceFileViewer, focused vitest and client tsc pass, and oc-w2s QA proved live HTTPS roots/list/read/README flow with no in-scope errors`.

---

## Final Results

**Status:** ✅ Complete

**What We Built:** Repaired the OpenClaw DSH workspace file viewer so the remote/mobile-accessible DSH surface can inject and use `remote.workspaceFileViewer` correctly, then rebuilt the shipped browser artifacts so the live app serves the same repaired contract.

**Reference Check:** `REF-04`, `REF-05`, `REF-06`, and `REF-07` were satisfied by the narrow plugin source fix, the rebuilt shipped client outputs, and the focused client test coverage. `REF-08` and `REF-09` remained contextual for reproducing the mobile-access path and separating the DSH-vs-Nerve route issue from the actual plugin defect.

**Commits:**
- `ee0f382f373b216fd5e22ef1f8ffef71c3bd0143` - `fix(workspace-file-viewer): inject remote namespace`
- `7c8aec091d0e893a33ef1bb7a20b202643facdac` - `fix(workspace-file-viewer): ship rebuilt browser artifacts`
- `5133130f4bed890b64cc6841eec3b43020640822` - `Fix workspace file viewer client spec type import`

**Lessons Learned:** The visible runtime fix was only half the story because DSH was still serving stale built browser artifacts. For this repo, any browser-half plugin fix that ships compiled `lib/` outputs needs both source validation and a served-artifact parity check before QA can pass.

*Completed on 2026-08-17*

**Status:** ❌ Failed

**Results:** Independent audit is underway on Bead `oc-9f7`, but its first pass exposed a new narrow follow-up seam instead of cleanly closing the work.

- Audit truth discovered since the previous plan update:
  - QA evidence for the live HTTPS/mobile-style DSH route passed and remains valid.
  - The narrow source fix and shipped artifact rebuild are both landed and pushed.
  - A full-repo build follow-up bug was discovered during audit: `plugins/openclaw-workspace-file-viewer/tests/browser-plugin.client.spec.ts` now references a missing `WorkspaceFileViewerInjected` type.
  - Repo-local Bead `oc-o7w` was created as a `discovered-from` child of `oc-9f7` to repair that build break before audit closure.
- Current audit gate:
  - `oc-9f7` cannot close yet because the plan requires a durable fix, and the new type regression means the change is not yet clean against the broader repo build surface.

---

### Task 6: Repair The Audit-Discovered Build Regression

**Bead ID:** `oc-o7w`
**SubAgent:** `primary`
**Role:** `coder`
**References:** `REF-05`, `REF-07`
**Prompt:** Claim the assigned bead on start. Read `/home/derrick/.openclaw/workspace/projects/deepseek-harness/README.md` first, then repair the audit-discovered full-build regression in `plugins/openclaw-workspace-file-viewer/tests/browser-plugin.client.spec.ts` caused by the missing `WorkspaceFileViewerInjected` type reference. Keep the fix minimal, rerun the narrow failing build/test surface that proves the regression is gone, commit, and push the current branch for renewed audit.

**Folders Created/Deleted/Modified:**
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/plugins/openclaw-workspace-file-viewer/`

**Files Created/Deleted/Modified:**
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/plugins/openclaw-workspace-file-viewer/tests/browser-plugin.client.spec.ts`
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/.plans/2026-08-17-dsh-remote-workspace-viewer.md`

**Status:** ⏳ Pending

**Results:** Bead `oc-o7w` is the newly exposed narrow housekeeping seam from audit. Once it lands, Bead `oc-9f7` should rerun independent audit against the repaired build surface and the already-passing HTTPS viewer evidence.

---

## Final Results

**Status:** ⚠️ Partial

**What We Built:** Active execution plan plus the repo-local Bead chain for reproduction, implementation, rebuild, QA, audit, and the new audit-discovered cleanup seam. Both the source-level inject repair and the shipped browser-artifact rebuild are landed and pushed, and the live HTTPS DSH surface now passes the full workspace-viewer QA path. Final closure is waiting on the narrow build-regression repair and renewed audit.

**Reference Check:** `REF-01` through `REF-09` were gathered to scope the issue. `REF-05`, `REF-08`, and `REF-09` explain the reproduced symptom: the phone-reachable surface changed with the launcher wrapper, while the actual viewer failure came from the browser-half `remote.workspaceFileViewer` inject omission and then from stale shipped browser artifacts.

**Commits:**
- `ee0f382f37` — `fix(workspace-file-viewer): inject remote namespace`
- `7c8aec091d` — `fix(workspace-file-viewer): ship rebuilt browser artifacts`

**Lessons Learned:** The original symptom was easy to misattribute to Nerve because both systems expose remote workspace/file surfaces. The decisive discriminator is that the report happened specifically while `dsh` was reachable and mentioned the DSH plugin. The follow-on QA result proved the repair had two layers: source correction and the shipped browser bundle actually served by the live web surface. The audit phase also confirmed that narrow viewer fixes can still leave broader build hygiene regressions, so the plan needs one more tight cleanup pass before true closure.

---

*Completed on 2026-08-17*
