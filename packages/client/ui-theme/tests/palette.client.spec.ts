// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { stubSettingsScope } from '@deepseek-ai/dsh-client-test-runtime'
import { ThemeRuntime, type ThemeSettings } from '@deepseek-ai/dsh-client-ui-theme/client'
import {
  CUSTOM_PALETTE_ID, DEFAULT_CUSTOM_PALETTE, type ThemePaletteId,
} from '../src/theme-settings.ts'

const paletteId = (value: string): ThemePaletteId => value as ThemePaletteId

const make = () => {
  const ctx = new Context()
  const host = stubSettingsScope<ThemeSettings>()
  return { ctx, host, theme: new ThemeRuntime(ctx, host.scope) }
}

describe('orthogonal palettes', () => {
  it('changes palette tokens without changing color-scheme preference', () => {
    const { theme, host } = make()
    theme.registerPalette({
      id: paletteId('ocean'),
      label: 'Ocean',
      tokens: { '--dsw-alias-bg-base': { light: '#112233', dark: '#445566' } },
    })
    theme.setPalette(paletteId('ocean'))
    expect(theme.getTheme()).toMatchObject({ preference: 'system', palette: 'ocean', missingPalette: false })
    expect(theme.getTheme().active.tokens['--dsw-alias-bg-base']).toBe('#112233')
    expect(host.set).toHaveBeenCalledWith('palette', 'ocean')
  })

  it('retains a durable missing id, falls back, and restores after registration', () => {
    const { theme, host } = make()
    host.publish({
      status: 'ready', revision: 1, writable: true,
      value: { preference: 'system', palette: paletteId('fleet'), customPalette: DEFAULT_CUSTOM_PALETTE },
    })
    expect(theme.getTheme()).toMatchObject({ palette: paletteId('fleet'), missingPalette: true })
    expect(theme.getTheme().active.tokens).toEqual({})
    const dispose = theme.registerPalette({
      id: paletteId('fleet'), tokens: { '--dsw-alias-brand-primary': { light: '#123456', dark: '#654321' } },
    })
    expect(theme.getTheme().missingPalette).toBe(false)
    dispose()
    expect(theme.getTheme()).toMatchObject({ palette: paletteId('fleet'), missingPalette: true })
  })

  it('retracts an effect-owned palette when its fiber disposes', async () => {
    const { ctx, theme } = make()
    ctx.effect(() => theme.registerPalette({
      id: paletteId('hmr'), tokens: { '--dsw-alias-brand-primary': { light: '#123456', dark: '#654321' } },
    }))
    theme.setPalette(paletteId('hmr'))
    expect(theme.getTheme().missingPalette).toBe(false)
    await ctx.fiber.dispose()
    expect(theme.getTheme()).toMatchObject({ palette: 'hmr', missingPalette: true })
  })

  it('defensively freezes registered and Custom snapshot data', () => {
    const { theme, host } = make()
    const input = { '--token': { light: '#111111', dark: '#222222' } }
    theme.registerPalette({ id: paletteId('frozen'), tokens: input })
    input['--token'].light = '#FFFFFF'
    expect(theme.getTheme().palettes.find(palette => palette.id === 'frozen')?.tokens['--token']?.light).toBe('#111111')
    host.publish({
      status: 'ready', revision: 1, writable: true,
      value: { preference: 'system', palette: CUSTOM_PALETTE_ID, customPalette: DEFAULT_CUSTOM_PALETTE },
    })
    const colors = theme.getTheme().customPalette
    expect(Object.isFrozen(colors)).toBe(true)
    expect(Object.isFrozen(colors.light)).toBe(true)
    expect(() => { colors.light.accent = '#000000' }).toThrow()
    expect(theme.getTheme().customPalette.light.accent).toBe(DEFAULT_CUSTOM_PALETTE.light.accent)
  })
})
