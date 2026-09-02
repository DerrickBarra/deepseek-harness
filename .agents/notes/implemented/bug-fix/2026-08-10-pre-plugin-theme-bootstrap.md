# Agent Note: Pre-Plugin Theme Bootstrap

Status: implemented

English | [中文](2026-08-10-pre-plugin-theme-bootstrap.zh.md)

## Problem

The web shell renders `Loading plugins…` before the browser-side plugin tree activates. The theme tokens are already loaded with the shell styles, but `color-scheme` and `body[data-ds-dark-theme]` are not written until ui-theme's ThemeRuntime and ui-layout's ThemePresenter activate; with a persisted dark preference, the loading page therefore renders first with the light palette and then switches to dark.

`dshClient.immediately` only includes the bundle in first-stage prefetching; it does not cause the plugin to execute before HTML parsing or the shell's initial render. Changing only the client plugin's loading tier cannot close this window.

## Decision

ui-theme's host half transforms each index HTML document through `ctx.webServer.tapIndex()`, inserting a synchronous inline script immediately after the opening `<body>` tag. The transform registers under an optional `httpServer` injection, so compositions without that service still activate ui-theme and install no transform. When the HTML parser executes the script, the body exists, but the shell's module script and React root have not yet run.

The host half registers the [`ui-theme` settings section](2026-08-06-host-backed-web-preferences.md) when a settings provider exists. For each index response, it embeds the schema-validated color-scheme preference, selected palette id, and Custom semantic values; without a settings provider or active registration, it embeds the shipped defaults. The browser resolves `system` through `prefers-color-scheme`, falling back to light when `matchMedia` is unavailable. It writes the color-scheme DOM state that ThemePresenter later owns and, when Custom is selected, the same six alias-token variables.

The bootstrap logic recognizes the built-in `light`, `dark`, and `system` semantics plus the built-in Custom palette. It registers no listeners and cannot resolve palettes registered only by browser plugins; those use Default until their registration activates. After the browser-side plugin tree activates, ThemeRuntime remains authoritative for theme state, and ThemePresenter writes the complete resolved result back to the same DOM state and owns subsequent updates and disposal.

## Verification

ui-theme's unit tests cover activation without either optional Host service, the script position, Host-setting precedence, the OS preference, missing `matchMedia`, input without a body, live settings reads, and disposal of the Host registrations with the plugin fiber. A Chromium scenario for the real web composition selects the durable dark preference, holds the plugin bundle request open to keep the loading page observable, then asserts that the index response produces a dark background, the body attribute, and the root element's `color-scheme`. The change does not alter the accessibility tree, so it produces no new page golden.

## Alternatives considered

**Hard-code the logic in `apps/web/index.html`.** This would run at the same point, but static HTML cannot embed the current Host setting and would duplicate the preference resolution and DOM fields owned by ui-theme. The Host transform follows the theme plugin's lifecycle and keeps the application shell unaware of the theme domain.

**Make the ui-theme client bundle synchronous or activate it earlier.** `immediately` controls only prefetching; plugin instantiation still occurs after the shell starts running. Blocking the initial render until ThemeRuntime activates would delay the visible loading and error screens and make the shell depend on the plugin tree it monitors to render failures.

**Rely only on CSS `prefers-color-scheme`.** Media queries cannot read an explicit persisted choice, so a user who selects dark while the operating system uses light would still see a flash.

**Run in `<head>` and add a temporary class to html.** The body does not exist yet, and this would require a set of temporary selectors separate from the final palette attributes. Immediately after `<body>` is the earliest parse position that can write the final DOM fields directly.

## Consequences

The loading page's first frame matches the durable color-scheme preference and Custom palette, and defaults to the OS preference with Default when no settings provider is composed. The index transform reads Host settings for every response. Changes to preference semantics, Custom aliases, or ThemePresenter DOM fields must update both the script and ThemeRuntime. A browser-registered palette still applies only after browser plugins activate; during the loading interval, the page uses Default over the selected light or dark base.
