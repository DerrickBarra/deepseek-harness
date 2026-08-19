# @openclaw/dsh-workspace-file-viewer

[English](README.md) | 中文

用于浏览 allowlist（允许列表）中本地文件夹的可安装 DSH Web profile bundle（配置组合包）。宿主侧公开一个 Typert Remote 命名空间 `workspaceFileViewer`，包含 `roots`、`list` 和 `read` 方法。浏览器侧挂载该 Remote 贡献，注册 `sidebar.footer.action` 按钮，并打开一个 `shell.overlay` 文件查看器面板。

通过此 checkout（检出目录）中的 profile plugin manager（配置插件管理器）安装：

```sh
pnpm dsh plugin --profile web add ./plugins/openclaw-workspace-file-viewer
```

该包声明 `dsh.bundle.patch`，并通过 `cordis.patch.yml` 贡献 `openclaw-workspace-file-viewer` 行。

## 配置

从后续 profile 或 home `cordis.patch.yml` 层覆盖该行：

```yaml
- id: openclaw-workspace-file-viewer
  config:
    roots:
      - path: /home/derrick/.openclaw/workspace/
        label: OpenClaw workspace
    maxFileBytes: 262144
```

默认根目录是 `/home/derrick/.openclaw/workspace/`，与 Chip spike 期间使用的 OpenClaw 操作工作区一致。DSH 自身的工作区注册表按 cwd 对会话分组，不能替代这个持久 OpenClaw home 文件夹。

## 模型体验

### 浏览器 chrome

#### 模型看到什么

没有内容。此包只注册浏览器 chrome 和一个面向浏览器的 `workspaceFileViewer` Remote 服务。它不注册工具、提示词区段或会话事件。

#### Token 影响

每次请求的直接 token 为零。

#### KV Cache 影响

无。文件查看器不会触碰模型请求。

## 已知限制和暂缓工作

- HTML 文件只列为可读文本；沙箱化渲染预览由 OpenClaw bead `oc-hs4` 在此包变更之外跟踪。
