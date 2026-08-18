# Workspace Viewer File Actions And Editor

**Date:** 2026-08-17
**Status:** In Progress
**Last Updated:** 2026-08-17 20:30 EDT
**Blocked Reason:** None
**Agent:** `chip`

---

## Goal

Add direct file/folder chat insertion, collapsible browsing, text editing, preview/edit toggles, and host-side save support to the OpenClaw DSH workspace file viewer.

---

## Overview

Derrick confirmed the DSH remote spike is successful: DSH loads remotely, Nerve remains served separately, and the workspace viewer plugin is attached and running. The next approved seam is to make that viewer useful as a working file surface rather than only a read-only browser.

The feature belongs in `plugins/openclaw-workspace-file-viewer` inside `deepseek-harness`, with the live DSH deployment refreshed through the existing DSH update path after implementation. The work must preserve the existing root allowlist and path safety rules while adding host writes for supported text files only.

---

## REFERENCES

| ID | Description | Path |
| --- | --- | --- |
| `REF-01` | DeepSeek Harness repo instructions | `/home/derrick/.openclaw/workspace/projects/deepseek-harness/README.md` |
| `REF-02` | Workspace viewer client panel | `/home/derrick/.openclaw/workspace/projects/deepseek-harness/plugins/openclaw-workspace-file-viewer/src/client/WorkspaceFileViewerPanel.tsx` |
| `REF-03` | Workspace viewer client plugin wiring | `/home/derrick/.openclaw/workspace/projects/deepseek-harness/plugins/openclaw-workspace-file-viewer/src/client/index.ts` |
| `REF-04` | Workspace viewer host Remote service | `/home/derrick/.openclaw/workspace/projects/deepseek-harness/plugins/openclaw-workspace-file-viewer/src/index.ts` |
| `REF-05` | Workspace viewer host tests | `/home/derrick/.openclaw/workspace/projects/deepseek-harness/plugins/openclaw-workspace-file-viewer/tests/workspace-file-viewer.spec.ts` |
| `REF-06` | Workspace viewer panel tests | `/home/derrick/.openclaw/workspace/projects/deepseek-harness/plugins/openclaw-workspace-file-viewer/tests/panel.client.spec.tsx` |

---

## Tasks

### Task 1: Implement File Actions And Editing

**Bead ID:** `oc-ng2`
**SubAgent:** `primary`
**Role:** `coder`
**References:** `REF-01`, `REF-02`, `REF-03`, `REF-04`, `REF-05`, `REF-06`
**Prompt:** Claim the assigned bead on start. Read `/home/derrick/.openclaw/workspace/projects/deepseek-harness/README.md` first. Implement right-click/tap-and-hold Add to chat for file and folder rows, a collapsible explorer column, view/edit mode controls for text files, Save/Cancel editing, HTML preview mode, and a host-side save RPC that writes only supported text files under allowlisted roots. Update focused tests, rebuild shipped plugin artifacts, run relevant validation, commit, and push.

**Folders Created/Deleted/Modified:**
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/plugins/openclaw-workspace-file-viewer/`

**Files Created/Deleted/Modified:**
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/plugins/openclaw-workspace-file-viewer/src/index.ts`
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/plugins/openclaw-workspace-file-viewer/src/types.ts`
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/plugins/openclaw-workspace-file-viewer/src/client/index.ts`
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/plugins/openclaw-workspace-file-viewer/src/client/WorkspaceFileViewerPanel.tsx`
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/plugins/openclaw-workspace-file-viewer/src/client/WorkspaceFileViewerPanel.module.css`
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/plugins/openclaw-workspace-file-viewer/src/client/locales.ts`
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/plugins/openclaw-workspace-file-viewer/tests/workspace-file-viewer.spec.ts`
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/plugins/openclaw-workspace-file-viewer/tests/panel.client.spec.tsx`
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/plugins/openclaw-workspace-file-viewer/lib/client.js`
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/plugins/openclaw-workspace-file-viewer/lib/types/client/index.js`
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/plugins/openclaw-workspace-file-viewer/package.json`
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/plugins/openclaw-workspace-file-viewer/tsconfig.client.json`
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/pnpm-lock.yaml`

**Status:** ⏳ In Progress

**Results:** A coder subagent returned a completion handoff, but parent review found the reported commit and reported bead IDs were not visible in this checkout. The actual implementation changes are present as uncommitted tracked changes. Parent validation reran:

- `pnpm exec tsc -b plugins/openclaw-workspace-file-viewer/tsconfig.json plugins/openclaw-workspace-file-viewer/tsconfig.client.json`
- `pnpm exec vitest run plugins/openclaw-workspace-file-viewer/tests/workspace-file-viewer.spec.ts plugins/openclaw-workspace-file-viewer/tests/panel.client.spec.tsx`
- `pnpm exec oxlint plugins/openclaw-workspace-file-viewer/src plugins/openclaw-workspace-file-viewer/tests`

Functional result: typecheck passed, Vitest reported `2` files and `8` tests passed, and oxlint passed. The Vitest run emitted the existing `vite-tsconfig-paths` deprecation notice, so QA/audit should decide whether that warning is acceptable local tool noise or needs a follow-up cleanup.

Parent validation also reran:

- `pnpm run build:lib:host`
- `pnpm --filter @openclaw/dsh-workspace-file-viewer run bundle`

Functional result: both builds completed successfully and refreshed the shipped plugin bundle. The build logs include existing tsdown dependency/deprecation/timing notices and an unsupported optional `linux-arm64` package warning on this `linux-x64` host; these are recorded as validation noise for QA/audit rather than silently omitted.

---

### Task 2: QA Served DSH Viewer

**Bead ID:** `Pending`
**SubAgent:** `primary`
**Role:** `qa`
**References:** `REF-02`, `REF-03`, `REF-04`, `REF-05`, `REF-06`
**Prompt:** Claim the assigned bead on start. Read `/home/derrick/.openclaw/workspace/projects/deepseek-harness/README.md` first. After the implementation is committed and the live DSH app is refreshed, verify the served DSH surface on the phone-test URL. Confirm the workspace viewer loads, Add to chat inserts a selected file/folder path into the active chat draft, the explorer collapses/expands, view/edit controls appear for text files, HTML files can be previewed and edited as text, Save writes to the host file, and Cancel restores the original content without writing. Report exact browser evidence and fail on in-scope errors.

**Folders Created/Deleted/Modified:**
- `Pending`

**Files Created/Deleted/Modified:**
- `Pending`

**Status:** ⏳ Pending

**Results:** Pending.

---

### Task 3: Independent Audit And Closure

**Bead ID:** `Pending`
**SubAgent:** `primary`
**Role:** `auditor`
**References:** `REF-01`, `REF-02`, `REF-03`, `REF-04`, `REF-05`, `REF-06`
**Prompt:** Claim the assigned bead on start. Read `/home/derrick/.openclaw/workspace/projects/deepseek-harness/README.md` first. Independently check the feature against the plan, bead state, diff, tests, QA evidence, shipped artifacts, and live DSH behavior. Confirm the host-side save path preserves root allowlisting and write safety. Close the final bead only if the feature is actually ready for Derrick to test.

**Folders Created/Deleted/Modified:**
- `Pending`

**Files Created/Deleted/Modified:**
- `Pending`

**Status:** ⏳ Pending

**Results:** Pending.

---

## Final Results

**Status:** ⚠️ Partial

**What We Built:** Implementation is present and locally validated, but not yet committed in this checkout and not yet QA/audited on the served DSH surface.

**Reference Check:** Pending QA and audit.

**Commits:**
- Pending.

**Lessons Learned:** Parent review must verify subagent commit/bead claims directly; the returned handoff was not consistent with the checkout state.

---

*In progress on 2026-08-17*
