# Agent Note: Pack-only prerelease baseline identities

Status: implemented

English | [中文](2026-09-04-pack-only-prerelease-baselines.zh.md)

## Problem

The commit-addressed baseline packer derives a unique package-family version from the workspace root version, a UTC timestamp, and the target commit. Its stable-only base requirement rejects historical commits whose complete package family already uses a prerelease version. Concatenating the existing stable algorithm after that prerelease would introduce a second hyphen and would not produce a valid SemVer version.

The combined `release` command and manifest-driven `publish` command can change registry state. A local exception needed for immutable candidate construction must not weaken those publication entry points or the default stable-version requirement.

## Decision

`publish-npm-baseline.ts pack --allow-prerelease-base` is the only command form that opts into a prerelease workspace base. The option accepts strict SemVer prereleases and appends the timestamp and short commit as dot-separated identifiers in the existing prerelease segment. For example, base `0.1.0-rc.5` produces `0.1.0-rc.5.<timestamp>.<commit>`. Build metadata, when present on a prerelease base, remains at the end.

Stable bases keep the existing `<base>-<timestamp>-<commit>` version and `dev-<base>` dist-tag exactly. Prerelease bases use `dev-<core>-<prerelease>`; this restricted character set is a valid npm tag and cannot be parsed as a SemVer version. Every staged package and internal dependency pin still receives the one planned version, and the tarball manifest and installed-consumer probes still verify that identity.

Release manifest schema 2 records separately versioned scoped dependencies in deterministic `externalPackages` rows containing `name`, exact `version`, and the distinct staged dependency `ranges`. A scoped dependency absent from baseline tarballs qualifies only when a same-name package exists in the repository workspace outside the baseline package patterns. Creation derives the rows from packed manifests and that workspace catalog; loading and verification require the declaration to equal the absent scoped references. External packages are installed at their declared exact versions for consumer probes but do not enter the baseline tarball list, checksums, or publication loop.

The default `pack` path remains stable-only. `release`, `publish`, and `verify` reject `--allow-prerelease-base`; the option does not authorize registry mutation and does not alter manifest-driven publication behavior.

## Alternatives considered

**Mass-bump the historical package family to a stable version.** Rejected because it would modify hundreds of source manifests merely to construct an artifact and would stop the bundle from representing the selected commit.

**Accept every SemVer base by default.** Rejected because it weakens an established publication safeguard and makes prerelease-derived identities implicit.

**Append another hyphen to a prerelease base.** Rejected because SemVer has one prerelease delimiter; additional generated identity belongs in dot-separated prerelease identifiers.

**Teach `release` to accept the option.** Rejected because the recovery use case needs an immutable local package set, not a shortcut around the registry-facing release path.

## Consequences

Historical prerelease commits can produce complete, immutable package-family bundles without source version edits. Operators must request this behavior explicitly on `pack`, and malformed prerelease versions fail before worktree creation or build work. Registry-facing commands retain their existing default version policy and tag checks.
