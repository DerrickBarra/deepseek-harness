# Agent Note: what the configuration plane exposes, and who may overwrite what

Status: implemented

English | [中文](2026-07-30-config-plane-boundaries.zh.md)

> Scope: boundary hardening of the [web configuration plane](2026-07-30-web-config-plane.md) — which namespaces reach the wire, which callers reach them, and how an editor holding a partial, possibly stale view writes without destroying what it cannot see.

## Problem

The plane worked and was reachable by more callers, and with more authority, than its design claimed.

The configuration plane initially trusted a declared LAN client for reads while restricting writes, so that client could call `settings.describe` — every exposed namespace's configuration — and `credentials.describe`, which reports whether an arbitrary environment-variable name is configured and where it resolves from. Treating read access as less privileged than write access was a category error. Separately, the proxy served every registered namespace: the settings seam is deliberately general, so the first plugin to call `settings.register()` for its own configuration would silently join the web configuration plane, without passing anywhere near a review of the web surface.

The editor was worse than reachable — it was destructive. It reads the redacted descriptor, which by construction omits `role('secret')` fields. Clearing one field rebuilt the whole user section from that redacted copy and sent `settings.replace`, so a stored literal `apiKey` the wire had never returned was deleted as a side effect. Reproduced directly: `{baseURL, reasoning}` in, `apiKey` gone. Row removal took the same path. And nothing carried a version, so two tabs editing one namespace silently overwrote each other; the seam's per-namespace write queue orders writes but cannot tell a fresh writer from one replaying a stale snapshot.

Three smaller defects sat beside them. `llm/adapters-updated` documented contained observer failures but only caught synchronous ones, so an async listener's rejection escaped as an unhandled rejection. llm-deepseek's retry-policy swap disposed its registration before re-registering, publishing an empty route set between the two — an observer saw the provider disappear and come back, despite a comment claiming no such window. And a transport rejection during the page's credential enrichment escaped `load()`, stranding the page in `loading` with no error shown.

## Decision

**Reading configuration is as privileged as writing it.** `settings.describe` and `credentials.describe` use the same `/api` trusted-host fence as configuration writes, so loopback and declared `trustedHosts` have the same approved access while undeclared non-loopback authorities are refused. The model catalog (`llm.providers`, `llm.models`) carries provider ids, display names, and model lists — no endpoints, no key state — and remains part of that shared DSH API reachability decision. The boundary is asserted over a real HTTP server rather than a hand-assembled request, because the `Host` header a browser actually sends is what decides it.

**The plane serves namespaces admitted by an explicit owner policy.** `ctx.llm.listConfigurableProviders()` admits registered model-provider namespaces, the gateway retains closed product/Web allowlists, and `settings.register(..., { exposure: 'web' })` lets a non-LLM namespace owner opt into the same trusted configuration client. Omitting `exposure` remains default-deny, and the gateway does not send the registration metadata over the wire. An unregistered namespace and an unexposed one answer identically (`settings-not-exposed`), so probing cannot enumerate the registry.

**A caller with a partial view names the field it means.** `SettingsProvider.mutate(ns, ops)` applies `set`/`unset` path ops to the section as it stands at the front of the write queue. The client builds ops by diffing its opening snapshot against its draft, so it mentions only fields it can see: a secret absent from both sides produces no op and survives by construction, not by care. `replace` remains the deliberate wholesale reset.

**Staleness is detected, not ordered away.** Each namespace carries a monotonic `revision` over its RAW section; writes may carry `expectedRevision`, and a mismatch rejects with `SettingsConflictError` → `settings-conflict` on the wire, both revisions attached. The editor captures the revision it opened at and, on conflict, tells the user to reopen rather than replaying its snapshot.

**The raw layer gets its own event.** `settings/updated` stays gated on the resolved value — that is what a consumer means by change. `settings/document-updated (ns, revision)` fires on any raw-section change, because a configuration surface must learn that a field went from inherited to overridden (same resolved value, different meaning) and that its held revision is stale. The event is forwarded verbatim, and model consumers subscribe to it alongside `llm/adapters-updated`, because provider settings hold catalog data that no route change announces.

## Alternatives considered

- **A deployment-declared namespace allowlist on the proxy config** — more general, but it moves the product boundary to whoever writes cordis.yml, and an empty default would break the shipped page until every deployment opted in. The provider directory already states exactly which namespaces are model configuration.
- **Replacing every existing policy with registration metadata** — a uniform mechanism, but configurable model providers and product namespaces already have authoritative directories or closed allowlists. Registration metadata supplements those policies for non-LLM owners instead of forcing unrelated migrations.
- **Distinguishing "unregistered" from "registered but unexposed"** — better diagnostics, and a namespace-enumeration oracle. The uniform answer is deliberate.
- **Detecting conflicts by diffing instead of a revision** — comparing the submitted base against storage would work for whole-section writes, but the editor holds a REDACTED section: it cannot produce a comparable base, which is the same reason it cannot safely `replace`. A counter needs neither.
- **Fixing the redaction gaps here** — `redactSecrets` walks only `object`/`dict`/`array`, so a secret behind a union, intersection, or transform is returned verbatim with an empty `secrets` list; `schema.toJSON()` carries a secret field's `.default(...)`; write-rejection messages return schema text that may quote the input; the client rehydrates the envelope through schemastery's `new Function`; and pi-ai's plain-string `headers` dict can legitimately hold `Authorization`. All real, all deliberately left for a fail-closed `describeForWire()` that refuses a schema it cannot prove safe. They are recorded as `TODO(settings-wire-redaction)` and in the owning READMEs' Known Limitations rather than half-fixed here.

## Consequences

A browser outside loopback and `trustedHosts` cannot render the Host-backed settings page; a declared trusted host can render the same configuration surface as loopback, and that reachability remains distinct from authentication. A plugin registration remains private unless its namespace is admitted by a provider/product policy or the owner declares `exposure: 'web'`; `settings-not-exposed` names that boundary without revealing which case applied. The exposure marker is same-process descriptor metadata, not a wire field, and does not bypass secret redaction or a provider's read-only policy. `SettingsDescriptor` carries a required `revision`, and `settings/document-updated` lets provider-side listeners observe raw-layer movement. Clients that ignore `expectedRevision` keep last-write-wins semantics unchanged. Deferred: the fail-closed wire describe (with the `headers` and envelope-sanitization work it carries), and a non-executable browser schema protocol.
