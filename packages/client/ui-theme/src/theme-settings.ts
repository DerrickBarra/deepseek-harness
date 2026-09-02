/** Theme preferences and custom palette values stored in user settings. */

import type { Branded } from '@deepseek-ai/dsh-brand'
import z from '@deepseek-ai/schemastery'

/** Built-in color-scheme preferences. */
export const THEME_PREFERENCES = ['light', 'dark', 'system'] as const
/** Semantic color roles exposed by the Custom editor. */
export const SEMANTIC_COLOR_KEYS = [
  'accent', 'background', 'surface', 'sidebar', 'primaryText', 'secondaryText',
] as const
/** Settings namespace owned by the theme plugin. */
export const THEME_SETTINGS_NAMESPACE = 'ui-theme'
/** Field carrying the selected color-scheme preference. */
export const THEME_PREFERENCE_FIELD = 'preference'
/** Field carrying the requested palette id. */
export const THEME_PALETTE_FIELD = 'palette'
/** Field carrying Custom's paired semantic values. */
export const CUSTOM_PALETTE_FIELD = 'customPalette'
/** Default registered palette id. */
export const DEFAULT_PALETTE_ID = 'default' as ThemePaletteId
/** Built-in editable palette id. */
export const CUSTOM_PALETTE_ID = 'custom' as ThemePaletteId
/** Strict persisted/editor color syntax. */
export const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/

/** Persisted light/dark/system preference. */
export type ThemePreference = typeof THEME_PREFERENCES[number]
/** Opaque durable identity for one light/dark palette pair. */
export type ThemePaletteId = Branded<'ThemePaletteId'>
/** Semantic color role. */
export type SemanticColorKey = typeof SEMANTIC_COLOR_KEYS[number]
/** Complete values for one color scheme. */
export type SemanticColors = Record<SemanticColorKey, string>
/** Paired Custom palette values. */
export interface CustomPalette {
  light: SemanticColors
  dark: SemanticColors
}

/** Default preference. */
export const DEFAULT_PREFERENCE: ThemePreference = 'system'
/** Shipped values staged by Reset in the Custom editor. */
export const DEFAULT_CUSTOM_PALETTE: Readonly<CustomPalette> = Object.freeze({
  light: Object.freeze({
    accent: '#4D6BFE', background: '#FFFFFF', surface: '#F5F6F7', sidebar: '#F7F8FA',
    primaryText: '#17191C', secondaryText: '#6B7078',
  }),
  dark: Object.freeze({
    accent: '#7C8FFF', background: '#16171A', surface: '#202226', sidebar: '#1B1D20',
    primaryText: '#F2F3F5', secondaryText: '#A7ABB2',
  }),
})

/** Durable theme section. */
export interface ThemeSettings {
  preference: ThemePreference
  palette: ThemePaletteId
  customPalette: CustomPalette
}

const semanticSchema = z.object(Object.fromEntries(
  SEMANTIC_COLOR_KEYS.map(key => [key, z.string().pattern(HEX_COLOR_PATTERN)]),
) as Record<SemanticColorKey, z<string>>)
const paletteIdSchema = z.string()
  .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) as z<ThemePaletteId>

/** Durable theme schema. */
export const ThemeSettingsSchema: z<ThemeSettings> = z.object({
  [THEME_PREFERENCE_FIELD]: z.union([...THEME_PREFERENCES]).default(DEFAULT_PREFERENCE),
  [THEME_PALETTE_FIELD]: paletteIdSchema.default(DEFAULT_PALETTE_ID),
  [CUSTOM_PALETTE_FIELD]: z.object({
    light: semanticSchema,
    dark: semanticSchema,
  }).default(DEFAULT_CUSTOM_PALETTE as CustomPalette),
})

/** CSS aliases controlled by each Custom semantic role. */
export const SEMANTIC_TOKEN_MAP: Readonly<Record<SemanticColorKey, string>> = Object.freeze({
  accent: '--dsw-alias-brand-primary',
  background: '--dsw-alias-bg-base',
  surface: '--dsw-alias-bg-layer-1',
  sidebar: '--dsw-specific-sidebar-fill',
  primaryText: '--dsw-alias-label-primary',
  secondaryText: '--dsw-alias-label-secondary',
})

/**
 * Narrow one value to a persistable color-scheme preference.
 * @param value Candidate settings value.
 * @returns Whether the value is a color-scheme preference.
 */
export function isThemePreference(value: unknown): value is ThemePreference {
  return THEME_PREFERENCES.some(preference => preference === value)
}

/**
 * Narrow one value to a complete strict-hex Custom palette.
 * @param value Candidate settings value.
 * @returns Whether both mode objects contain every strict-hex semantic color.
 */
export function isCustomPalette(value: unknown): value is CustomPalette {
  if (typeof value !== 'object' || value === null) return false
  return (['light', 'dark'] as const).every((mode) => {
    const colors = (value as Partial<CustomPalette>)[mode]
    return typeof colors === 'object' && colors !== null
      && SEMANTIC_COLOR_KEYS.every(key => HEX_COLOR_PATTERN.test(colors[key] ?? ''))
  })
}
