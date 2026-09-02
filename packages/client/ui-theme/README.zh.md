# @deepseek-ai/dsh-client-ui-theme

[English](README.md) | 中文

主题插件：基于 --dsw-* token 基础样式表（静态尺度 + 别名语义层）的 ThemeRuntime。服务拥有两个彼此独立的持久化轴：`light`／`dark`／`system` 选择明暗模式，品牌类型 `ThemePaletteId` 则选择成对的浅色／深色语义 token 覆盖。已注册配色方案是可撤销的浏览器贡献，但所选 id 独立持久化；注册消失时界面显示默认配色而不删除持久化 id，重新注册后会自动恢复。内置“自定义”配色为每个模式保存六个严格 `#RRGGBB` 语义值（强调色、应用背景、浮层表面、侧边栏、主要文字、次要文字），通过支持键盘导航的“浅色”和“深色”标签页编辑，并在切换标签页时保留成对草稿；预览、保存、重置与取消仍然可用，且不显示对比度警告。不可变 `ThemeSnapshot` 通过 `theme/change` 发布，ui-layout 将解析后的快照应用到 DOM。该持久化边界由[Host settings 支撑的偏好决策](../../../.agents/notes/implemented/bug-fix/2026-08-06-host-backed-web-preferences.md)拥有。

当主机组合包含 HTTP 服务器时，主机侧紧接 `<body>` 起始标签注入同步引导代码。每份 index 响应会嵌入持久化明暗偏好、所选配色方案 id 与自定义值；浏览器先解析 `system`、选择基础 token 表，并在选择“自定义”时于外壳加载页渲染前应用其别名。仅存在于浏览器中的已注册配色方案在插件激活前显示默认配色。不含 HTTP 服务器的组合不受影响，激活后 ThemeRuntime 与 ui-layout 仍是权威来源。

`src/styles/` 下有五张样式表，全部由 web 壳的 `base.css` 导入：`base.css`、`design-platform.css`、`scrollbar.css`、`gradient-shadow-text.css` 与 `shiki.css`。`scrollbar.css` 是 `--dsw-alias-scrollbar-*` token 的唯一消费方，必须排在声明这些 token 的 `design-platform.css` 之后。

滚动条重新绑定约定：`scrollbar.css` 在 `body` 上把 `--dsh-scrollbar-thumb` 与 `--dsh-scrollbar-thumb-hover` 绑定到 l1（基础表面）token，两条渲染路径都读取这一组变量。高层级表面（菜单、浮层、对话框）在自己的容器上设置 `--dsh-scrollbar-thumb: var(--dsw-alias-scrollbar-bg-l2)` 与 `--dsh-scrollbar-thumb-hover: var(--dsw-alias-scrollbar-hover-l2)`；一次重新绑定即可为引擎实际走的那条路径换色。这组变量的另一个合法目标是 `transparent`，即完全不绘制滑块——[ui-sidebar](../ui-sidebar/README.md) 在指针不在栏内时就这样重新绑定自己的列。绑回 l1 那组不算重新绑定，它只是重述基础表面的默认值。`--dsh-scrollbar-width` 镜像 WebKit 滚动条的布局宽度，供需要与占布局宽度的滚动条对齐的表面使用——[ui-conversation](../ui-conversation/README.md) 用它作为覆盖 composer 座位 `right` 偏移——scrollbar-styles 规格把它与镜像规则及消费者配对检查。

两条路径在构造上互斥。`scrollbar-width`／`scrollbar-color` 写在 `@supports not selector(::-webkit-scrollbar)` 之内，因为这两个属性中的任一个只要取非 `auto` 值，Chromium 与 Safari 就会丢弃该元素上的全部 `::-webkit-scrollbar*` 规则，`::-webkit-scrollbar-thumb:hover` 也在其中——若无条件地同时声明，`--dsh-scrollbar-thumb-hover` 在任何引擎上都不会被渲染。因此 Firefox 走标准属性，WebKit 系引擎走伪元素，hover token 只经由伪元素这条路径渲染。相关原理与实测计算值见[滚动条 Agent Note](../../../.agents/notes/implemented/bug-fix/2026-07-28-themed-scrollbars-and-reserved-gutter.md)。

## 模型体验

无。主题服务管理浏览器偏好；这里没有任何内容进入模型请求。

#### KV Cache 影响

无；该包既不组装也不发送提供方请求。

## 已知限制与暂缓事项

- **仅浏览器配色方案在引导阶段显示默认值**：Host 无法应用只存在于后续浏览器插件图中的注册，因此刷新时可能先显示默认配色，待该注册激活后再切换。
- **token 样式表是颜色值的唯一权威来源**：会有意不补入 cssdesign 中缺失的值（例如设计中的 #4176E6 标签页蓝色）；一律采用最接近的语义 token。设计负责人批准的新增值是例外：须在同一变更中以一个静态尺度层级与一个语义别名的形式进入（`--dsw-static-blue-900` / `--dsw-alias-label-primary-bluish`）。
