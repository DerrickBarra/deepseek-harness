# Agent Note: Chat owns an additive file-mention provider registry

Status: implemented

English | [中文](2026-09-05-chat-file-mention-provider-registry.zh.md)

## Problem

Clickable inline-code file mentions had one optional `chatFileMentions` service supplied wholesale by ui-deliverables. A second feature could replace that service but could not contribute alongside deliverables, and a late provider mount or HMR reload did not invalidate already settled Markdown. Moving file matching or opening into Chat would make Chat depend on feature-specific file vocabularies and opener policy.

## Decision

ui-chat owns `ctx.chatFileMentions` as an additive named-provider registry. Each public `ChatFileMentionProvider` supplies a unique live `name`, optional numeric `priority` defaulting to `0`, and `forClosing(owner)`. `register()` binds the contribution to the caller's Cordis effect, returns an idempotent disposer, and rejects duplicate live names. The ordered roster uses ascending priority followed by registration order.

`forClosing()` asks providers in roster order to prepare for the closing Turn. Returning `undefined` declines only that Turn. Accepted resolvers run in the same order for each inline-code token, and an unresolved token falls through to the next resolver. Provider setup and resolution exceptions are logged and skipped so one provider cannot suppress later contributors. A resolved match passes through unchanged, including its provider-owned click opener; the registry defines no global opener.

The registry publishes a reference-stable observable snapshot of ordered provider names and priorities. Chat binds that source through its registration-owned hook and includes the snapshot in the closing-message resolver identity, so adding or disposing a provider rerenders settled messages while ordinary transcript appends preserve their cached Markdown parse. This is Client presentation state only and adds no Session, wire, schema, or model-visible data.

ui-deliverables registers the stock `deliverables` provider at priority `0`. Its successful-mutation vocabulary, exact-path and unique-basename matching, localized labels, opener callback, produced-files row, and model guidance remain unchanged.

## Alternatives considered

- **Keep one replaceable service provider.** This preserves the smallest implementation but makes unrelated file vocabularies mutually exclusive and leaves settled rendering stale across provider lifecycle changes.
- **Pass one global opener through the registry.** Rejected because providers can target different resources or authorities; retaining the returned opener keeps matching and action policy under one owner.
- **Merge provider paths into one Chat-owned vocabulary.** Rejected because Chat would need feature-specific path semantics and would erase per-provider decline, fallback, labels, and actions.
- **Recompute on every transcript update.** Rejected because settled Markdown should remain cached when only later streaming or transcript data changes; the provider roster is the exact invalidation input.

## Consequences

Multiple independently loaded features can add closing-message file mentions without replacing deliverables. Priority offers deterministic arbitration while equal-priority registration remains stable, failures are contained, and Cordis disposal/HMR removes only the caller's contribution. The public snapshot exposes names and priorities rather than resolver functions, preserving a serializable render invalidation value. Focused registry tests pin ordering, decline, fallback, exception containment, duplicates, publication, idempotent disposal, and caller-fiber teardown; Chat component coverage pins settled-message rerendering, and the shipped Web composition test continues to pin deliverables behavior.
