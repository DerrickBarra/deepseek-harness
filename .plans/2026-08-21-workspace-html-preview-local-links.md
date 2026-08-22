# Workspace HTML Preview Local Links

**Date:** 2026-08-21
**Status:** In Progress
**Last Updated:** 2026-08-21 21:06 EDT
**Blocked Reason:** None
**Agent:** `chip`

---

## Goal

Make same-folder/local links inside the workspace file viewer HTML preview navigate correctly when feasible.

---

## Overview

Derrick confirmed the HTML preview sizing fix works on desktop and mobile. The remaining issue is that links inside the HTML preview do not navigate to sibling/local HTML files from the same folder.

The likely seam is the preview iframe behavior: if it uses `srcdoc`, relative links may not resolve against the selected file's real path. The implementation should preserve the workspace allowlist/path safety model, support local relative HTML navigation where possible, keep external links safe, update shipped plugin artifacts, and leave the plugin ready for Derrick to retest.

---

## REFERENCES

| ID | Description | Path |
| --- | --- | --- |
| `REF-01` | DeepSeek Harness repo instructions | `/home/derrick/.openclaw/workspace/projects/deepseek-harness/README.md` |
| `REF-02` | Workspace viewer panel | `/home/derrick/.openclaw/workspace/projects/deepseek-harness/plugins/openclaw-workspace-file-viewer/src/client/WorkspaceFileViewerPanel.tsx` |
| `REF-03` | Workspace viewer styles | `/home/derrick/.openclaw/workspace/projects/deepseek-harness/plugins/openclaw-workspace-file-viewer/src/client/WorkspaceFileViewerPanel.module.css` |
| `REF-04` | Workspace viewer host service | `/home/derrick/.openclaw/workspace/projects/deepseek-harness/plugins/openclaw-workspace-file-viewer/src/index.ts` |
| `REF-05` | Workspace viewer tests | `/home/derrick/.openclaw/workspace/projects/deepseek-harness/plugins/openclaw-workspace-file-viewer/tests/` |

---

## Tasks

### Task 1: Fix HTML Preview Local Navigation

**Bead ID:** `oc-kpv`
**SubAgent:** `primary`
**Role:** `coder`
**References:** `REF-01`, `REF-02`, `REF-03`, `REF-04`, `REF-05`
**Prompt:** Claim bead `oc-kpv` on start with `bd update oc-kpv --status in_progress --json`. Read `/home/derrick/.openclaw/workspace/projects/deepseek-harness/README.md` first. Investigate why local links inside the workspace file viewer HTML preview do not navigate to sibling/local HTML files. If feasible, implement the fix in `plugins/openclaw-workspace-file-viewer` without reverting existing worktree changes. Preserve path allowlist safety, support same-folder relative HTML links, update source and shipped plugin artifacts, add or update focused tests, run relevant validation, commit and push the current branch, then close `oc-kpv` with a clear reason. Report files changed, validation, commit hash, and any limits.

**Folders Created/Deleted/Modified:**
- `/home/derrick/.openclaw/workspace/projects/deepseek-harness/plugins/openclaw-workspace-file-viewer/`

**Files Created/Deleted/Modified:**
- `plugins/openclaw-workspace-file-viewer/src/client/WorkspaceFileViewerPanel.tsx`
- `plugins/openclaw-workspace-file-viewer/tests/panel.client.spec.tsx`
- `plugins/openclaw-workspace-file-viewer/lib/client.js`
- Existing branch work in the same plugin remained in place and was rebuilt: `src/client/index.ts`, `src/index.ts`, `src/types.ts`, `src/client/locales.ts`, `src/client/WorkspaceFileViewerPanel.module.css`, `tests/browser-plugin.client.spec.ts`, `tests/workspace-file-viewer.spec.ts`, `lib/types/client/index.js`.

**Status:** ✅ Implemented

**Results:** The HTML preview now intercepts iframe anchor clicks after `srcDoc` load. Relative `.html` links are resolved against the currently previewed file path, then loaded through the existing workspace `read(rootId, path)` Remote and optional parent directory listing refresh. Hash-only links remain inside the preview. External, scheme-based, root-absolute, backslash, malformed percent-encoded, non-HTML, and root-escaping relative links are not navigated by the iframe. Filesystem access remains on the existing server allowlist/path normalization path.

**Validation:**
- `pnpm exec vitest run plugins/openclaw-workspace-file-viewer/tests/panel.client.spec.tsx plugins/openclaw-workspace-file-viewer/tests/workspace-file-viewer.spec.ts` — passed, 20 tests.
- `pnpm exec tsc -b plugins/openclaw-workspace-file-viewer/tsconfig.json plugins/openclaw-workspace-file-viewer/tsconfig.client.json` — passed.
- `pnpm --filter @openclaw/dsh-workspace-file-viewer run bundle` — passed; refreshed bundled runtime artifacts.
- `git diff --check` — passed.

**Limitations:** Retest in the real web UI should click a sibling link such as `<a href="next.html">` inside an HTML preview. The implementation intentionally does not open external links from the sandboxed preview.

---

## Final Results

**Status:** Implemented

**What We Built:** Local relative `.html` links inside the workspace file viewer HTML preview navigate to the target file in the overlay without leaving the iframe sandbox or bypassing the configured workspace root allowlist.

**Reference Check:** Read `README.md` before repo edits; used the workspace viewer panel, gateway, and focused tests listed above.

**Commits:** `41de3bc9c3` (`Fix workspace HTML preview local links`) plus `17113d16fb` (`Record workspace HTML preview fix plan`), pushed to `derrick/dsh-chip-workspace-file-viewer`.

**Lessons Learned:** `iframe srcDoc` has no workspace-aware file base, so local navigation needs an explicit click bridge back to the viewer's Remote read path.
