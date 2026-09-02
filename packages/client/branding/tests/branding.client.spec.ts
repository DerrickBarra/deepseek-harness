import { describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import * as clientEntry from '@deepseek-ai/dsh-client-branding/client'
import type { BrandingSourceId } from '../src/client/contract.ts'
import {
  BrandingRuntime, DEFAULT_BRANDING, RELEASE_BRANDING_SOURCE_ID,
} from '../src/client/runtime.ts'

const brandingSourceId = (value: string): BrandingSourceId => value as BrandingSourceId

describe('BrandingRuntime', () => {
  it('keeps the client loader entry free of implementation runtime values', () => {
    expect(Object.keys(clientEntry).sort()).toEqual(['apply', 'name'])
  })

  it('rejects an empty source at the dynamic registration boundary', () => {
    const branding = new BrandingRuntime()
    expect(() => branding.register(brandingSourceId(''), {
      displayName: 'Invalid', productTitle: 'Invalid',
    })).toThrow('branding source must be non-empty')
  })

  it('publishes immutable source-keyed overrides and restores defaults on disposal', () => {
    const branding = new BrandingRuntime()
    const listener = vi.fn()
    branding.subscribe(listener)
    const first = branding.register(brandingSourceId('one'), { displayName: 'One', productTitle: 'One', iconUrl: '/one.png' })
    const snapshot = branding.getSnapshot()
    expect(snapshot).toMatchObject({
      source: brandingSourceId('one'), displayName: 'One', productTitle: 'One', iconUrl: '/one.png', revision: 1,
    })
    expect(Object.isFrozen(snapshot)).toBe(true)
    const second = branding.register(brandingSourceId('two'), { displayName: 'Two', productTitle: 'Two' })
    expect(branding.getSnapshot().displayName).toBe('Two')
    second()
    expect(branding.getSnapshot().displayName).toBe('One')
    first()
    expect(branding.getSnapshot()).toMatchObject({ source: RELEASE_BRANDING_SOURCE_ID, ...DEFAULT_BRANDING })
    expect(listener).toHaveBeenCalledTimes(4)
  })

  it('does not let an obsolete same-source disposer remove its replacement', () => {
    const branding = new BrandingRuntime()
    const obsolete = branding.register(brandingSourceId('brand'), { displayName: 'Old', productTitle: 'Old' })
    const current = branding.register(brandingSourceId('brand'), { displayName: 'New', productTitle: 'New' })
    obsolete()
    expect(branding.getSnapshot().displayName).toBe('New')
    current()
    expect(branding.getSnapshot().displayName).toBe('DeepSeek Harness')
  })

  it('retracts an effect-owned contribution when its fiber disposes', async () => {
    const ctx = new Context()
    const branding = new BrandingRuntime()
    ctx.effect(() => branding.register(brandingSourceId('hmr'), { displayName: 'HMR', productTitle: 'HMR' }))
    expect(branding.getSnapshot().displayName).toBe('HMR')
    await ctx.fiber.dispose()
    expect(branding.getSnapshot().displayName).toBe('DeepSeek Harness')
  })

  it('contains a throwing subscriber and notifies the remaining subscribers', () => {
    const branding = new BrandingRuntime()
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const survivor = vi.fn()
    branding.subscribe(() => { throw new Error('boom') })
    branding.subscribe(survivor)
    branding.register(brandingSourceId('brand'), { displayName: 'Brand', productTitle: 'Brand' })
    expect(survivor).toHaveBeenCalledOnce()
    expect(error).toHaveBeenCalled()
    error.mockRestore()
  })
})
