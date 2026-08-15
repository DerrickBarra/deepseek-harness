# @deepseek-ai/dsh-client-ui-workspace-file-viewer

English

Browser UI for the workspace file viewer. The plugin registers a `sidebar.footer.action` button and a `shell.overlay` panel. It lists directories through `ctx.remote.workspaceFileViewer`, renders Markdown with the existing safe `MarkdownText` primitive, and renders supported plain text files as escaped text.

## Installation

The Web bundle mounts this package as row `ui-workspace-file-viewer` and the Host Remote as `workspace-file-viewer`. From the DSH source checkout:

```sh
pnpm --filter @deepseek-ai/dsh-host-workspace-file-viewer build
pnpm --filter @deepseek-ai/dsh-client-ui-workspace-file-viewer bundle
DSH_HOME=/home/derrick/.openclaw/workspace/.temp/dsh-chip-spike/dsh-home pnpm dsh web --host 127.0.0.1 --port 3081
```

Override the allowlist in `DSH_HOME/profiles/web/cordis.patch.yml` or the home-level `DSH_HOME/cordis.patch.yml`:

```yaml
- id: workspace-file-viewer
  config:
    roots:
      - path: /home/derrick/.openclaw/workspace/
        label: OpenClaw workspace
    maxFileBytes: 262144
```

## Model Experience

### Sidebar file viewer UI

#### What the model sees

Nothing. This plugin only renders browser UI and calls `ctx.remote.workspaceFileViewer`.

#### Token effect

Zero direct tokens on every request.

#### KV Cache effect

None. The file viewer never touches model requests.

## Known Limitations and Deferred Work

- HTML files render as escaped source text; sandboxed rendered preview is tracked outside this package change by OpenClaw bead `oc-hs4`.
