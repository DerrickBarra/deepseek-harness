# Agent Note: Browser Branding and Orthogonal Palette Axes

Status: implemented

English | [中文](2026-09-01-browser-branding-and-palette-axes.zh.md)

## Problem

The Web client previously hardcoded the release wordmark, fish mark, and product title in three render owners, while `ui-theme` treated each registered token set as a concrete light or dark theme. Agent-specific PWA icons already had a separate build-time owner, but browser plugins had no release-owned seam for in-app identity or a durable palette selection independent of Light, Dark, and System.

## Decision

`@deepseek-ai/dsh-client-branding` is an always-composed, React-free browser service. It accepts plain-data contributions keyed by the opaque `BrandingSourceId` and containing `displayName`, `productTitle`, and optional `iconUrl`, publishes immutable revisioned snapshots through `getSnapshot` and `subscribe`, and returns replacement-safe disposers. Its `/client` Loader entry exposes only `apply` and `name` as runtime values; implementation state stays internal. The latest contribution wins; disposal reveals the previous contribution or the release default. Browser plugins own registrations with `ctx.effect`. The app shell, sidebar, and conversation root bind the observable through framework-owned hooks and pass only derived data to presentation components. With no custom URL, the existing `BrandWordmark`, `FishLogo`, and `DeepSeek Harness` title remain the exact defaults. PWA manifest icons remain outside this service.

`ui-theme` keeps `light`, `dark`, and `system` as the color-scheme preference and adds a separate durable `ThemePaletteId`. Each `PaletteDefinition` supplies light and dark values for every token it overrides. Palette registration is reversible, but removing the selected registration does not rewrite settings: the renderer uses Default, marks the snapshot as missing, retains the requested id, and restores it automatically if the id registers again. Registered values and published Custom values are defensively copied and deeply frozen.

Custom is a built-in palette with six semantic roles for each mode: accent, application background, raised surface, sidebar, primary text, and secondary text. Values use strict `#RRGGBB` syntax, and the durable section, Custom object, and each mode object reject unknown fields through the settings registration validator. The editor is contributed through the nested `settings.appearance.item` slot and presents one native-button Light or Dark tab panel at a time, with WAI-ARIA tab state and Arrow, Home, and End keyboard movement. One paired draft survives tab switches and supports native color inputs, direct hex editing, live preview, Save, Reset, and Cancel. Invalid drafts remain visible but cannot preview or save. Preview is a source-keyed token override and is always retracted on Cancel, accepted Save, component teardown, or plugin-fiber disposal. Save writes the complete Custom object and clears the draft only after settings read-back matches. No contrast warning or scoring layer is added.

The Host bootstrap embeds the durable color-scheme preference, palette id, and Custom values. It applies Custom aliases before the loading shell paints when Custom is selected. Browser-only registered palettes intentionally render Default until the client registration activates because the Host does not own their registry.

## Alternatives considered

**Put branding in a slot.** Slots carry rendered composition and would make title projection and multiple default-preserving icon sites depend on React-valued identity. A React-free observable service keeps identity as plain data and lets each release owner choose its own default art.

**Replace Light, Dark, and System with palette ids.** This conflates OS color-scheme resolution with token styling, breaks the pre-body bootstrap, and forces every palette to duplicate a mode choice. Two independent axes preserve the established scheme behavior.

**Erase a selected palette when its plugin unloads.** This makes HMR and temporary fleet-plugin absence destructive. Retaining the durable id while resolving Default makes registration lifetime reversible.

**Add contrast scoring or a color library.** The requested editor needs strict syntax and native pickers, not an accessibility policy. A warning layer would create unsupported product semantics and a dependency without preventing users from saving their intended colors.

## Consequences

Branding is JSON-compatible and cannot carry React nodes, markup, or PWA manifest policy. Consumers do not subscribe manually or receive Cordis context. Palette selection and color-scheme selection can change independently. A temporarily absent fleet palette survives restarts in settings without leaving stale inline tokens. The six Custom roles intentionally do not claim to produce accessible contrast or override every status and interaction alias.

## Supersession Check

This note extends the implemented Web client architecture and slot type-chain notes without superseding their ownership rules. It replaces the `ui-theme` README statement that registered theme ids are non-durable concrete preferences; Light, Dark, and System remain the only color-scheme preferences, while registered palette ids now form the durable orthogonal axis.
