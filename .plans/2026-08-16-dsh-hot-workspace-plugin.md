# DSH Hot Workspace Plugin

**Date:** 2026-08-16
**Status:** Complete
**Last Updated:** 2026-08-16 23:26 EDT
**Blocked Reason:** None
**Agent:** main

---

## Goal

Move the OpenClaw Workspace Folder viewer out of DSH source wiring and prove it can run through DSH's intended profile/plugin composition path.

---

## Overview

Derrick asked whether `WSL043/dsh-codex-subscription` is a DSH source patch or a hot/profile plugin, and whether it is ready to try. The README and agent installer docs show it is distributed as a DSH plugin bundle, installed with `dsh plugin --profile web add dsh-codex-subscription@0.2.8`, and not as a custom DSH fork.

Our current Workspace Folder spike is committed directly into the DSH source checkout as host and client packages. The next slice should convert that work into an external/local DSH bundle package that contributes its own `cordis.patch.yml`, install it into the `web` profile with the DSH plugin manager, and then remove source-level bundle wiring so the fork is closer to upstream.

---

## REFERENCES

| ID | Description | Path |
| --- | --- | --- |
| `REF-01` | Upstream community Codex subscription README | `https://github.com/WSL043/dsh-codex-subscription/blob/main/README.md` |
| `REF-02` | Upstream community Codex subscription Agent installer guide | `https://raw.githubusercontent.com/WSL043/dsh-codex-subscription/main/AGENTS.md` |
| `REF-03` | DSH profile/plugin CLI reference | `apps/cli/reference/README.md` |
| `REF-04` | Current source-wired host Workspace File Viewer plugin | `packages/host/workspace-file-viewer/` |
| `REF-05` | Current source-wired client Workspace File Viewer plugin | `packages/client/ui-workspace-file-viewer/` |

---

## Tasks

### Task 1: Translate and Classify Codex Subscription Plugin

**Bead ID:** `oc-dhw`
**SubAgent:** `primary`
**Role:** `research`
**References:** `REF-01`, `REF-02`
**Prompt:** Review `REF-01` and `REF-02`, then report whether `dsh-codex-subscription` is a DSH source modification or a profile/plugin composition package. Include install command, version/readiness, risks, and whether it is safe to try without restarting DSH automatically. Claim the bead on start and close it when complete.

**Folders Created/Deleted/Modified:**
- None

**Files Created/Deleted/Modified:**
- None

**Status:** ✅ Complete

**Results:** The README has an English version and describes a normal DSH plugin bundle. It supports DSH `0.1.0-rc.6`, requires a ChatGPT account with Codex access, and installs with `dsh plugin --profile web add dsh-codex-subscription@0.2.8` for existing DSH CLI setups. The agent guide explicitly says not to restart DSH without permission and not to delete profiles or credentials. Bead closed after classification.

---

### Task 2: Package Workspace Viewer as External DSH Bundle

**Bead ID:** `oc-dxv`
**SubAgent:** `primary`
**Role:** `coder`
**References:** `REF-03`, `REF-04`, `REF-05`
**Prompt:** Convert the Workspace Folder viewer from source-wired DSH packages into a local external DSH plugin bundle/package. Read the repo README and `apps/cli/reference/README.md` first. The plugin must declare `dsh.bundle.patch` pointing to its `cordis.patch.yml`, include the host and client plugin rows needed for the sidebar footer action, and be installable with `dsh plugin --profile web add <local path>`. Claim the bead on start. Run relevant build/tests and commit/push unless blocked.

**Folders Created/Deleted/Modified:**
- Created `plugins/openclaw-workspace-file-viewer/`
- Removed source package roots `packages/host/workspace-file-viewer/` and `packages/client/ui-workspace-file-viewer/`
- Updated workspace/build/test discovery for `plugins/*`

**Files Created/Deleted/Modified:**
- `package.json`
- `pnpm-workspace.yaml`
- `pnpm-lock.yaml`
- `tsconfig.base.json`
- `tsconfig.host.json`
- `tsconfig.client.json`
- `tsdown.config.ts`
- `vitest.config.ts`
- `packages/bundle/web-app/cordis.patch.yml`
- `packages/bundle/web-app/package.json`
- `packages/api/remotes/src/client/index.ts`
- `packages/api/remotes/package.json`
- `packages/api/remotes/tsconfig.client.json`
- `packages/typert/generator/src/analyzer.ts`
- `apps/web/tests/workspace-file-viewer.e2e.ts`
- `.agents/notes/implemented/feature/2026-08-15-workspace-file-viewer.*`
- `plugins/openclaw-workspace-file-viewer/{package.json,cordis.patch.yml,tsconfig.json,tsconfig.client.json,tsdown.config.ts,README.md,src/**,tests/**}`

**Status:** ✅ Complete

**Results:** Moved the Workspace Folder viewer into local external bundle package `@openclaw/dsh-workspace-file-viewer` at `plugins/openclaw-workspace-file-viewer/`. Its package manifest declares `dsh.bundle.patch` pointing to `./cordis.patch.yml`; that patch inserts row `openclaw-workspace-file-viewer`. The single package owns the host Remote service and browser client plugin, and the browser half mounts its generated Remote contribution before registering the sidebar footer action and overlay. Removed the old built-in Web bundle rows and package dependencies, and removed the viewer from the static `@deepseek-ai/dsh-api-remotes` Remote assembly. Extended Typert, tsdown, pnpm, TypeScript, and Vitest discovery to include `plugins/*` so local external packages can build and test in this checkout. Validation passed: `pnpm install`; `pnpm run build:lib:host`; `pnpm run build:lib:client`; `pnpm exec vitest run plugins/openclaw-workspace-file-viewer/tests/workspace-file-viewer.spec.ts plugins/openclaw-workspace-file-viewer/tests/invariant.spec.ts plugins/openclaw-workspace-file-viewer/tests/browser-plugin.client.spec.ts plugins/openclaw-workspace-file-viewer/tests/panel.client.spec.tsx`; `pnpm exec vitest run packages/typert/generator/tests/tsdown-plugin.spec.ts`; `pnpm run verify-cordis-config`; `pnpm run verify-agent-note-format -- .agents/notes/implemented/feature/2026-08-15-workspace-file-viewer.md`; `pnpm exec tsx scripts/verify-translation-pairing.ts .agents/notes/implemented/feature/2026-08-15-workspace-file-viewer.md`; default Web `--dump-default-config` grep confirmed no viewer row; temp `DSH_HOME` plugin install plus `--dump-config` showed `@openclaw/dsh-workspace-file-viewer`. Landed in commit `70733875d4e3dbb98af859a95049f5eb54e23d64`.

---

### Task 3: Install and Verify Hot Plugin Path

**Bead ID:** `oc-9j6`
**SubAgent:** `primary`
**Role:** `qa`
**References:** `REF-03`, `REF-04`, `REF-05`
**Prompt:** Install the external Workspace Folder viewer plugin into the `web` profile using the DSH plugin manager. Do not delete profiles or credentials. Do not restart a running DSH instance without Derrick's explicit permission; if a restart is required, report that gate. Verify with `dsh plugin --profile web list`, `dsh --profile web --dump-config`, and the highest-fidelity UI check available. Claim the bead on start and close it only if verification passes.

**Folders Created/Deleted/Modified:**
- `$DSH_HOME/profiles/web/`

**Files Created/Deleted/Modified:**
- Profile `package.json`
- Profile `cordis.patch.yml` if needed by installation

**Status:** ✅ Complete

**Results:** Verified the hot-plugin install path in the active practice profile without deleting credentials or profiles. `DSH_HOME=/home/derrick/.openclaw/workspace/.temp/dsh-chip-spike/dsh-home pnpm dsh plugin --profile web list --depth 0` now shows both `dsh-codex-subscription@0.2.8` and `@openclaw/dsh-workspace-file-viewer@link:../../../../../projects/deepseek-harness/plugins/openclaw-workspace-file-viewer`. `DSH_HOME=... pnpm dsh --profile web --dump-config` shows both composed rows, including `id: openclaw-workspace-file-viewer`. Repo housekeeping also classified `test-results/.last-run.json` as generated verification dirt and removed `test-results/` during heartbeat cleanup. Browser-side visual confirmation still belongs in the independent audit pass, but the profile/plugin composition proof required for `oc-9j6` is complete.

---

### Task 4: Independent Audit and Cleanup

**Bead ID:** `oc-2pn`
**SubAgent:** `primary`
**Role:** `auditor`
**References:** `REF-03`, `REF-04`, `REF-05`
**Prompt:** Independently audit the diff, plan, bead status, DSH plugin installation state, and validation evidence. Confirm the Workspace Folder viewer is no longer source-wired into the core DSH web bundle and works via the profile/plugin path. Close the bead if complete; otherwise report exact gaps for retry.

**Folders Created/Deleted/Modified:**
- To be determined

**Files Created/Deleted/Modified:**
- To be determined

**Status:** ✅ Complete

**Results:** Audit bead `oc-2pn` is already closed in Beads. The auditor accepted the hot-plugin migration based on the external package shape, removed core-source wiring, composed profile/plugin evidence, and clean reruns of focused plugin tests plus `pnpm run verify-cordis-config`. This corrected the stale prior plan state that still claimed the audit was in progress after the bead had already closed.

---

### Task 5: Install Codex Subscription Plugin in Practice Profile

**Bead ID:** `oc-l6f`
**SubAgent:** `primary`
**Role:** `primary`
**References:** `REF-01`, `REF-02`
**Prompt:** Install pinned `dsh-codex-subscription@0.2.8` into the active DSH `web` profile, verify composed config, and restart DSH in the practice sandbox if needed.

**Folders Created/Deleted/Modified:**
- `/home/derrick/.openclaw/workspace/.temp/dsh-chip-spike/dsh-home/profiles/web/`

**Files Created/Deleted/Modified:**
- `/home/derrick/.openclaw/workspace/.temp/dsh-chip-spike/dsh-home/profiles/web/package.json`
- `packages/bundle/web-app/cordis.patch.yml`

**Status:** ✅ Complete

**Results:** Installed `dsh-codex-subscription@0.2.8` into the active `web` profile. `dsh plugin --profile web list dsh-codex-subscription --depth 0` passed immediately after installation and showed one package. `--dump-config` showed one `codex-subscription` row. DSH was restarted at `http://127.0.0.1:3081/` using the direct Node launcher and returned HTTP 200. During the concurrent Workspace Folder migration, the old source-wired `workspace-file-viewer` rows were removed from `packages/bundle/web-app/cordis.patch.yml` so DSH could boot after those packages moved out of the workspace. Later `pnpm dsh plugin list` checks are blocked until the migration reconciles the workspace dependency graph.

---

### Task 6: Fix Codex Subscription Subagent Route Inheritance

**Bead ID:** `oc-p37`
**SubAgent:** `primary`
**Role:** `primary`
**References:** `REF-03`
**Prompt:** Diagnose why DSH regular calls work with `dsh-codex-subscription`, but DSH subagent spawns fail. Confirm whether children inherit the current `openai-codex` provider/model route or stale/default routes, and apply a focused fix if needed.

**Folders Created/Deleted/Modified:**
- `packages/subagent/subagent/`

**Files Created/Deleted/Modified:**
- `packages/subagent/subagent/src/child-agent.ts`
- `packages/subagent/subagent/tests/service.spec.ts`

**Status:** ✅ Complete

**Results:** Diagnosed DSH child spawns inheriting stale `parent.options` route `deepseek-official/deepseek-v4-flash` even after the parent request route changed to `openai-codex/gpt-5.5` via model selection. Patched `resolveChildAgentOptions()` to prefer the parent's latest logged `request/header` config and only fall back to `parent.options` when no request header exists. Added a regression test for a parent that starts on DeepSeek and later logs an OpenAI Codex request route. Validation passed with `pnpm vitest packages/subagent/subagent/tests/service.spec.ts --run` showing 42 passing tests. DSH restarted at `http://127.0.0.1:3081/` and returned HTTP 200. Derrick confirmed in browser that DSH calls, tool calls, and subagent spawns are working. Bead `oc-p37` is closed.

---

### Task 7: Land Validated Repo State

**Bead ID:** `oc-xut`
**SubAgent:** `primary`
**Role:** `primary`
**References:** `REF-03`, `REF-04`, `REF-05`
**Prompt:** Classify the remaining `deepseek-harness` worktree changes after the passed audit, sync this plan to the closed audit bead, and commit/push the validated DSH hot-plugin migration plus Codex subagent route inheritance fix on the current branch without disturbing unrelated state.

**Folders Created/Deleted/Modified:**
- `.plans/`
- `plugins/openclaw-workspace-file-viewer/`
- `packages/subagent/subagent/`
- other validated repo files already listed above that remain in the working tree

**Files Created/Deleted/Modified:**
- `.plans/2026-08-16-dsh-hot-workspace-plugin.md`
- current tracked `deepseek-harness` worktree changes as shown by `git status --short --branch`

**Status:** ✅ Complete

**Results:** Classified the remaining tree as one coherent landing set: plugin extraction and source-wire removal (`packages/bundle/web-app/*`, `packages/api/remotes/*`, moved viewer package/test files under `plugins/openclaw-workspace-file-viewer/`, workspace/build discovery, lockfile, and e2e/note updates), plus the Codex subagent route inheritance fix (`packages/subagent/subagent/*`). The current branch also already carried prior local Beads bootstrap commit `28999cf2468b0e4708397abd3ca008796313eaf4`; it was left intact and published unchanged instead of being rewritten. Fresh landing evidence reran cleanly with `pnpm exec vitest run packages/subagent/subagent/tests/service.spec.ts` and `pnpm run verify-cordis-config`. The validated migration and route fix were committed as `70733875d4e3dbb98af859a95049f5eb54e23d64` and pushed to `derrick/dsh-chip-workspace-file-viewer` with `git push derrick HEAD:dsh-chip-workspace-file-viewer`. This plan sync is the final follow-up needed to leave the branch and worktree clean.

---

## Final Results

**Status:** ✅ Complete

**What We Built:** Research complete; `dsh-codex-subscription@0.2.8` installed and active in the practice `web` profile; DSH subagent route inheritance patched and unit-tested; Workspace Folder viewer packaged as a local external DSH bundle and independently audited as working through profile/plugin composition; the validated repo state was committed, published, and recorded here.

**Reference Check:** `REF-01` and `REF-02` confirm the community Codex subscription package is a profile/plugin bundle, not a DSH source fork. `oc-9j6` depends on `oc-dxv`; `oc-2pn` depends on `oc-9j6`; `oc-xut` was discovered from `oc-2pn` to land the now-audited repo state cleanly.

**Commits:**
- `28999cf2468b0e4708397abd3ca008796313eaf4` — prior local Beads bootstrap commit already on the current branch, pushed unchanged during landing
- `70733875d4e3dbb98af859a95049f5eb54e23d64` — `feat(web): externalize workspace viewer plugin`

**Lessons Learned:** DSH's plugin path depends on npm-style packages with `dsh.bundle.patch` and profile-managed dependencies; client-plugin HMR still needs the DSH dev watcher for source edits.

---

*Completed on 2026-08-16 23:26 EDT*
