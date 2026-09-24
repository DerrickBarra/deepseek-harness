# Agent Note: Reasoning-only stops retry before assistant completion

Status: implemented

English | [中文](2026-09-24-reasoning-only-stop-retry.zh.md)

## Problem

Some reasoning models can emit a well-formed terminal `stop` while the assembled response contains reasoning blocks but no final text or tool call. The provider reports success, so the loop would commit the incomplete reasoning as an `assistant/message` and close the turn as completed. This differs from a zero-block `EMPTY_RESPONSE`: model output exists, but it is not a usable answer.

## Decision

The agent loop classifies a normal stop as an incomplete answer when the assembled message has at least one block and every block is reasoning. It appends a log-only `step/empty-answer` event with the turn, step, attempt, configured retry limit, reasoning character count, a 512-character suffix, and whether another attempt follows. The failed attempt does not append `assistant/message`, so derived model history cannot feed the incomplete reasoning into the retry.

`reasoningOnlyStopRetries` is a non-negative safe-integer agent-loop setting with default `2`. The loop retries the exact step under the same turn and step coordinates. Exhaustion throws an `EMPTY_ANSWER` LLM failure and closes the turn as an error. A stop with text, a tool-call finish, and `max-tokens` output keep their existing behavior.

The `step/empty-answer` event is durable because the anomaly and retry decision must survive replay and support incident diagnosis. Raw chunks remain the source of the full output; the event stores only a bounded suffix.

## Alternatives considered

**Classify the response in each adapter.** Adapters own wire-to-harness translation for zero-block responses, but reasoning-only incompleteness is a semantic invariant shared by adapters and models. Duplicating the check would create inconsistent protection and require every adapter to understand assistant usability.

**Reuse `EMPTY_RESPONSE`.** The response is not empty, and existing retry policy intentionally treats reasoning as content. Reusing that code would erase the distinction between transport/provider emptiness and a model that stopped before producing its answer.

**Commit the reasoning message before retrying.** This preserves one completion anchor per provider call, but derived history would replay the exact incomplete reasoning that triggered recovery and could amplify a repetition loop. Raw chunks plus `step/empty-answer` preserve evidence without making the failed attempt model-visible.

**Retry without a durable event.** This keeps the session vocabulary smaller, but makes repeated failures invisible after reload and prevents operators from distinguishing a slow request from bounded recovery.

## Consequences

A transient premature stop can recover without user intervention, and a persistent failure becomes an explicit turn error instead of a false success. Each retry spends another provider request. Usage chunks remain durable and token projection observes them, while step-level timing and completion counts continue to describe the final usable completion rather than each rejected attempt. Models that intentionally return reasoning without an answer are retried and then fail; deployments can set the retry count to zero when that behavior is desired.
