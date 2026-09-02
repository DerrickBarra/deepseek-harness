/** Plain-data browser branding service contract. */

import type { Branded } from '@deepseek-ai/dsh-brand'
import type { ObservableSnapshot } from '@deepseek-ai/dsh-client-runtime/client'

/** Opaque identity for one branding contribution owner. */
export type BrandingSourceId = Branded<'BrandingSourceId'>

/** Presentation-only identity values accepted from a branding plugin. */
export interface BrandingDefinition {
  /** Human-readable identity rendered beside a custom icon. */
  displayName: string
  /** Product suffix used by the browser document title. */
  productTitle: string
  /** Trusted same-origin image URL, or undefined for release-owned vector art. */
  iconUrl?: string
}

/** Immutable active identity published by the branding service. */
export interface BrandingSnapshot extends BrandingDefinition {
  /** Contribution owner or release-default owner. */
  source: BrandingSourceId
  /** Monotonic registry revision. */
  revision: number
}

/** React-free source-keyed browser identity registry. */
export interface BrandingService extends ObservableSnapshot<BrandingSnapshot> {
  /**
   * Read the active immutable identity.
   * @returns Stable snapshot reference until the registry changes.
   */
  getSnapshot(): BrandingSnapshot
  /**
   * Register or replace one source's identity.
   * @param source Stable branded contribution owner.
   * @param definition Plain presentation data; markup and components are not accepted.
   * @returns Disposer removing exactly this registration.
   */
  register(source: BrandingSourceId, definition: BrandingDefinition): () => void
}
