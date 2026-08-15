# @deepseek-ai/dsh-host-workspace-file-viewer

English

Allowlisted local folder browsing for the Web sidebar file viewer. The plugin exposes a Typert Remote namespace, `workspaceFileViewer`, with `roots`, `list`, and `read` methods. It canonicalizes every configured root with `fs.realpath`, accepts only relative request paths, resolves the final target again before use, and rejects traversal or symlinks that leave the configured allowlist.

## Configuration

The Web bundle mounts this package as row `workspace-file-viewer`. Override it from a profile or home `cordis.patch.yml`:

```yaml
- id: workspace-file-viewer
  config:
    roots:
      - path: /home/derrick/.openclaw/workspace/
        label: OpenClaw workspace
    maxFileBytes: 262144
```

The default root is `/home/derrick/.openclaw/workspace/`, which matches the OpenClaw operational workspace used during the Chip spike. DSH's own workspace registry groups sessions by cwd and does not replace this durable OpenClaw home folder.

## Model Experience

### Browser Remote service

#### What the model sees

Nothing. This package registers only the browser-facing `workspaceFileViewer` Remote service. It registers no tools, prompt sections, or session events.

#### Token effect

Zero direct tokens on every request.

#### KV Cache effect

None. The file viewer never touches model requests.

## Known Limitations and Deferred Work

- HTML files are listed as readable text only; sandboxed rendered preview is tracked outside this package change by OpenClaw bead `oc-hs4`.
