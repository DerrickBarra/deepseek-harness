# DeepSeek Harness Remote Workspace Viewer

**Date:** 2026-08-17
**Status:** In Progress
**Last Updated:** 2026-08-17 06:23 EDT
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
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/`

**Files Created/Deleted/Modified:**
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/.plans/2026-08-17-dsh-remote-workspace-viewer.md`

**Status:** ⏳ Pending

**Results:** Repo-local Bead `oc-w2s` is the live QA follow-on and remains blocked on `oc-78l`.

---

### Task 4: Independent Audit And Closure

**Bead ID:** `oc-9f7`
**SubAgent:** `primary`
**Role:** `auditor`
**References:** `REF-01`, `REF-04`, `REF-05`, `REF-06`, `REF-07`
**Prompt:** Claim the assigned bead on start. Read `/home/derrick/.openclaw/workspace/projects/deepseek-harness/README.md` first. Independently verify the bead against the plan, diff, tests, and QA evidence. Confirm the final behavior matches the reported symptom and that the chosen fix is narrow, durable, and covered by appropriate validation. Close the bead only if the evidence supports completion; otherwise report the exact remaining gap.

**Folders Created/Deleted/Modified:**
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/`

**Files Created/Deleted/Modified:**
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/.plans/2026-08-17-dsh-remote-workspace-viewer.md`

**Status:** ⏳ Pending

**Results:** Repo-local Bead `oc-9f7` is the live audit follow-on and remains blocked on `oc-w2s`.

---

## Final Results

**Status:** ⚠️ Partial

**What We Built:** Active execution plan plus the repo-local Bead chain for reproduction, implementation, QA, and audit.

**Reference Check:** `REF-01` through `REF-09` were gathered to scope the issue. `REF-05`, `REF-08`, and `REF-09` now explain the reproduced symptom: the phone-reachable surface changed with the launcher wrapper, but the actual viewer failure is the browser-half `remote.workspaceFileViewer` inject omission in `REF-05`.

**Commits:**
- `ee0f382f3758d9d70b921607633f060c53efc3cf` — `fix(workspace-file-viewer): inject remote namespace`

**Lessons Learned:** The original symptom was easy to misattribute to Nerve because both systems expose remote workspace/file surfaces. The decisive discriminator is that the report happened specifically while `dsh` was reachable and mentioned the DSH plugin.

---

*Completed on 2026-08-17*
