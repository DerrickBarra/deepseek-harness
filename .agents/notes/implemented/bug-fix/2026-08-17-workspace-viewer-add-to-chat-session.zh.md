# Agent Note: Workspace viewer Add to chat 以会话草稿为目标

Status: implemented

[English](2026-08-17-workspace-viewer-add-to-chat-session.md) | 中文

## 问题

workspace file viewer 的 `Add to chat` 动作通过 `ctx.conversation.input` 读写聊天草稿，而该公开 facade 由会话作用域拥有。当 Web app 处于无会话视图时，该动作没有可解析的活跃会话作用域，因此从 viewer 中选择文件或文件夹后，可见 composer 仍为空，并显示没有可用活跃聊天会话。

## 决策

浏览器插件会在写入草稿前解析一个目标会话。如果已有当前会话，动作继续使用它。如果没有当前会话，插件会查找路径最具体且包含所选绝对文件或文件夹路径的 workspace，通过 `ctx.workspaces.connectWorkspace` 将该 workspace 连接到可复用或新建的 blank session，打开返回的会话，并通过该会话的 input facade 写入绝对路径。如果没有 workspace 包含该路径，则 recent workspace 仍作为后备目标；如果无法解析任何目标，仍显示本地化的无会话错误。

overlay 接受异步的 `addToChat` 注入，并通过既有的内联错误栏报告 rejected promise。它只会在草稿插入成功后清除陈旧 viewer 错误，因此连接或作用域失败仍会保持可见。

## 考虑过的替代方案

**继续要求存在活跃会话。** 否决原因：可见产品表面会在选中会话前提供 viewer；一个看起来可用的命令必须填充用户能看到的草稿。

**维护单独的无会话草稿 store。** 否决原因：已交付的 composer 草稿由会话 input machine 拥有。并行 store 需要为 workspace 选择、提交、命令解析、通知、图片和撤销行为建立交接规则。

**启动通用 New Session 流程但不等待会话 id。** 否决原因：`ctx.workspaces.startSession` 有意只拥有导航。文件动作必须知道要修改哪个会话草稿，才能报告成功。

## 后果

该动作可能在插入文本前创建或复用一个 blank workspace session。这与既有 workspace picker 的草稿交接行为一致，并让提交、命令解析和通知继续走标准会话 input 路径。所选路径如果不在已知 workspace 内，可以落入 recent workspace 的 blank session；当 viewer root 比已注册 workspace 列表更宽时，这会保留可见草稿，而不是失败。聚焦客户端测试覆盖了活跃会话插入，以及无当前会话时先创建会话再插入。
