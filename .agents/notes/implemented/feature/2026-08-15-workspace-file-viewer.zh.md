# Agent Note: 工作区文件查看器

Status: implemented

[English](2026-08-15-workspace-file-viewer.md) | 中文

## Problem

Web UI 可以创建和浏览 DSH 工作区，但没有一个小型本地文件读取表面来查看不属于 DSH 会话的运维产物。OpenClaw 部署把计划、交接、仓库检出和临时证据放在 `/home/derrick/.openclaw/workspace/` 下；当人只需要在浏览器里查看这些文件时，让模型读取它们是不合适的交互。复用面向模型的文件系统工具还会把人工浏览和工具权限、提示词可见输出、会话日志混在一起。

该功能需要宿主侧信任决策，因为浏览器不能安全地读取任意本地文件。只有客户端组件和直接路径要么会在浏览器中失败，要么会把 API 网关变成环境级文件系统端点。首版还必须明确 HTML 的处理方式：除非先设计好沙箱策略，否则在应用内渲染本地 HTML 可能执行脚本或取得应用源权限。

## Decision

查看器作为可安装的 DSH profile bundle `@openclaw/dsh-workspace-file-viewer` 发布，而不是由内置 Web 组合包挂载。该包声明指向自身 `cordis.patch.yml` 的 `dsh.bundle.patch`；该 patch 插入 `openclaw-workspace-file-viewer` 行，其宿主半部拥有 Remote 命名空间 `workspaceFileViewer`，提供 `roots`、`list` 和 `read`。它的 `roots` 配置是已存在目录的 allowlist，默认值为 `/home/derrick/.openclaw/workspace/`；`maxFileBytes` 默认值为 262144。该服务用 `realpath` 规范化配置根，只接受相对请求路径，在使用前再次用 `realpath` 解析最终目标，并拒绝离开所选根的遍历或符号链接目标。目录列表包含普通目录和文件，把受支持文本扩展名标为可读，并让目录排在文件前面。文件读取要求受支持文本扩展名、普通文件和配置的字节上限。

同一个包的浏览器半部挂载生成的 Remote contribution，注册一个 `sidebar.footer.action` 按钮和一个 `shell.overlay` 面板。面板调用 `ctx.remote.workspaceFileViewer`，通过现有 `MarkdownText` primitive 渲染 Markdown，并在 `<pre>` 中渲染纯文本，因此类似 HTML 的内容会被 React 转义。客户端不保留持久文件浏览状态，也不写入会话事件，因为该功能只属于浏览器 chrome；没有内容进入模型请求。

HTML 渲染预览保持延期。这些包把 `.html` 列为可读文本，但渲染预览需要 iframe/CSP/sandbox 设计，防止本地内容执行有应用权限的代码或扩大文件系统访问。本工作作为 OpenClaw 后续 bead 跟踪，而不是藏在一个不完整实现里。

## Alternatives considered

**使用现有面向模型的文件系统工具。** 被否决，因为人工文件浏览不应为了查看一个计划而消耗 token、追加会话事件或把文件内容暴露给模型。工具层仍用于 agent 工作；这个表面只属于浏览器。

**把查看器锚定到 DSH 工作区而不是显式 allowlist。** 被否决，因为 DSH 工作区标识会话 cwd 和工作区账户，而不是 OpenClaw 运维主目录。可配置 allowlist 以后仍可包含 DSH 工作区目录，而不必把该模型硬编码进文件查看器。

**立即渲染 HTML。** 被否决，因为安全 HTML 预览是安全设计，不是显示开关。转义的源码文本今天就有用，并且不会把应用源授予本地 HTML。

**把浏览器 UI 放进现有 `ui-workspace` 包。** 被否决，因为该功能浏览任意 allowlist 根，而不是 DSH 工作区账户或会话列表。独立的侧边栏底部动作保持了工作区/会话区域的所有权。

## Consequences

内置 Web 组合包不再挂载查看器。OpenClaw 部署通过 `dsh plugin --profile web add ./plugins/openclaw-workspace-file-viewer` 或等价包 spec 启用它，之后 profile 或 home patch 可以替换 `openclaw-workspace-file-viewer` 行配置。默认根有意针对 OpenClaw Chip spike 的部署。

API 表面很窄：三个 Remote 方法，负责 allowlist 下的本地文本读取。但它仍然是本地文件暴露表面，所以未来变更必须把路径检查保留在解析并读取文件的宿主服务操作中。客户端过滤、禁用行或扩展名检查本身不是 enforcement。

该功能把浏览器验证加入 web e2e lane，因为首次运行的 onboarding 会让应用在侧边栏控件可点击之前进入 inert 状态。测试会关闭 onboarding，用临时 allowlist patch 启动真实 `dsh web` 进程，打开侧边栏文件查看器，浏览 fixture 计划文件，并验证 Markdown 标题已渲染。
