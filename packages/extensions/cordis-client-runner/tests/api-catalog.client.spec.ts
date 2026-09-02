import { describe, expect, it } from 'vitest'
import { SERVICE_API, TYPE_API } from '../src/client/api-catalog.ts'

describe('client inspection API catalog', () => {
  it('publishes the branding snapshot and branded registration identity', () => {
    const branding = SERVICE_API.find(service => service.key === 'branding')
    expect(branding?.methods.map(method => method.signature)).toEqual([
      'getSnapshot(): BrandingSnapshot',
      'register(source: BrandingSourceId, definition: BrandingDefinition): () => void',
    ])
    expect(TYPE_API.find(type => type.name === 'BrandingSnapshot')?.declaration)
      .toContain('source: BrandingSourceId;')
  })
})
