# Agent Note: Workspace file viewer

Status: implemented

English | [中文](2026-08-15-workspace-file-viewer.zh.md)

## Problem

The Web UI could create and browse DSH workspaces, but it had no small local-file reading surface for operational artifacts that are not DSH sessions. OpenClaw deployments keep plans, handoffs, repo checkouts, and scratch evidence under `/home/derrick/.openclaw/workspace/`; asking a model to read those files is the wrong interaction when the human only needs to inspect them from the browser. Reusing the model-facing filesystem tools would also mix human browsing with tool permissions, prompt-visible output, and session logging.

The feature needed a host-side trust decision because the browser cannot read arbitrary local files safely. A plain client component with direct paths would either fail in the browser or turn the API gateway into an ambient filesystem endpoint. The first version also needed a clear answer for HTML: rendering local HTML inside the app can execute script or reach app-origin privileges unless the sandbox policy is designed up front.

## Decision

Ship the viewer as an installable DSH profile bundle, `@openclaw/dsh-workspace-file-viewer`, rather than a row in the shipped Web bundle. The package declares `dsh.bundle.patch` pointing at its `cordis.patch.yml`; that patch inserts row `openclaw-workspace-file-viewer`, whose host half owns the Remote namespace `workspaceFileViewer` with `roots`, `list`, and `read`. Its `roots` config is an allowlist of existing directories and defaults to `/home/derrick/.openclaw/workspace/`; `maxFileBytes` defaults to 262144. The service canonicalizes configured roots with `realpath`, accepts only relative request paths, resolves each final target with `realpath` before use, and rejects traversal or symlink targets outside the selected root. Directory listings include regular directories and files, mark supported text extensions readable, and sort directories before files. File reads require a supported text extension, a regular file, and the configured byte limit.

The same package's browser half mounts the generated Remote contribution, registers a `sidebar.footer.action` button, and registers a `shell.overlay` panel. The panel calls `ctx.remote.workspaceFileViewer`, renders Markdown through the existing `MarkdownText` primitive, and renders plain text in a `<pre>` so HTML-like content is escaped by React. The client does not keep a durable file-browser state or write session events because the feature is browser chrome only; nothing reaches a model request.

HTML rendered preview stays deferred. The packages list `.html` as readable text, but a rendered preview needs an iframe/CSP/sandbox design that prevents local content from executing privileged app code or widening filesystem access. That work is tracked outside this change as an OpenClaw follow-up bead rather than hidden behind a partial implementation.

## Alternatives considered

**Use the existing model-facing filesystem tools.** Rejected because a human file browser should not spend tokens, append session events, or expose file content to the model merely to inspect a plan. The tool layer remains for agent work; this surface is browser-only.

**Anchor the viewer to DSH workspaces instead of an explicit allowlist.** Rejected for the first implementation because DSH workspaces identify session cwd and workspace accounts, not the OpenClaw operational home folder. A configurable allowlist can include DSH workspace directories later without hardcoding that model into the file viewer.

**Render HTML immediately.** Rejected because safe HTML preview is a security design, not a display toggle. Escaped source text is useful today and does not grant local HTML the app origin.

**Put the browser UI inside the existing `ui-workspace` package.** Rejected because the feature browses arbitrary allowlisted roots, not DSH workspace accounts or session lists. A separate sidebar footer action keeps the workspace/session region's ownership intact.

## Consequences

The shipped Web bundle no longer mounts the viewer. OpenClaw deployments opt in through `dsh plugin --profile web add ./plugins/openclaw-workspace-file-viewer` or an equivalent package spec, and later profile or home patches can replace the `openclaw-workspace-file-viewer` row config. The default root is intentionally deployment-specific to the OpenClaw Chip spike.

The API surface is narrow: three Remote methods over allowlisted local text reads. It is still a local-file exposure surface, so future changes must keep path checks at the host service operation that resolves and reads files. Client filtering, disabled rows, or extension checks alone are not enforcement.

The feature adds browser validation to the web e2e lane because first-run onboarding can make the app inert before sidebar controls are clickable. The test dismisses onboarding, boots a real `dsh web` process with a temporary allowlist patch, opens the sidebar file viewer, browses a fixture plan file, and verifies Markdown headings render.
