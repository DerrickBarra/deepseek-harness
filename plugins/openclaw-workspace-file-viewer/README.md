# @openclaw/dsh-workspace-file-viewer

English | [中文](README.zh.md)

Installable DSH Web profile bundle for allowlisted local folder browsing. The host half exposes a Typert Remote namespace, `workspaceFileViewer`, with `roots`, `list`, and `read` methods. The browser half mounts that Remote contribution, registers the `sidebar.footer.action` button, and opens a `shell.overlay` file viewer panel.

Install it through the profile plugin manager from this checkout:

```sh
pnpm dsh plugin --profile web add ./plugins/openclaw-workspace-file-viewer
```

The package declares `dsh.bundle.patch` and contributes row `openclaw-workspace-file-viewer` through `cordis.patch.yml`.

## Configuration

Override the row from a later profile or home `cordis.patch.yml` layer:

```yaml
- id: openclaw-workspace-file-viewer
  config:
    roots:
      - path: /home/derrick/.openclaw/workspace/
        label: OpenClaw workspace
    maxFileBytes: 262144
```

The default root is `/home/derrick/.openclaw/workspace/`, which matches the OpenClaw operational workspace used during the Chip spike. DSH's own workspace registry groups sessions by cwd and does not replace this durable OpenClaw home folder.

## Model Experience

### Browser chrome

#### What the model sees

Nothing. This package registers only browser chrome and a browser-facing `workspaceFileViewer` Remote service. It registers no tools, prompt sections, or session events.

#### Token effect

Zero direct tokens on every request.

#### KV Cache effect

None. The file viewer never touches model requests.

## Known Limitations and Deferred Work

- HTML files are listed as readable text only; sandboxed rendered preview is tracked outside this package change by OpenClaw bead `oc-hs4`.
