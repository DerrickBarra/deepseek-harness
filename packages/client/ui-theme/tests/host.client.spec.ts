import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import type { WebServer } from '@deepseek-ai/dsh-host-webserver'
import { SettingsProvider, settingsNamespace, type SettingsNamespace } from '@deepseek-ai/dsh-settings'
import {
  DEFAULT_CUSTOM_PALETTE, DEFAULT_PALETTE_ID, DEFAULT_PREFERENCE, THEME_SETTINGS_NAMESPACE, apply,
  type ThemeSettings,
} from '@deepseek-ai/dsh-client-ui-theme'
import { isCustomPalette, validateThemeSettings } from '../src/theme-settings.ts'

class MemorySettings extends SettingsProvider {
  readonly writable = true
  protected load(): Promise<Record<string, unknown>> { return Promise.resolve({}) }
  protected persist(_ns: SettingsNamespace, _section: Record<string, unknown>): Promise<void> {
    return Promise.resolve()
  }
}

function validThemeSettings(): ThemeSettings {
  return {
    preference: DEFAULT_PREFERENCE,
    palette: DEFAULT_PALETTE_ID,
    customPalette: {
      light: { ...DEFAULT_CUSTOM_PALETTE.light },
      dark: { ...DEFAULT_CUSTOM_PALETTE.dark },
    },
  }
}

function unknownFieldCases(): [string, Record<string, unknown>][] {
  const top = validThemeSettings()
  const custom = validThemeSettings()
  const light = validThemeSettings()
  const dark = validThemeSettings()
  return [
    ['top', { ...top, unknown: true }],
    ['custom', { ...custom, customPalette: { ...custom.customPalette, unknown: true } }],
    ['light', {
      ...light,
      customPalette: {
        ...light.customPalette,
        light: { ...light.customPalette.light, unknown: '#123456' },
      },
    }],
    ['dark', {
      ...dark,
      customPalette: {
        ...dark.customPalette,
        dark: { ...dark.customPalette.dark, unknown: '#123456' },
      },
    }],
  ]
}

describe('ui-theme host', () => {
  it('registers, validates, and disposes the durable theme namespace with its fiber', async () => {
    const ctx = new Context()
    await ctx.plugin(MemorySettings).await()
    const fiber = ctx.plugin({ apply })
    await fiber.await()
    const ns = settingsNamespace(THEME_SETTINGS_NAMESPACE)
    expect(ctx.settings.get(ns)).toMatchObject({ preference: DEFAULT_PREFERENCE, palette: 'default' })
    await ctx.settings.update(ns, { preference: 'dark' })
    expect(ctx.settings.get(ns)).toMatchObject({ preference: 'dark', palette: 'default' })
    await expect(ctx.settings.update(ns, { preference: 'sepia' })).rejects.toThrow()
    await fiber.dispose()
    expect(ctx.settings.describe().map(row => row.ns)).not.toContain(ns)
  })

  it('accepts the exact durable section through the helper and settings write path', async () => {
    const value = validThemeSettings()
    expect(() => { validateThemeSettings(value) }).not.toThrow()
    expect(isCustomPalette(value.customPalette)).toBe(true)

    const ctx = new Context()
    await ctx.plugin(MemorySettings).await()
    await ctx.plugin({ apply }).await()
    const ns = settingsNamespace(THEME_SETTINGS_NAMESPACE)
    await expect(ctx.settings.update(ns, value)).resolves.toBeUndefined()
    expect(ctx.settings.get(ns)).toEqual(value)
  })

  it.each(unknownFieldCases())('rejects an unknown %s field directly and on durable writes', async (_level, value) => {
    expect(() => { validateThemeSettings(value) }).toThrow(/only supported/)
    if (_level !== 'top') expect(isCustomPalette(value.customPalette)).toBe(false)

    const ctx = new Context()
    await ctx.plugin(MemorySettings).await()
    await ctx.plugin({ apply }).await()
    const ns = settingsNamespace(THEME_SETTINGS_NAMESPACE)
    const before = ctx.settings.get(ns)
    await expect(ctx.settings.update(ns, value)).rejects.toThrow(/only supported/)
    expect(ctx.settings.get(ns)).toEqual(before)
  })

  it.each(unknownFieldCases())('keeps the last good value after an external document adds an unknown %s field', async (_level, value) => {
    const ctx = new Context()
    await ctx.plugin(MemorySettings).await()
    await ctx.plugin({ apply }).await()
    const ns = settingsNamespace(THEME_SETTINGS_NAMESPACE)
    const before = ctx.settings.get(ns)

    ;(ctx.settings as unknown as { publish(document: Record<string, unknown>): void })
      .publish({ [THEME_SETTINGS_NAMESPACE]: value })
    expect(ctx.settings.get(ns)).toEqual(before)
  })

  it('renders the current durable preference and disposes the index transform', async () => {
    const ctx = new Context()
    await ctx.plugin(MemorySettings).await()
    let transform: ((html: string) => string) | undefined
    let disposed = false
    ctx.provide('webServer', {
      tapIndex: (next: (html: string) => string) => {
        transform = next
        return () => { disposed = true }
      },
    } as WebServer)
    const fiber = ctx.plugin({ apply })
    await fiber.await()
    expect(transform?.('<body></body>')).toContain('const preference = "system"')
    await ctx.settings.update(settingsNamespace(THEME_SETTINGS_NAMESPACE), { preference: 'dark' })
    expect(transform?.('<body></body>')).toContain('const preference = "dark"')
    await fiber.dispose()
    expect(disposed).toBe(true)
    expect(transform?.('<body></body>')).toContain('const preference = "system"')
  })

  it('uses the system preference when only an HTTP server exists', async () => {
    const ctx = new Context()
    let transform: ((html: string) => string) | undefined
    ctx.provide('webServer', {
      tapIndex: (next: (html: string) => string) => {
        transform = next
        return () => undefined
      },
    } as WebServer)
    await ctx.plugin({ apply }).await()
    expect(transform?.('<body></body>')).toContain('const preference = "system"')
  })
})
