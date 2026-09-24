# Agent Note：提供方 profile 通过 payload 钩子注入 OpenAI 频率惩罚

Status: implemented

[English](2026-09-24-pi-ai-frequency-penalty-payload.md) | 中文

## 问题

pi-ai 0.82.1 的 `SimpleStreamOptions` 和 OpenAI-completions 请求构建器都未公开 `frequency_penalty`。因此，使用 OpenAI 兼容本地推理服务器的部署无法通过 `dsh-llm-pi-ai` 调整重复倾向，尽管 pi-ai 在派发前提供了与提供方无关的 `onPayload` 钩子。

## 决策

pi-ai 提供方 profile 可以声明 -2 到 2 范围内的 `frequencyPenalty`。只有路由上的每个模型都使用 `openai-completions` 时，profile 解析才接受该值。适配器提供一个 `onPayload` 回调，返回生成的请求正文并将 `frequency_penalty` 设为配置值。省略此设置时，pi-ai 的 payload 保持不变。

该设置属于路由 profile，而不是 `GenerateOptions`：它是单个端点的部署策略，不是每轮模型控制。它位于 `compat` 之外，因为 pi-ai 兼容字段会复制到有类型的模型兼容记录中，而此值是请求参数。

## 考虑过的替代方案

**修改或派生 pi-ai 的 OpenAI 请求构建器。** 否决：现有 payload 钩子可以承载这个部署专用参数，无需拥有上游派生版本。

**把值放入 `compat`。** 否决：`compat` 配置合并到每个模型的端点能力开关。`frequency_penalty` 是请求值；添加未知兼容键会削弱围绕 pi-ai 兼容类型的编译期漂移检查。

**公开任意请求正文字典。** 否决：这会绕过每个请求字段的协议所有权与 schema 验证。窄化的类型化选项可以证明其协议、范围和线路拼写。

## 后果

OpenAI-completions 路由可以对每个请求（包括重试）应用一个经过验证的重复惩罚。其他协议会让 profile 解析失败，而不是静默丢弃设置。payload 钩子会复制请求对象，因此不会原地修改 pi-ai 生成的正文。如果未来 pi-ai 版本增加类型化频率惩罚选项，可以在保留 profile 字段的同时替换该钩子。
