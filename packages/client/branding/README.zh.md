# @deepseek-ai/dsh-client-branding

[English](README.md) | 中文

无 React 依赖的浏览器产品标识服务。服务发布包含品牌类型 `BrandingSourceId`、`displayName`、`productTitle` 和可选图片 URL 的不可变快照。贡献以来源为键，最后注册的贡献生效，每次注册都会返回替换安全的 disposer。移除当前贡献后会显露前一个贡献；没有贡献时恢复发行版默认值（`DeepSeek Harness` 与发行版自带矢量图形）。

浏览器插件通过 `ctx.effect(() => ctx.branding.register(source, definition), label)` 管理贡献生命周期。`/client` Loader 入口的运行时值仅导出 `apply` 与 `name`；服务和快照约定只作类型导出。产品标识只携带普通数据，不携带组件：应用外壳把 `productTitle` 投影到文档标题，侧边栏与空会话 Hero 通过框架绑定的快照读取值；`iconUrl` 缺省时继续使用 `BrandWordmark` 与 `FishLogo`。PWA manifest 图标仍由现有 Web 构建拥有，本服务不会更改它们。

## 模型体验

无。产品标识仅改变浏览器呈现，不会进入模型请求。

#### KV Cache 影响

无；该包既不组装也不发送提供方请求。

## 已知限制与暂缓事项

- **图片加载遵循浏览器行为**：服务仅携带 URL 数据，不代理、缓存、缩放或验证图片字节。
