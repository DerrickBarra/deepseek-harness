# Agent Note: 仅限打包的预发布基线标识

Status: implemented

[English](2026-09-04-pack-only-prerelease-baselines.md) | 中文

## 问题

按 commit 寻址的基线打包器根据 workspace 根版本、UTC 时间戳和目标 commit 派生唯一的包族版本。它只允许稳定基础版本，因此会拒绝整个包族已经使用预发布版本的历史 commit。若直接把现有稳定版算法拼接到该预发布版本之后，就会引入第二个连字符，无法生成有效的 SemVer 版本。

组合式 `release` 命令和由 manifest（元数据清单）驱动的 `publish` 命令能够改变 registry 状态。为构建不可变候选包而设置的本地例外，不得削弱这些发布入口或默认的稳定版本要求。

## 决策

只有 `publish-npm-baseline.ts pack --allow-prerelease-base` 命令形式可以选择预发布 workspace 基础版本。该选项接受严格的 SemVer 预发布版本，并把时间戳和短 commit 作为点分标识符附加到现有预发布段。例如，基础版本 `0.1.0-rc.5` 会生成 `0.1.0-rc.5.<timestamp>.<commit>`。预发布基础版本若包含构建元数据，元数据仍保留在末尾。

稳定基础版本继续原样使用现有 `<base>-<timestamp>-<commit>` 版本和 `dev-<base>` dist-tag。预发布基础版本使用 `dev-<core>-<prerelease>`；这组受限字符能构成有效的 npm tag，且不能被解析为 SemVer 版本。所有暂存包和内部依赖精确版本仍使用同一个规划版本，tarball manifest 和已安装消费方探针仍会验证该标识。

默认 `pack` 路径仍然只允许稳定基础版本。`release`、`publish` 和 `verify` 都拒绝 `--allow-prerelease-base`；该选项不授权 registry 变更，也不改变由 manifest 驱动的发布行为。

## 考虑过的替代方案

**把历史包族批量递增到稳定版本。** 不采用，因为这会仅为构建产物而修改数百个源码 manifest，并使 bundle 无法代表所选 commit。

**默认接受所有 SemVer 基础版本。** 不采用，因为这会削弱既有发布保护，并让预发布派生标识变成隐式行为。

**在预发布基础版本后再附加一个连字符。** 不采用，因为 SemVer 只有一个预发布分隔符；新增的生成标识应放在点分预发布标识符中。

**让 `release` 接受该选项。** 不采用，因为恢复用例需要不可变的本地包集合，而不是绕过面向 registry 的发布路径。

## 后果

历史预发布 commit 可以在不编辑源码版本的情况下生成完整、不可变的包族 bundle。操作者必须在 `pack` 上显式请求该行为，格式错误的预发布版本会在创建 worktree 或执行构建前失败。面向 registry 的命令保留现有默认版本策略和 tag 检查。
