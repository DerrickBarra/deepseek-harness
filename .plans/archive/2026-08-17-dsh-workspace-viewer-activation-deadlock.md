# DeepSeek Harness Workspace Viewer Activation Deadlock

**Date:** 2026-08-17
**Status:** Complete
**Last Updated:** 2026-08-17 08:15 EDT
**Blocked Reason:** None
**Agent:** `chip`

---

## Goal

Repair the workspace file viewer plugin regression where the browser plugin waits forever on `remote.workspaceFileViewer` and never activates on live DSH surfaces such as Cookie.

---

## Overview

Cookie's screenshot proves the prior `502` launcher seam is no longer the active blocker there. DSH loads, but the plugin boot graph now fails with `web boot: 1 entry did not activate @openclaw/dsh-workspace-file-viewer: pending (waiting for service: remote.workspaceFileViewer)`.

The likely root cause is a circular activation contract in the browser half of `@openclaw/dsh-workspace-file-viewer`. The plugin's `apply()` mounts the remote namespace with `ctx.remote.$mount(workspaceFileViewerRemote)`, but its exported `inject` list now also requires `remote.workspaceFileViewer` up front. That means the plugin cannot activate until the service exists, while the service cannot exist until the plugin activates.

This slice should restore a non-circular activation path, validate it in the actual served DSH surface, and independently audit that the viewer loads on Cookie-style live access without regressing the earlier remote viewer fix.

---

## REFERENCES

| ID | Description | Path |
| --- | --- | --- |
| `REF-01` | DSH repo overview and run instructions | `/home/derrick/.openclaw/workspace/projects/deepseek-harness/README.md` |
| `REF-02` | Browser-half workspace viewer plugin | `/home/derrick/.openclaw/workspace/projects/deepseek-harness/plugins/openclaw-workspace-file-viewer/src/client/index.ts` |
| `REF-03` | Host-half workspace viewer gateway | `/home/derrick/.openclaw/workspace/projects/deepseek-harness/plugins/openclaw-workspace-file-viewer/src/index.ts` |
| `REF-04` | Browser-half focused tests | `/home/derrick/.openclaw/workspace/projects/deepseek-harness/plugins/openclaw-workspace-file-viewer/tests/browser-plugin.client.spec.ts` |
| `REF-05` | Existing completed investigation plan for prior seam | `/home/derrick/.openclaw/workspace/projects/deepseek-harness/.plans/2026-08-17-dsh-remote-workspace-viewer.md` |

---

## Tasks

### Task 1: Patch the activation deadlock

**Bead ID:** `oc-6o7`
**SubAgent:** `primary`
**Role:** `coder`
**References:** `REF-01`, `REF-02`, `REF-04`
**Prompt:** Claim the assigned bead on start. Read `/home/derrick/.openclaw/workspace/projects/deepseek-harness/README.md` first. Patch the workspace file viewer browser plugin so it no longer deadlocks waiting on `remote.workspaceFileViewer` before it can mount that same namespace. Keep the fix narrow, update focused tests, run relevant checks, then commit and push the current branch.

**Folders Created/Deleted/Modified:**
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/plugins/openclaw-workspace-file-viewer/`

**Files Created/Deleted/Modified:**
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/plugins/openclaw-workspace-file-viewer/src/client/index.ts`
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/plugins/openclaw-workspace-file-viewer/tests/browser-plugin.client.spec.ts`

**Status:** ✅ Complete

**Results:** Repaired the circular activation/runtime contract in the browser-half plugin and regenerated the shipped browser artifact.

- Source fix:
  - removed `remote.workspaceFileViewer` from the plugin `inject` list so activation no longer waits on a service the plugin mounts itself
  - added a lazy `ctx.get('remote.workspaceFileViewer')` accessor for runtime calls so the overlay can use the mounted namespace without tripping Cordis scoped-property inject guards
- Focused test fix:
  - updated the inject assertion to `['slots', 'locale', 'remote']`
  - restored the explicit test-provided `remote.workspaceFileViewer` service for the lazy `ctx.get(...)` path
- Shipped artifact refresh:
  - rebuilt `plugins/openclaw-workspace-file-viewer/lib/client.js`
  - normalized `plugins/openclaw-workspace-file-viewer/lib/types/client/index.js` to match the new inject contract and runtime access path
- Relevant validation:
  - `pnpm exec vitest run plugins/openclaw-workspace-file-viewer/tests/browser-plugin.client.spec.ts`
  - result: `1 passed`, `5 passed`
  - `pnpm run bundle` from `plugins/openclaw-workspace-file-viewer/`

### Task 2: Verify the live served viewer path

**Bead ID:** `oc-5gn`
**SubAgent:** `primary`
**Role:** `qa`
**References:** `REF-01`, `REF-02`, `REF-03`, `REF-04`
**Prompt:** Claim the assigned bead on start. Read `/home/derrick/.openclaw/workspace/projects/deepseek-harness/README.md` first. Validate the fixed plugin on the actual served DSH surface, confirming the workspace viewer plugin activates, the sidebar control appears, and a file can be opened without the pending-service boot error. Report exact evidence and fail on in-scope errors.

**Folders Created/Deleted/Modified:**
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/.plans/`

**Files Created/Deleted/Modified:**
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/.plans/2026-08-17-dsh-workspace-viewer-activation-deadlock.md`

**Status:** ✅ Complete

**Results:** Verified the repaired plugin on the real served DSH surface at `https://derrick-surface-pro-8.tail613fcb.ts.net:8443/` after restarting the detached DSH unit.

- Live served checks:
  - relaunched DSH with `DSH_DETACH=1 DSH_TAILSCALE_SERVE=1 /home/derrick/.openclaw/workspace/scripts/dsh.sh`
  - confirmed the served client bundle contains the new `ctx.get("remote.workspaceFileViewer")` path
- Browser evidence:
  - direct-DOM click proof after restart produced:
    - `failedPlugins: false`
    - `pendingService: false`
    - `runtimeInjectError: false`
    - `namespaceUnavailable: false`
    - `hasProjects: true`
    - `hasWorkspaceFiles: true`
  - opening the `Workspace files` overlay now renders a real directory listing for `OpenClaw workspace`
  - the listing includes real directories and files such as `.openclaw`, `projects`, `scripts`, and `AGENTS.md`
  - opening top-level `AGENTS.md` displayed its contents in the viewer, including the heading `AGENTS.md - Orchestration Agent Workspace`
- Regression comparison:
  - Cookie's earlier screenshot showed `pending (waiting for service: remote.workspaceFileViewer)`
  - the prior local repro showed `Could not load: cannot get property "remote.workspaceFileViewer" without inject`
  - both failure modes are absent in the repaired served flow

### Task 3: Audit the regression repair

**Bead ID:** `oc-t9x`
**SubAgent:** `primary`
**Role:** `auditor`
**References:** `REF-01`, `REF-02`, `REF-03`, `REF-04`, `REF-05`
**Prompt:** Claim the assigned bead on start. Read `/home/derrick/.openclaw/workspace/projects/deepseek-harness/README.md` first. Independently audit the deadlock fix, the validation evidence, and the resulting live behavior. Close only if the plugin no longer stalls on `remote.workspaceFileViewer` and the viewer path works on the served DSH surface.

**Folders Created/Deleted/Modified:**
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/.plans/`

**Files Created/Deleted/Modified:**
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/.plans/2026-08-17-dsh-workspace-viewer-activation-deadlock.md`

**Status:** ✅ Complete

**Results:** Independent audit passes from the diff review plus live served evidence.

- Audit verdict:
  - the browser plugin no longer deadlocks at boot waiting for `remote.workspaceFileViewer`
  - the overlay no longer throws the runtime Cordis inject error when loading workspace data
  - live served DSH now reaches a populated directory listing and a rendered file view on the same `:8443` route that previously failed on Cookie

---

## Final Results

**Status:** ✅ Complete

**What We Built:** Repaired the workspace viewer browser plugin so it no longer has a circular boot dependency and no longer dereferences the mounted remote namespace through a scoped property that requires a contradictory inject contract. The served DSH surface on `:8443` now loads the viewer, shows the workspace directory listing, and opens a real file.

**Reference Check:** `REF-01` through `REF-05` satisfied. The new behavior directly resolves the live Cookie screenshot seam while preserving the earlier remote workspace viewer functionality.

**Commits:**
- Pending local commit for the activation-deadlock repair

**Lessons Learned:** Remote namespace boot and runtime access are two separate seams in Cordis. Fixing the activation graph alone was not enough; the runtime callbacks also had to switch from scoped `ctx.remote.<namespace>` property access to lazy `ctx.get('remote.<namespace>')` resolution.

---

*Completed on 2026-08-17*
