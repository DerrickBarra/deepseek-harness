# Workspace Viewer File Actions And Editor

**Date:** 2026-08-17
**Status:** In Progress
**Last Updated:** 2026-08-17 21:05 EDT
**Blocked Reason:** None; remediation bead `oc-rmv` is complete and the feature is ready to return to QA bead `oc-qff`.
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

**Status:** ✅ Complete

**Results:** A coder subagent returned a completion handoff, but parent review found the reported commit and reported bead IDs were not visible in this checkout. The actual implementation changes are present as uncommitted tracked changes. Parent validation reran:

- `pnpm exec tsc -b plugins/openclaw-workspace-file-viewer/tsconfig.json plugins/openclaw-workspace-file-viewer/tsconfig.client.json`
- `pnpm exec vitest run plugins/openclaw-workspace-file-viewer/tests/workspace-file-viewer.spec.ts plugins/openclaw-workspace-file-viewer/tests/panel.client.spec.tsx`
- `pnpm exec oxlint plugins/openclaw-workspace-file-viewer/src plugins/openclaw-workspace-file-viewer/tests`

Functional result: typecheck passed, Vitest reported `2` files and `8` tests passed, and oxlint passed. The Vitest run emitted the existing `vite-tsconfig-paths` deprecation notice, so QA/audit should decide whether that warning is acceptable local tool noise or needs a follow-up cleanup.

Parent validation also reran:

- `pnpm run build:lib:host`
- `pnpm --filter @openclaw/dsh-workspace-file-viewer run bundle`

Functional result: both builds completed successfully and refreshed the shipped plugin bundle. The build logs include existing tsdown dependency/deprecation/timing notices and an unsupported optional `linux-arm64` package warning on this `linux-x64` host; these are recorded as validation noise for QA/audit rather than silently omitted.

Parent checkpoint:

- Commit: `107d80b73c` — `feat(workspace-file-viewer): add file actions and editor`
- Push: `git push derrick HEAD:dsh-chip-workspace-file-viewer` succeeded.
- Bead `oc-ng2` was closed with the implementation result.

---

### Task 2: QA Served DSH Viewer

**Bead ID:** `oc-qff`
**SubAgent:** `primary`
**Role:** `qa`
**References:** `REF-02`, `REF-03`, `REF-04`, `REF-05`, `REF-06`
**Prompt:** Claim the assigned bead on start. Read `/home/derrick/.openclaw/workspace/projects/deepseek-harness/README.md` first. After the implementation is committed and the live DSH app is refreshed, verify the served DSH surface on the phone-test URL. Confirm the workspace viewer loads, Add to chat inserts a selected file/folder path into the active chat draft, the explorer collapses/expands, view/edit controls appear for text files, HTML files can be previewed and edited as text, Save writes to the host file, and Cancel restores the original content without writing. Report exact browser evidence and fail on in-scope errors.

**Folders Created/Deleted/Modified:**
- `/tmp/dsh-workspace-viewer-qa/`

**Files Created/Deleted/Modified:**
- `/tmp/dsh-workspace-viewer-qa/01-panel-open-openclaw-root.png`
- `/tmp/dsh-workspace-viewer-qa/02-repo-directory.png`
- `/tmp/dsh-workspace-viewer-qa/03-add-to-chat-failure.png`
- `/tmp/dsh-workspace-viewer-qa/04-collapsed-selected-file.png`
- `/tmp/dsh-workspace-viewer-qa/05-expanded-selected-file.png`
- `/tmp/dsh-workspace-viewer-qa/06-markdown-saved.png`
- `/tmp/dsh-workspace-viewer-qa/07-cancel-restored-view.png`
- `/tmp/dsh-workspace-viewer-qa/08-html-preview.png`
- `/tmp/dsh-workspace-viewer-qa/09-html-edit-cancel.png`
- `/tmp/dsh-workspace-viewer-qa/events.json`
- `/tmp/dsh-workspace-viewer-qa/results.json`

**Status:** ❌ Failed

**Results:** QA used Playwright against `https://derrick-surface-pro-8.tail613fcb.ts.net:8443/`; the primary URL returned HTTP 200, so the local fallback `http://127.0.0.1:3081/` was not needed.

Exact commands run:

```sh
curl -k -I --max-time 10 https://derrick-surface-pro-8.tail613fcb.ts.net:8443/
curl -I --max-time 5 http://127.0.0.1:3081/
node - <<'NODE'
# Playwright script loaded /home/derrick/.npm-global/lib/node_modules/playwright, opened the served app, selected
# OpenClaw workspace, navigated to projects/deepseek-harness, exercised Add to chat, collapse/expand, Markdown
# edit/save/cancel, and HTML preview/edit/cancel, then wrote screenshots and JSON results to /tmp/dsh-workspace-viewer-qa/.
NODE
```

Temporary files used under the allowlisted OpenClaw workspace root:

- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/qa-workspace-viewer-test.md`
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/qa-workspace-viewer-test.html`

Both temporary files were deleted after QA.

Passing checks:

- Workspace viewer plugin loaded on the served app with the `Workspace files` panel visible and no boot/runtime crash.
- Explorer root switching to `OpenClaw workspace` and navigation to `projects/deepseek-harness` worked.
- Explorer collapse and expand preserved the selected Markdown file preview.
- Markdown view/edit mode worked; Save wrote the edited content to the host file under the allowlisted workspace root.
- Cancel from Markdown edit mode exited without writing the changed draft.
- HTML view mode rendered the file in an iframe preview, edit mode exposed the HTML source text, and Cancel did not write the changed HTML draft.
- In-scope console/network/runtime logs had no viewer-path errors. Observed only the documented served-app auth/gateway noise: HTTP 403 for `/api/credentials.describe` and `/api/settings.describe`, with matching browser `Failed to load resource` console errors.

Blocking failure:

- Add to chat failed for both file and folder rows. Right-clicking `qa-workspace-viewer-test.md` and `plugins`, then choosing `Add to chat`, left the visible chat draft empty (`draft=""`). The panel showed `Could not load: No active chat session is available`. Expected inserted paths were `/home/derrick/.openclaw/workspace/projects/deepseek-harness/qa-workspace-viewer-test.md` and `/home/derrick/.openclaw/workspace/projects/deepseek-harness/plugins`.

Bead `oc-qff` remains `in_progress`; audit bead `oc-0p2` is untouched. Follow-up remediation bead `oc-rmv` was created from this QA failure.

---

### Task 3: Fix Add To Chat Without Active Session

**Bead ID:** `oc-rmv`
**SubAgent:** `primary`
**Role:** `coder`
**References:** `REF-02`, `REF-03`, `REF-06`
**Prompt:** Claim the assigned bead on start. Read `/home/derrick/.openclaw/workspace/projects/deepseek-harness/README.md` first. Fix the workspace viewer `Add to chat` behavior so the served DSH app inserts the selected absolute file/folder path into the visible chat draft even when no active session exists yet. Keep the patch narrow, update focused client tests, rebuild shipped client artifacts if needed, run relevant validation, commit, push, and hand back to QA bead `oc-qff`.

**Folders Created/Deleted/Modified:**
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/plugins/openclaw-workspace-file-viewer/`
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/.agents/notes/implemented/bug-fix/`

**Files Created/Deleted/Modified:**
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/plugins/openclaw-workspace-file-viewer/src/client/WorkspaceFileViewerPanel.tsx`
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/plugins/openclaw-workspace-file-viewer/src/client/index.ts`
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/plugins/openclaw-workspace-file-viewer/tests/browser-plugin.client.spec.ts`
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/plugins/openclaw-workspace-file-viewer/lib/client.js`
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/plugins/openclaw-workspace-file-viewer/lib/types/client/index.js`
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/.agents/notes/implemented/bug-fix/2026-08-17-workspace-viewer-add-to-chat-session.md`
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/.agents/notes/implemented/bug-fix/2026-08-17-workspace-viewer-add-to-chat-session.zh.md`
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/.agents/notes/implemented/bug-fix/2026-08-17-workspace-viewer-add-to-chat-session.i18n.yaml`

**Status:** ✅ Complete

**Results:** Remediation changes are implemented, validated, committed, and pushed.

Functional result: `Add to chat` now resolves a target session before mutating the draft. With an active session, it writes to that session's existing input facade. With no active session, it selects the workspace whose path most specifically contains the chosen absolute file/folder path, connects that workspace to a reusable or new blank session, opens it, then inserts the selected absolute path into that session draft. The overlay now accepts asynchronous `addToChat` failures and reports them through its existing error strip instead of dropping rejected promises.

Focused client coverage now includes active-session path insertion and no-current-session creation/open-before-insert behavior in `plugins/openclaw-workspace-file-viewer/tests/browser-plugin.client.spec.ts`.

Validation commands run:

```sh
pnpm exec tsc -b plugins/openclaw-workspace-file-viewer/tsconfig.json plugins/openclaw-workspace-file-viewer/tsconfig.client.json
pnpm exec vitest run plugins/openclaw-workspace-file-viewer/tests/browser-plugin.client.spec.ts plugins/openclaw-workspace-file-viewer/tests/panel.client.spec.tsx
pnpm exec oxlint plugins/openclaw-workspace-file-viewer/src/client/index.ts plugins/openclaw-workspace-file-viewer/src/client/WorkspaceFileViewerPanel.tsx plugins/openclaw-workspace-file-viewer/tests/browser-plugin.client.spec.ts plugins/openclaw-workspace-file-viewer/tests/panel.client.spec.tsx
pnpm --filter @openclaw/dsh-workspace-file-viewer run bundle
pnpm exec vitest run plugins/openclaw-workspace-file-viewer/tests/workspace-file-viewer.spec.ts plugins/openclaw-workspace-file-viewer/tests/browser-plugin.client.spec.ts plugins/openclaw-workspace-file-viewer/tests/panel.client.spec.tsx plugins/openclaw-workspace-file-viewer/tests/invariant.spec.ts
git diff --check
pnpm run verify-agent-note-format
git fetch derrick dsh-chip-workspace-file-viewer
git push --force-with-lease=dsh-chip-workspace-file-viewer:ea47f8c6597fbe18dd9d5ef39e03704ff3bba767 derrick HEAD:dsh-chip-workspace-file-viewer
/home/derrick/.openclaw/workspace/projects/dsh-orchestration-agent/scripts/update.sh
systemctl --user restart dsh-chip.service
systemctl --user --no-pager --full status dsh-chip.service
curl -k -I --max-time 10 https://derrick-surface-pro-8.tail613fcb.ts.net:8443/
```

Results: typecheck passed; the focused browser/panel Vitest run passed `2` files and `10` tests; oxlint passed; bundle rebuild passed and refreshed the shipped client artifacts; the post-bundle plugin Vitest run passed `4` files and `16` tests; `git diff --check` passed after removing generated trailing whitespace in `lib/client.js`; Agent Note format passed for `543` notes. The amended force-with-lease push succeeded with local and remote both at `98035a8385d963d12dc5cb4799dd15e342792c52`. `update.sh` completed with all post-run verification rows passing. `dsh-chip.service` restarted and reported `active (running)`. The immediate curl during startup returned HTTP `502`; the retry after the service logged `dsh web: http://127.0.0.1:3081` returned HTTP `200`. Vitest still emitted the existing `vite-tsconfig-paths` deprecation notice, and the bundle still emitted the existing unsupported optional `linux-arm64` package warning plus tsdown dependency option notices.

Commit: `98035a8385` — `fix(workspace-file-viewer): create chat session before adding paths`

---

### Task 4: Independent Audit And Closure

**Bead ID:** `oc-0p2`
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

**Status:** ✅ Remediation Complete; QA Retry Pending

**What We Built:** Implementation is present, committed, and mostly works on the served DSH surface. The QA-discovered Add to chat failure has been remediated in the workspace viewer client and is ready for QA retry.

**Reference Check:** QA failed on Add to chat; audit is pending.

**Commits:**
- `107d80b73c` — `feat(workspace-file-viewer): add file actions and editor`
- `855f4d9f9d` — `docs(plan): checkpoint workspace viewer editor QA`
- `e30c5ee8d2` — `docs(plan): record workspace viewer editor QA failure`
- `5bfa496c03` — `docs(plan): add workspace viewer add-to-chat remediation`
- `98035a8385` — `fix(workspace-file-viewer): create chat session before adding paths`

**Lessons Learned:** Parent review must verify subagent commit/bead claims directly; the returned handoff was not consistent with the checkout state.

---

*In progress on 2026-08-17*
