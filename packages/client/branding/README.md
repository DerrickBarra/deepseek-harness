# @deepseek-ai/dsh-client-branding

English | [中文](README.zh.md)

React-free browser identity service. The service publishes immutable snapshots containing a branded `BrandingSourceId`, `displayName`, `productTitle`, and an optional image URL. Contributions are keyed by source, the latest registration wins, and every registration returns a replacement-safe disposer. Removing the active contribution reveals the preceding contribution or the release default (`DeepSeek Harness` with release-owned vector art).

Browser plugins own their contribution through `ctx.effect(() => ctx.branding.register(source, definition), label)`. The `/client` Loader entry exposes only `apply` and `name` as runtime values; service and snapshot contracts are type exports. Branding values are plain data rather than components: the app shell projects `productTitle` into the document title, while the sidebar and empty-conversation hero receive framework-bound snapshots and preserve `BrandWordmark` and `FishLogo` when `iconUrl` is absent. PWA manifest icons remain owned by the existing web build and are not changed by this service.

## Model Experience

None, as branding changes browser presentation and never enters a model request.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **Image loading follows browser behavior** — the service carries a URL as data; it does not proxy, cache, resize, or validate image bytes.
