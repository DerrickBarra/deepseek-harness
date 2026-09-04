# @deepseek-ai/dsh-client-ui-theme

English | [中文](README.zh.md)

Theme plugin: ThemeRuntime over the --dsw-* token base stylesheets (static scale + alias semantic layers). The service owns two orthogonal durable axes: `light`/`dark`/`system` selects the color scheme, while a branded `ThemePaletteId` selects paired light/dark semantic token overrides. Registered palettes remain reversible browser contributions, but their selected id persists independently; if a registration disappears, Default renders without erasing the durable id, and re-registration restores it automatically. The built-in Custom palette stores six strict `#RRGGBB` semantic values for each mode (accent, application background, raised surface, sidebar, primary text, and secondary text) and exposes them through keyboard-navigable Light and Dark tabs while preserving the paired draft across tab switches; preview, Save, Reset, and Cancel remain available without contrast warnings. Its durable section rejects unknown fields at the section, Custom, Light, and Dark levels, so external document edits and Host writes use exactly the documented semantic settings. Immutable `ThemeSnapshot`s publish on `theme/change`; ui-layout applies the resolved snapshot to the DOM. The [Host-backed preferences decision](../../../.agents/notes/implemented/bug-fix/2026-08-06-host-backed-web-preferences.md) owns the persistence boundary.

When the host composition includes an HTTP server, the host half injects a synchronous bootstrap immediately after the opening `<body>` tag. Each index response embeds the durable color-scheme preference, selected palette id, and Custom values; the browser resolves `system`, selects the base token sheet, and applies Custom aliases when selected before the shell loading page renders. Browser-only registered palettes display Default during this pre-plugin interval. Compositions without an HTTP server remain unaffected, and ThemeRuntime and ui-layout remain authoritative after activation.

`src/styles/` holds five sheets, all imported by the web shell's `base.css`: `base.css`, `design-platform.css`, `scrollbar.css`, `gradient-shadow-text.css`, and `shiki.css`. `scrollbar.css` is the sole consumer of the `--dsw-alias-scrollbar-*` tokens and must follow `design-platform.css`, which declares them.

Scrollbar rebinding contract: `scrollbar.css` binds `--dsh-scrollbar-thumb` and `--dsh-scrollbar-thumb-hover` on `body` to the l1 (base-surface) tokens, and both rendering paths read that pair. An elevated surface (menu, popover, dialog) sets `--dsh-scrollbar-thumb: var(--dsw-alias-scrollbar-bg-l2)` and `--dsh-scrollbar-thumb-hover: var(--dsw-alias-scrollbar-hover-l2)` on its own container; one rebind retints whichever path the engine took. The pair's other legal target is `transparent`, which draws no thumb at all — [ui-sidebar](../ui-sidebar/README.md) rebinds its column that way while the pointer is elsewhere. A rebind to the l1 pair is not a rebind; it restates the base-surface default. `--dsh-scrollbar-width` mirrors the WebKit bar's layout width for surfaces that align themselves beside a space-consuming bar — [ui-conversation](../ui-conversation/README.md) reads it for the overlay composer seat's `right` offset — and the scrollbar-styles spec pairs it with the mirrored rule and the consumer.

The two paths are mutually exclusive by construction. `scrollbar-width`/`scrollbar-color` sit inside `@supports not selector(::-webkit-scrollbar)` because a non-`auto` value of either makes Chromium and Safari discard every `::-webkit-scrollbar*` rule for that element, `::-webkit-scrollbar-thumb:hover` included — declaring both unconditionally leaves `--dsh-scrollbar-thumb-hover` with no rendering anywhere. Firefox therefore takes the standard properties and WebKit-based engines take the pseudo-elements, so the hover token only ever renders through the pseudo-element path. Reasoning and the measured computed values: [the scrollbar Agent Note](../../../.agents/notes/implemented/bug-fix/2026-07-28-themed-scrollbars-and-reserved-gutter.md).

## Model Experience

None, as the theme service manages a browser preference; nothing here reaches a model request.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **Browser-only palettes bootstrap as Default** — the Host cannot apply a palette registration that exists only in the later browser plugin graph, so a refresh may show Default until that registration activates.
- **The token sheets are the sole color authority** — values absent from cssdesign (for example the design's #4176E6 tab blue) are deliberately not appended; the nearest semantic token wins. Design-owner-approved additions are the exception and enter as a static step plus a semantic alias in the same change (`--dsw-static-blue-900` / `--dsw-alias-label-primary-bluish`).
