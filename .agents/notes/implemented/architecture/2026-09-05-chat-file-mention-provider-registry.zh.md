# Agent Note: Chat 拥有可叠加的文件提及 provider registry

Status: implemented

[English](2026-09-05-chat-file-mention-provider-registry.md) | 中文

## 问题

可点击的行内代码文件提及依赖由 ui-deliverables 整体提供的单一可选 `chatFileMentions` service。第二个功能只能替换该 service，无法与 deliverables 同时贡献；provider 延迟挂载或 HMR reload 也不会让已定稿 Markdown 失效。若把文件匹配或打开行为移进 Chat，Chat 又会依赖功能专属的文件词表与 opener policy。

## 决定

ui-chat 拥有可叠加的具名 provider registry `ctx.chatFileMentions`。每个公开 `ChatFileMentionProvider` 提供 live 状态下唯一的 `name`、默认值为 `0` 的可选数字 `priority`，以及 `forClosing(owner)`。`register()` 把贡献绑定到调用方 Cordis effect，返回幂等 disposer，并拒绝重复的 live 名称。roster 按优先级升序排列，同优先级保持注册顺序。

`forClosing()` 按 roster 顺序让 provider 为收尾 Turn 准备 resolver。返回 `undefined` 只拒绝该 Turn。接受后的 resolver 针对每个行内代码 token 以相同顺序运行，未解析 token 会继续交给下一个 resolver。provider 初始化与解析异常会记录日志并跳过，因此一个 provider 无法压制后续贡献方。匹配结果会原样通过，包括 provider 自己拥有的点击 opener；registry 不定义全局 opener。

registry 发布由 provider 名称与优先级组成、identity 稳定的有序 observable snapshot。Chat 通过其注册拥有的 hook 绑定该 source，并把 snapshot 纳入收尾消息 resolver identity，因此加入或释放 provider 会重新渲染已定稿消息，而普通 transcript 追加仍保留缓存的 Markdown parse。该状态只属于 Client presentation，不增加 Session、wire、schema 或模型可见数据。

ui-deliverables 以优先级 `0` 注册 stock `deliverables` provider。其成功修改词表、精确路径与唯一 basename 匹配、本地化标签、opener callback、产出文件行和模型指引均保持不变。

## 考虑过的替代方案

- **保留单一可替换 service provider。** 实现最小，但不相关文件词表会互斥，而且 provider 生命周期变化后已定稿渲染仍会过期。
- **通过 registry 传递一个全局 opener。** 否决，因为 provider 可能面向不同资源或 authority；保留返回结果中的 opener 能让匹配与动作 policy 由同一 owner 掌握。
- **把 provider 路径合并成 Chat 拥有的单一词表。** 否决，因为 Chat 会被迫理解功能专属路径语义，并丢失逐 provider 的拒绝、fallback、标签和动作。
- **每次 transcript 更新都重新计算。** 否决，因为仅有后续流式或 transcript 数据变化时，已定稿 Markdown 应继续复用缓存；provider roster 才是精确的失效输入。

## 后果

多个独立加载的功能可以增加收尾消息文件提及，而无需替换 deliverables。优先级提供确定仲裁，同优先级注册保持稳定；异常得到隔离，Cordis 释放/HMR 只移除调用方自己的贡献。公开 snapshot 只暴露名称与优先级，不暴露 resolver 函数，从而保留可序列化的渲染失效值。聚焦 registry 测试固定排序、拒绝、fallback、异常隔离、重复名称、发布、幂等释放与调用方 fiber teardown；Chat component coverage 固定已定稿消息重新渲染，正式 Web 组合测试继续固定 deliverables 行为。
