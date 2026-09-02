# Agent Note: 插件激活前的主题引导

Status: implemented

[English](2026-08-10-pre-plugin-theme-bootstrap.md) | 中文

## 问题

Web 壳在浏览器侧插件树激活前呈现 `Loading plugins…`。主题 token 已随壳样式加载，但 `color-scheme` 和 `body[data-ds-dark-theme]` 要等 ui-theme 的 ThemeRuntime 与 ui-layout 的 ThemePresenter 激活后才写入；持久化偏好为深色时，加载页因此先按浅色调色板绘制，再切为深色。

`dshClient.immediately` 只把 bundle 纳入第一阶段预取，不会让插件在 HTML 解析或壳首次渲染前执行。仅调整客户端插件的加载档位无法关闭这段时间窗口。

## 决策

ui-theme 的主机侧通过 `ctx.webServer.tapIndex()` 转换每份 index HTML，在 `<body>` 起始标签后紧接一段同步内联脚本。该转换通过可选的 `httpServer` 注入注册，因此不含该服务的组合仍会激活 ui-theme，但不会安装转换。HTML 解析器执行该脚本时，body 已存在，而壳的模块脚本与 React 根节点尚未运行。

settings provider 存在时，主机侧会注册 [`ui-theme` settings 分节](2026-08-06-host-backed-web-preferences.md)。它为每份 index 响应嵌入经过 schema 校验的明暗偏好、所选配色方案 id 与自定义语义值；不存在 settings provider 或有效注册时则嵌入发行版默认值。浏览器通过 `prefers-color-scheme` 解析 `system`，不支持 `matchMedia` 时回退为浅色。脚本写入 ThemePresenter 后续拥有的明暗 DOM 状态，并在选择“自定义”时写入相同的六个别名 token 变量。

引导逻辑认识内建的 `light`、`dark`、`system` 语义与内建“自定义”配色。它不注册监听器，也无法解析只由浏览器插件注册的配色方案；这类配色在注册激活前使用默认值。浏览器侧插件树激活后，ThemeRuntime 仍是主题状态的权威来源，ThemePresenter 会把完整解析结果重新写入同一组 DOM 状态并负责后续更新与释放。

## 验证

ui-theme 的单元测试覆盖不含任一可选 Host 服务时的激活、脚本位置、Host 设置优先级、系统偏好、缺少 `matchMedia`、不含 body 的输入、实时读取 settings，以及 Host 注册随插件 fiber 一同释放。真实 Web 组合的 Chromium 场景会选择持久化深色偏好并拦住插件 bundle 请求，使加载页保持可观察，再断言 index 响应产生了深色背景、body 属性和根元素 `color-scheme`。该变化不改变可访问性树，因此不产生新的页面 golden。

## 考虑过的替代方案

**把逻辑固定写进 `apps/web/index.html`。** 这样能在相同时机执行，但静态 HTML 无法嵌入当前 Host 设置，还会复制 ui-theme 拥有的偏好解析和 DOM 字段；Host 转换会跟随主题插件的生命周期，并让应用壳无需了解主题领域。

**让 ui-theme 客户端 bundle 同步或更早激活。** `immediately` 只控制预取，插件实例化仍发生在壳开始运行之后；把首次渲染阻塞到 ThemeRuntime 激活会延后可见的加载与报错界面，也会让壳的故障呈现依赖被它监测的插件树。

**只依赖 `prefers-color-scheme` 的 CSS。** 媒体查询无法读取显式持久化选择，因此操作系统为浅色而用户选择深色时仍会闪烁。

**在 `<head>` 中执行并给 html 添加临时类。** body 此时尚不存在，还需要一套与正式调色板属性不同的临时选择器。紧接 `<body>` 是能够直接写正式 DOM 字段的最早解析位置。

## 后果

加载页首帧与持久化明暗偏好及“自定义”配色一致；未组合 settings provider 时则采用系统偏好与默认配色。index 转换会为每份响应读取 Host settings。偏好语义、自定义别名或 ThemePresenter DOM 字段变化时，必须同时更新脚本与 ThemeRuntime。浏览器注册的配色方案仍要等插件激活后才应用；加载期间，页面在所选浅色或深色基础上使用默认配色。
