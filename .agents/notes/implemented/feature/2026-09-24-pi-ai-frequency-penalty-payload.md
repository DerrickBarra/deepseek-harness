# Agent Note: Provider profiles inject OpenAI frequency penalty through the payload hook

Status: implemented

English | [中文](2026-09-24-pi-ai-frequency-penalty-payload.zh.md)

## Problem

pi-ai 0.82.1 exposes `frequency_penalty` in neither `SimpleStreamOptions` nor its OpenAI-completions request builder. A deployment using an OpenAI-compatible local reasoning server therefore cannot tune repetition through `dsh-llm-pi-ai`, even though pi-ai exposes a provider-neutral `onPayload` hook before dispatch.

## Decision

A pi-ai provider profile may declare `frequencyPenalty` from -2 through 2. Profile resolution accepts it only when every model on the route uses `openai-completions`. The adapter supplies an `onPayload` callback that returns the generated request body with `frequency_penalty` set to the configured value. Omission leaves pi-ai's payload unchanged.

The setting belongs to the route profile rather than `GenerateOptions`: it is deployment policy for one endpoint, not a per-turn model control. It stays outside `compat` because pi-ai compatibility fields are copied into typed model compatibility records, while this value is a request parameter.

## Alternatives considered

**Patch or fork pi-ai's OpenAI request builder.** Rejected for this deployment-specific parameter because the existing payload hook carries it without owning an upstream fork.

**Put the value in `compat`.** Rejected because `compat` configures endpoint capability switches merged into each model. `frequency_penalty` is a request value, and adding an unknown compatibility key would weaken the compile-time drift checks around pi-ai's compatibility types.

**Expose a generic arbitrary-body dictionary.** Rejected because it would bypass protocol ownership and schema validation for every request field. The narrow typed option proves its protocol, range, and wire spelling.

## Consequences

OpenAI-completions routes can apply one validated repetition penalty to every request, including retries. Other protocols fail profile resolution instead of silently discarding the setting. The payload hook copies the request object, so pi-ai's generated body is not mutated in place. A future pi-ai release that adds a typed frequency-penalty option can replace the hook while preserving the profile field.
