# DSH Full Remote Local Parity

**Date:** 2026-08-19
**Status:** Blocked
**Last Updated:** 2026-08-19 00:44 EDT
**Blocked Reason:** Source commits are pushed, but live remote/local parity is not complete until `oc-761`, `oc-wdk`, and `oc-587` are resolved and audit `oc-3g0` closes.
**Agent:** chip

---

## Goal

Make trusted remote DSH access behave like local loopback access for the DSH API surface Derrick uses through the Tailscale URL.

---

## Overview

Derrick confirmed the intended product posture for Chip DSH: remote access through `https://derrick-surface-pro-8.tail613fcb.ts.net:8443/` should have parity with local loopback. A future authentication gate may be added later as a separate task; this task is about workflow parity now.

The prior source change in this repo (`3a9b6e4bf3`, `Allow trusted remote settings access`) promoted the settings RPCs from loopback-only to trusted-host. That fixed Settings General and Models metadata loading, but audit intentionally left credentials, desktop/host actions, `llm.discoverModels`, and agent preset authoring remote-blocked. Full parity requires revisiting that remaining loopback-only boundary in source, updating the tests/docs that assert it, and validating the running Chip DSH service through both loopback and Tailscale.

This is source-level DSH work, not a hotswap-plugin-only change. The final plan record should name the source commit(s) so future DSH upgrades can port the local policy delta deliberately.

---

## REFERENCES

| ID | Description | Path |
| --- | --- | --- |
| `REF-01` | Connection package trust boundary and RPC authority implementation | `/home/derrick/.openclaw/workspace/projects/deepseek-harness/packages/client/connection/src/index.ts` |
| `REF-02` | Host route authority enforcement | `/home/derrick/.openclaw/workspace/projects/deepseek-harness/packages/client/connection/src/rpc-host.ts` |
| `REF-03` | Current host-boundary tests | `/home/derrick/.openclaw/workspace/projects/deepseek-harness/packages/client/connection/tests/node-half.host.spec.ts` |
| `REF-04` | Connection README documenting the current remote boundary | `/home/derrick/.openclaw/workspace/projects/deepseek-harness/packages/client/connection/README.md` |
| `REF-05` | Prior remote settings parity plan | `/home/derrick/.openclaw/workspace/projects/dsh-orchestration-agent/.plans/archive/2026-08-18-dsh-remote-settings-parity.md` |
| `REF-06` | Native workspace directory picker Agent Note | `/home/derrick/.openclaw/workspace/projects/deepseek-harness/.agents/notes/implemented/feature/2026-07-27-native-workspace-directory-picker.md` |

---

## Tasks

### Task 1: Implement Full Trusted-Remote Parity

**Bead ID:** `oc-s9i`
**SubAgent:** `primary`
**Role:** `coder`
**References:** `REF-01`, `REF-02`, `REF-03`, `REF-04`, `REF-05`
**Prompt:** You are the `coder` role on the `primary` lane. Work in `/home/derrick/.openclaw/workspace/projects/deepseek-harness` and read that repo's `README.md` before touching files. This task is bead `oc-s9i`; claim it on start with `bd update oc-s9i --status in_progress --json`. Goal: make trusted remote DSH access through `https://derrick-surface-pro-8.tail613fcb.ts.net:8443/` behave like local loopback for the DSH API surface Derrick uses. This is source-level DSH work, not hotswap-plugin-only; keep the policy delta easy to port to future DSH versions. Derrick explicitly approves remote/local parity now; a future auth gate is out of scope. Review `packages/client/connection/src/index.ts`, `packages/client/connection/src/rpc-host.ts`, `packages/client/connection/tests/node-half.host.spec.ts`, the connection README, and prior plan `/home/derrick/.openclaw/workspace/projects/dsh-orchestration-agent/.plans/archive/2026-08-18-dsh-remote-settings-parity.md`. Implement the narrowest durable change that gives trusted hosts loopback parity, update tests/docs that currently assert loopback-only behavior, and do not revert unrelated workspace-viewer changes already present in this worktree. Validate with focused tests and live local/Tailscale probes for representative routes including settings, credentials, host actions, model discovery, and agent preset authoring. Hotfix/restart the running Chip DSH service if needed so Derrick can test the live URL. Commit and push durable changes unless blocked; close `oc-s9i` only when implementation and validation pass, otherwise leave it open with exact notes.

**Folders Created/Deleted/Modified:**
- `packages/client/connection/`
- `.agents/notes/implemented/architecture/`

**Files Created/Deleted/Modified:**
- `packages/client/connection/src/index.ts`
- `packages/client/connection/tests/node-half.host.spec.ts`
- `packages/client/connection/README.md`
- `packages/client/connection/README.zh.md`
- `packages/client/connection/README.i18n.yaml`
- `.agents/notes/implemented/architecture/2026-07-28-api-browser-trust-boundary.md`
- `.agents/notes/implemented/architecture/2026-07-28-api-browser-trust-boundary.zh.md`
- `.agents/notes/implemented/architecture/2026-07-28-api-browser-trust-boundary.i18n.yaml`

**Status:** ✅ Complete

**Results:** Coder completed and closed `oc-s9i`. Source commit `9777d79c09` (`Allow trusted hosts full API parity`) was pushed to `derrick/dsh-chip-workspace-file-viewer`. The implementation removed the extra privileged-method loopback gate while keeping the Host/trusted-host browser trust fence, updated focused tests, updated English/Chinese connection README pairing, and updated the existing browser-trust Agent Note. Validation reported: focused `node-half.host.spec.ts` passed 12 tests, staged translation pairing passed for touched README/Agent Note pairs, `git diff --check` passed, `pnpm run build:lib:host` passed, and live local/Tailscale probes for `settings.describe`, `credentials.describe`, `host.openPath`, `llm.discoverModels`, and `agentPreset.copy` all returned HTTP `200` on both loopback and `https://derrick-surface-pro-8.tail613fcb.ts.net:8443/`. `pnpm run doc-sync` ran 27/28 gates and failed only the pre-existing unrelated `plugins/openclaw-workspace-file-viewer/README.md` bilingual pairing.

---

### Task 2: QA Full Trusted-Remote Parity

**Bead ID:** `oc-9n8`
**SubAgent:** `primary`
**Role:** `qa`
**References:** `REF-01`, `REF-03`, `REF-04`
**Prompt:** You are the `qa` role on the `primary` lane. Work in `/home/derrick/.openclaw/workspace/projects/deepseek-harness` and read that repo's `README.md` before touching files. This task is bead `oc-9n8`; claim it on start with `bd update oc-9n8 --status in_progress --json`. It depends on implementation bead `oc-s9i`. Verify full trusted-remote/local parity from the running Chip DSH service through `https://derrick-surface-pro-8.tail613fcb.ts.net:8443/`. Confirm representative APIs that previously differed from loopback now work remotely as local does, including settings, credentials, host/desktop actions where testable without destructive behavior, `llm.discoverModels`, and agent preset authoring/read paths. Also verify local loopback still works. Run relevant focused tests/smoke gates. Close `oc-9n8` only if QA passes; otherwise leave it open with exact failures.

**Folders Created/Deleted/Modified:**
- `Pending`

**Files Created/Deleted/Modified:**
- `Pending`

**Status:** ✅ Complete

**Results:** QA completed and closed `oc-9n8`. QA verified implementation bead `oc-s9i` was closed at commit `9777d79c09`, then ran focused validation: `pnpm vitest packages/client/connection/tests/node-half.host.spec.ts --run` passed 12 tests, `pnpm run build:lib:host` passed, and `git diff --check` passed. Live loopback and Tailscale UI reachability both returned HTTP `200`. Local/remote parity was verified for `settings.describe`, `credentials.describe`, `host.describe`, `llm.providers`, `llm.models`, `llm.discoverModels`, `agentPreset.list`, and `agentPreset.copy/read/remove`. A non-destructive `GET /api/host.openPath` returned `404` instead of `403` on both loopback and Tailscale, proving both paths passed the trust fence without triggering a native desktop open. QA noted that `bd comment` updated local bead state but automatic Dolt push failed with GitHub `403` to `deepseek-ai/deepseek-harness.git`.

---

### Task 3: Audit Full Trusted-Remote Parity

**Bead ID:** `oc-3g0`
**SubAgent:** `primary`
**Role:** `auditor`
**References:** `REF-01`, `REF-02`, `REF-03`, `REF-04`, `REF-05`
**Prompt:** You are the `auditor` role on the `primary` lane. Work in `/home/derrick/.openclaw/workspace/projects/deepseek-harness` and read that repo's `README.md` before touching files. This task is bead `oc-3g0`; claim it on start with `bd update oc-3g0 --status in_progress --json`. It depends on QA bead `oc-9n8`. Independently review the plan, bead state, implementation diff, commits, tests, docs, and live validation evidence for full trusted-remote/local parity. Confirm the final policy intentionally makes trusted remote access equivalent to loopback for the approved API surface and that any remaining non-parity is explicitly documented and justified. Close `oc-3g0` only if the work is actually complete and evidence is clean; otherwise report the exact gap and leave it open.

**Folders Created/Deleted/Modified:**
- `Pending`

**Files Created/Deleted/Modified:**
- `Pending`

**Status:** ⏳ Audit Retry Blocked

**Results:** Initial audit reviewed the source policy, tests, QA evidence, and live loopback/Tailscale probes for commit `9777d79c09`. Behavior evidence passed: focused connection Vitest passed 12/12, `git diff --check` passed, UI reachability returned 200 on loopback and Tailscale, and representative local/remote API probes returned 200 for settings, credentials, host describe, LLM catalog/model discovery, and agent preset read/write cleanup. Audit failed because active docs/comments/Agent Notes still contradicted the new approved parity policy by describing now-remote-capable APIs as loopback-only. Cleanup bead `oc-9wx` then closed with commit `f6e162a8e2`. The audit retry found runtime evidence still clean but identified additional stale preset-authoring docs/comments; cleanup bead `oc-bhc` closed with commit `546abfbb2b`, clearing the blocker. Final audit retry after those cleanup commits again passed behavior evidence, including non-destructive `host.openPath` and `host.pickDirectory` probes returning `404` instead of `403` on both loopback and Tailscale, but found `REF-06` and its Chinese counterpart still described the native picker carrier as loopback-only. Cleanup bead `oc-19c` then closed with commit `1bef9206c4`. The next audit retry confirmed server-side `/api` parity was clean but found trusted-host UI parity still incomplete: Settings General suppresses the `settings.openDocument` controller on non-loopback connections, Produced Files hides **Show in folder** behind `connection.isLoopback`, and the active web workspace file-links Agent Note documents that now-stale loopback-only affordance. Cleanup bead `oc-j50` was created and linked as a blocker of `oc-3g0`.

---

### Task 4: Clean Stale Remote-Parity Docs

**Bead ID:** `oc-9wx`
**SubAgent:** `primary`
**Role:** `coder`
**References:** `REF-01`, `REF-02`, `REF-03`, `REF-04`, `REF-05`
**Prompt:** You are the `coder` role on the `primary` lane. Work in `/home/derrick/.openclaw/workspace/projects/deepseek-harness` and read that repo's `README.md` before touching files. This task is bead `oc-9wx`; claim it on start with `bd update oc-9wx --status in_progress --json`. It was discovered by audit bead `oc-3g0` and blocks that audit. Goal: clean stale active README/comment/Agent Note text that still says now-trusted-host-capable APIs are loopback-only after commit `9777d79c09` made trusted remote access equivalent to loopback for the approved API surface. Update the stale package READMEs/comments/JSDoc and affected active Agent Notes named in the `oc-3g0` audit comment, including Chinese counterparts and i18n sidecars where applicable. Do not change unrelated workspace-viewer dirty files. Validate with focused docs pairing/format checks, `git diff --check`, and the focused connection Vitest. Commit and push durable changes unless blocked. Close `oc-9wx` only when cleanup and validation pass; otherwise leave it open with exact failures.

**Folders Created/Deleted/Modified:**
- `.agents/notes/implemented/architecture/`
- `packages/client/locale/`
- `packages/client/ui-agent-preset/`
- `packages/client/ui-settings/`
- `packages/client/ui-settings-general/`
- `packages/host/apiproxy/`

**Files Created/Deleted/Modified:**
- `.agents/notes/implemented/architecture/2026-07-30-config-plane-boundaries.i18n.yaml`
- `.agents/notes/implemented/architecture/2026-07-30-config-plane-boundaries.md`
- `.agents/notes/implemented/architecture/2026-07-30-config-plane-boundaries.zh.md`
- `.agents/notes/implemented/architecture/2026-08-04-draft-provider-endpoint-interrogation.i18n.yaml`
- `.agents/notes/implemented/architecture/2026-08-04-draft-provider-endpoint-interrogation.md`
- `.agents/notes/implemented/architecture/2026-08-04-draft-provider-endpoint-interrogation.zh.md`
- `packages/client/locale/README.i18n.yaml`
- `packages/client/locale/README.md`
- `packages/client/locale/README.zh.md`
- `packages/client/ui-agent-preset/src/client/settings-store.ts`
- `packages/client/ui-agent-preset/tests/settings-store.client.spec.ts`
- `packages/client/ui-settings-general/README.i18n.yaml`
- `packages/client/ui-settings-general/README.md`
- `packages/client/ui-settings-general/README.zh.md`
- `packages/client/ui-settings/README.i18n.yaml`
- `packages/client/ui-settings/README.md`
- `packages/client/ui-settings/README.zh.md`
- `packages/host/apiproxy/README.i18n.yaml`
- `packages/host/apiproxy/README.md`
- `packages/host/apiproxy/README.zh.md`
- `packages/host/apiproxy/src/api/settings.ts`

**Status:** ✅ Complete

**Results:** Coder completed and closed `oc-9wx`. Commit `f6e162a8e2` (`docs: align trusted-host API parity prose`) was pushed to `derrick/dsh-chip-workspace-file-viewer`. The cleanup updated stale trusted-host parity prose across the package READMEs, comments/JSDoc, active Agent Notes, Chinese counterparts, and i18n sidecars named by the failed audit, plus related active docs that still described Host settings, onboarding, theme, file-open, and config-plane APIs as loopback-only. Validation reported: translation pairing write/check passed for touched docs, Agent Note format passed, Markdown wrap/link checks passed for touched docs, `git diff --check` passed, `git diff --cached --check` passed, and focused `pnpm vitest packages/client/connection/tests/node-half.host.spec.ts --run` passed.

---

### Task 5: Clean Remaining Preset-Authoring Remote-Parity Docs

**Bead ID:** `oc-bhc`
**SubAgent:** `primary`
**Role:** `coder`
**References:** `REF-01`, `REF-02`, `REF-03`, `REF-04`, `REF-05`
**Prompt:** You are the `coder` role on the `primary` lane. Work in `/home/derrick/.openclaw/workspace/projects/deepseek-harness` and read that repo's `README.md` before touching files. This task is bead `oc-bhc`; claim it on start with `bd update oc-bhc --status in_progress --json`. It was discovered by audit bead `oc-3g0` and blocks that audit. Goal: clean the remaining active preset-authoring docs/comments that still say trusted-host-capable agent-preset authoring/openDocument APIs are loopback-pinned after commits `9777d79c09` and `f6e162a8e2`. Update `packages/client/ui-agent-preset/README.md`, `packages/client/ui-agent-preset/README.zh.md`, `packages/host/apiproxy/src/api/agent-presets.ts`, `.agents/notes/implemented/architecture/2026-08-03-per-session-agent-presets.md`, `.agents/notes/implemented/architecture/2026-08-03-per-session-agent-presets.zh.md`, `.agents/notes/implemented/simplification/2026-08-08-copy-only-preset-authoring.md`, `.agents/notes/implemented/simplification/2026-08-08-copy-only-preset-authoring.zh.md`, and any affected i18n sidecars. Do not touch unrelated workspace-viewer dirty files. Validate focused docs pairing/format checks, `git diff --check`, and the focused connection Vitest. Commit and push durable changes unless blocked. Close `oc-bhc` only when cleanup and validation pass; otherwise leave it open with exact failures.

**Folders Created/Deleted/Modified:**
- `.agents/notes/implemented/architecture/`
- `.agents/notes/implemented/simplification/`
- `packages/client/ui-agent-preset/`
- `packages/host/apiproxy/`

**Files Created/Deleted/Modified:**
- `.agents/notes/implemented/architecture/2026-08-03-per-session-agent-presets.i18n.yaml`
- `.agents/notes/implemented/architecture/2026-08-03-per-session-agent-presets.md`
- `.agents/notes/implemented/architecture/2026-08-03-per-session-agent-presets.zh.md`
- `.agents/notes/implemented/simplification/2026-08-08-copy-only-preset-authoring.i18n.yaml`
- `.agents/notes/implemented/simplification/2026-08-08-copy-only-preset-authoring.md`
- `.agents/notes/implemented/simplification/2026-08-08-copy-only-preset-authoring.zh.md`
- `packages/client/ui-agent-preset/README.i18n.yaml`
- `packages/client/ui-agent-preset/README.md`
- `packages/client/ui-agent-preset/README.zh.md`
- `packages/host/apiproxy/src/api/agent-presets.ts`

**Status:** ✅ Complete

**Results:** Coder completed and closed `oc-bhc`. Commit `546abfbb2b` (`docs: update preset authoring trust parity`) was pushed to `derrick/dsh-chip-workspace-file-viewer`. The cleanup updated remaining preset-authoring docs/comments to describe shared `/api` trust fence parity for loopback and declared `trustedHosts`, including English/Chinese README and Agent Note pairs plus i18n records and the host API source comment. Validation reported: translation pairing passed for the three touched pairs, Agent Note format passed, Markdown wrap/link checks passed, `git diff --check` passed, and focused connection Vitest for trusted-authority loopback parity / declared LAN authority passed. Unrelated workspace-viewer dirty files were left untouched.

---

### Task 6: Clean Native Picker Remote-Parity Agent Note

**Bead ID:** `oc-19c`
**SubAgent:** `primary`
**Role:** `coder`
**References:** `REF-01`, `REF-02`, `REF-03`, `REF-06`
**Prompt:** You are the `coder` role on the `primary` lane. Work in `/home/derrick/.openclaw/workspace/projects/deepseek-harness` and read that repo's `README.md` before touching files. This task is bead `oc-19c`; claim it on start with `bd update oc-19c --status in_progress --json`. Goal: clean the stale native picker remote parity Agent Note that still says `host.pickDirectory`/native dialog RPC is loopback-only after trusted-host API parity. Update `.agents/notes/implemented/feature/2026-07-27-native-workspace-directory-picker.md` and the Chinese counterpart if present. If the zh file is in the same directory with `.zh.md`, update that; do not invent a new path unless repo conventions require it. Also update any i18n sidecar/manifest if this repo has one for Agent Notes. Required policy wording: shared `/api` calls from loopback and declared `trustedHosts` now pass the same trust fence for this route. Dedicated/custom RPC carriers may still use explicit loopback-only authority if they opt into that path. Do not imply the current `/api/host.pickDirectory` route is loopback-only. Do not touch unrelated workspace-viewer dirty files. Validate with focused Agent Note/docs checks if discoverable, `git diff --check`, `git diff --cached --check`, and `pnpm vitest packages/client/connection/tests/node-half.host.spec.ts --run`. Commit and push durable changes unless blocked. Close `oc-19c` only when cleanup and validation pass; otherwise leave it open with exact notes.

**Folders Created/Deleted/Modified:**
- `.agents/notes/implemented/feature/`

**Files Created/Deleted/Modified:**
- `.agents/notes/implemented/feature/2026-07-27-native-workspace-directory-picker.i18n.yaml`
- `.agents/notes/implemented/feature/2026-07-27-native-workspace-directory-picker.md`
- `.agents/notes/implemented/feature/2026-07-27-native-workspace-directory-picker.zh.md`

**Status:** ✅ Complete

**Results:** Coder completed and closed `oc-19c`. Commit `1bef9206c4` (`docs: update native picker trust note`) was pushed to `derrick/dsh-chip-workspace-file-viewer`. The cleanup updated the native picker Agent Note triplet to state that `/api/host.pickDirectory` uses the shared `/api` trust fence: loopback and declared `trustedHosts` pass, undeclared non-loopback authorities are refused, and custom RPC carriers may still opt into explicit loopback-only authority. Validation reported: `pnpm run verify-agent-note-format`, `pnpm run verify-agent-note-classification`, translation pairing for the touched Agent Note, `git diff --check`, `git diff --cached --check`, and `pnpm vitest packages/client/connection/tests/node-half.host.spec.ts --run` all passed. Unrelated workspace-viewer dirty files were left untouched.

---

### Task 7: Fix Trusted-Host Native UI Affordance Parity

**Bead ID:** `oc-j50`
**SubAgent:** `primary`
**Role:** `coder`
**References:** `REF-01`, `REF-02`, `REF-03`
**Prompt:** You are the `coder` role on the `primary` lane. Work in `/home/derrick/.openclaw/workspace/projects/deepseek-harness` and read that repo's `README.md` before touching files. This task is bead `oc-j50`; claim it on start with `bd update oc-j50 --status in_progress --json`. Audit bead `oc-3g0` found client UI gates that still use `connection.isLoopback` after trusted-host `/api` parity. Fix trusted-host UI parity for Settings General `settings.openDocument` and Produced Files **Show in folder**. Review and update `packages/client/ui-settings-general/src/client/index.ts`, `packages/client/ui-deliverables/src/client/ProducedFiles.tsx`, tests for those packages, and `.agents/notes/implemented/feature/2026-07-31-web-workspace-file-links.md` plus Chinese/i18n counterparts as needed. The intended policy is that loopback and declared `trustedHosts` may use the same `/api` Host/settings affordances when the Host capability says they are available; undeclared remote authorities remain blocked by the shared connection trust fence. Preserve explicit custom/dedicated loopback authority docs. Do not touch unrelated workspace-viewer dirty files. Validate focused unit tests, docs/Agent Note checks, `git diff --check`, `git diff --cached --check`, and live local/Tailscale probes if feasible. Commit and push durable changes unless blocked. Close `oc-j50` only when implementation, docs, and validation pass; otherwise leave it open with exact notes.

**Folders Created/Deleted/Modified:**
- `.agents/notes/implemented/feature/`
- `packages/client/ui-deliverables/`
- `packages/client/ui-settings-general/`

**Files Created/Deleted/Modified:**
- `.agents/notes/implemented/feature/2026-07-31-web-workspace-file-links.md`
- `.agents/notes/implemented/feature/2026-07-31-web-workspace-file-links.zh.md`
- `.agents/notes/implemented/feature/2026-07-31-web-workspace-file-links.i18n.yaml`
- `packages/client/ui-deliverables/src/client/ProducedFiles.tsx`
- `packages/client/ui-settings-general/src/client/index.ts`
- `tests pending discovery`

**Status:** ⚠️ Implementation Complete / Validation Blocked

**Results:** Coder implemented and pushed commit `ea1b25f149` (`Fix trusted-host native UI parity`). The code update addresses Settings General `settings.openDocument` controller availability and Produced Files **Show in folder** visibility for trusted hosts, with matching Agent Note/i18n updates. Focused package tests, the connection `node-half.host.spec.ts`, targeted translation/Agent Note/link checks, package bundles, `git diff --check`, and `git diff --cached --check` passed. Live DSH web probing was not feasible from the coder handoff because `pnpm dsh web --help` fails on local `~/.dsh/.env` `DSH_RELEASE_PACKAGE` policy and the observed `127.0.0.1:3080` process was another app. The bead remains open because broader requested validation is not clean: `pnpm run test:gui` fails in pre-existing/adjacent remote-browser process-local specs (`ui-settings-models` apply and `ui-theme` apply), and `pnpm run doc-sync` fails on unrelated dirty `plugins/openclaw-workspace-file-viewer/README.md` bilingual pairing. Unrelated workspace-viewer dirty files remain in the worktree and were not touched.

### Task 8: Triage UI Parity Validation Blockers

**Bead ID:** `oc-9ih`
**SubAgent:** `primary`
**Role:** `qa`
**References:** `REF-01`, `REF-02`, `REF-03`
**Prompt:** You are the `qa` role on the `primary` lane. Work in `/home/derrick/.openclaw/workspace/projects/deepseek-harness` and read that repo's `README.md` before touching files. This task is bead `oc-9ih`; claim it on start with `bd update oc-9ih --status in_progress --json`. Validate whether the `pnpm run test:gui` failures in remote-browser process-local specs and the `pnpm run doc-sync` failure from the unrelated workspace-viewer README are pre-existing, already-owned by another active plan, or required cleanup for this parity plan before `oc-j50` and audit `oc-3g0` can close. Also attempt live local/Tailscale UI affordance probes against the running Chip DSH service if feasible without destructive host actions. Do not edit unrelated workspace-viewer files unless a new bead explicitly authorizes that cleanup. Close `oc-9ih` only if the blockers are classified with evidence and the next action is clear; otherwise leave it open with exact notes.

**Folders Created/Deleted/Modified:**
- None

**Files Created/Deleted/Modified:**
- None

**Status:** ✅ Complete

**Results:** QA completed and closed `oc-9ih`. The triage classified the remaining `oc-j50` validation failures with evidence and created three follow-up blockers linked to `oc-j50`: `oc-761` for refreshing the running Chip DSH served bundles because the live service still serves old `connection.isLoopback` UI gates; `oc-wdk` for updating two stale remote-browser GUI tests in `ui-settings-models` and `ui-theme`; and `oc-587` for unrelated workspace-viewer README bilingual pairing that blocks broad `doc-sync`. Focused `oc-j50` tests passed for `ui-deliverables`, `ui-settings-general`, and `packages/client/connection/tests/node-half.host.spec.ts`; `pnpm run test:gui` failed only 2 tests out of 3758; `pnpm run doc-sync` failed only on `plugins/openclaw-workspace-file-viewer/README.md` translation pairing; non-destructive `/api/settings.openDocument` and `/api/host.openPath` probes returned `404` instead of `403` on loopback and Tailscale. Live DOM/bundle probing found the running service still lacks the trusted-host UI affordances because it is serving old bundles.

---

## Final Results

**Status:** ⚠️ Partial / Blocked

**What We Built:** Source-level trusted-host parity was implemented and pushed for the shared `/api` trust fence, including settings, credentials, host/native routes, model discovery, preset authoring, and the client UI source for Settings General `settings.openDocument` plus Produced Files **Show in folder**. Documentation cleanup landed for the core API policy and related active Agent Notes.

**Reference Check:** `REF-01`, `REF-02`, `REF-03`, `REF-04`, `REF-05`, and `REF-06` were updated or validated through the pushed source commits. Final audit is blocked because the running Chip DSH service still serves stale UI bundles and broad validation has explicit follow-up blockers.

**Commits:**
- `9777d79c09` - `Allow trusted hosts full API parity`
- `f6e162a8e2` - `docs: align trusted-host API parity prose`
- `546abfbb2b` - `docs: update preset authoring trust parity`
- `1bef9206c4` - `docs: update native picker trust note`
- `ea1b25f149` - `Fix trusted-host native UI parity`

**Lessons Learned:** Full remote/local parity is source-level DSH work, not hotswap-only. Future DSH upgrades need to port both the shared `/api` trust-fence change and the UI affordance changes, then refresh the running service bundles before live parity can be claimed.

**Open Follow-Up Beads:**
- `oc-761` - Refresh Chip DSH served bundles for UI parity probe.
- `oc-wdk` - Align remote-browser settings GUI tests with trusted-host parity.
- `oc-587` - Add bilingual pairing for workspace viewer README.
- `oc-j50` - Remains in progress and blocked by the three follow-ups above.
- `oc-3g0` - Audit remains in progress until `oc-j50` closes and audit reruns.

---

*Last updated on 2026-08-19*
