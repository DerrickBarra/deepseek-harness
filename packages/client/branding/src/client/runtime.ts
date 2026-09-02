/** Internal implementation of the browser branding service. */

import type { BrandingDefinition, BrandingService, BrandingSnapshot, BrandingSourceId } from './contract.ts'

/** Release-owned branding contribution owner. */
export const RELEASE_BRANDING_SOURCE_ID = 'release:deepseek-harness' as BrandingSourceId

/** Release-owned identity used when no contribution is active. */
export const DEFAULT_BRANDING: Readonly<BrandingDefinition> = Object.freeze({
  displayName: 'DeepSeek Harness',
  productTitle: 'DeepSeek Harness',
})

interface BrandingEntry {
  readonly seq: number
  readonly definition: Readonly<BrandingDefinition>
}

/** Source-keyed latest-registration-wins branding implementation. */
export class BrandingRuntime implements BrandingService {
  private readonly entries = new Map<BrandingSourceId, BrandingEntry>()
  private readonly listeners = new Set<() => void>()
  private seq = 0
  private revision = 0
  private snapshot: BrandingSnapshot = freezeSnapshot(
    RELEASE_BRANDING_SOURCE_ID,
    DEFAULT_BRANDING,
    0,
  )

  /** @inheritdoc */
  getSnapshot(): BrandingSnapshot {
    return this.snapshot
  }

  /**
   * Subscribe to snapshot changes.
   * @param listener Callback invoked after each published change.
   * @returns Disposer removing the listener.
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  /** @inheritdoc */
  register(source: BrandingSourceId, definition: BrandingDefinition): () => void {
    if (source.trim() === '') throw new TypeError('branding source must be non-empty')
    const entry: BrandingEntry = {
      seq: this.seq++,
      definition: freezeDefinition(definition),
    }
    this.entries.set(source, entry)
    this.publish()
    return () => {
      if (this.entries.get(source) !== entry) return
      this.entries.delete(source)
      this.publish()
    }
  }

  private publish(): void {
    let source = RELEASE_BRANDING_SOURCE_ID
    let active: Readonly<BrandingDefinition> = DEFAULT_BRANDING
    let activeSeq = -1
    for (const [candidateSource, entry] of this.entries) {
      if (entry.seq <= activeSeq) continue
      source = candidateSource
      active = entry.definition
      activeSeq = entry.seq
    }
    this.revision += 1
    this.snapshot = freezeSnapshot(source, active, this.revision)
    for (const listener of [...this.listeners]) {
      try {
        listener()
      } catch (error) {
        console.error('branding subscriber crashed:', error)
      }
    }
  }
}

function freezeDefinition(definition: BrandingDefinition): Readonly<BrandingDefinition> {
  if (definition.displayName.trim() === '') throw new TypeError('branding displayName must be non-empty')
  if (definition.productTitle.trim() === '') throw new TypeError('branding productTitle must be non-empty')
  if (definition.iconUrl !== undefined && definition.iconUrl.trim() === '') {
    throw new TypeError('branding iconUrl must be non-empty when present')
  }
  return Object.freeze({
    displayName: definition.displayName,
    productTitle: definition.productTitle,
    ...(definition.iconUrl === undefined ? {} : { iconUrl: definition.iconUrl }),
  })
}

function freezeSnapshot(
  source: BrandingSourceId,
  definition: Readonly<BrandingDefinition>,
  revision: number,
): BrandingSnapshot {
  return Object.freeze({ source, ...definition, revision })
}
