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

const THEME_SETTINGS_KEYS = [
  THEME_PREFERENCE_FIELD, THEME_PALETTE_FIELD, CUSTOM_PALETTE_FIELD,
] as const
const CUSTOM_PALETTE_KEYS = ['light', 'dark'] as const
const PALETTE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const semanticSchema = z.object(Object.fromEntries(
  SEMANTIC_COLOR_KEYS.map(key => [key, z.string().pattern(HEX_COLOR_PATTERN)]),
) as Record<SemanticColorKey, z<string>>)
const paletteIdSchema = z.string().pattern(PALETTE_ID_PATTERN) as z<ThemePaletteId>

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

function hasExactKeys<const Key extends string>(
  value: unknown,
  keys: readonly Key[],
): value is Record<Key, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const actual = Object.keys(value)
  return actual.length === keys.length && keys.every(key => Object.hasOwn(value, key))
}

/**
 * Narrow one value to a complete strict-hex Custom palette with no unknown fields.
 * @param value Candidate settings value.
 * @returns Whether both exact mode objects contain exactly the semantic color fields.
 */
export function isCustomPalette(value: unknown): value is CustomPalette {
  if (!hasExactKeys(value, CUSTOM_PALETTE_KEYS)) return false
  return CUSTOM_PALETTE_KEYS.every((mode) => {
    const colors = value[mode]
    return hasExactKeys(colors, SEMANTIC_COLOR_KEYS)
      && SEMANTIC_COLOR_KEYS.every((key) => {
        const color = colors[key]
        return typeof color === 'string' && HEX_COLOR_PATTERN.test(color)
      })
  })
}

/**
 * Reject theme settings that contain unknown fields or unsupported persisted values.
 * @param value Candidate resolved settings section.
 */
export function validateThemeSettings(value: unknown): asserts value is ThemeSettings {
  if (!hasExactKeys(value, THEME_SETTINGS_KEYS)
    || !isThemePreference(value.preference)
    || typeof value.palette !== 'string'
    || !PALETTE_ID_PATTERN.test(value.palette)
    || !isCustomPalette(value.customPalette)) {
    throw new TypeError('theme settings must contain only supported preference, palette, and Custom fields')
  }
}
