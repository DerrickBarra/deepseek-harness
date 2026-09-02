/** Appearance row mirror of the theme service snapshot. */
import { defineStore, type EngineStoreHandle } from '@deepseek-ai/dsh-client-runtime/client'
import {
  DEFAULT_CUSTOM_PALETTE, DEFAULT_PALETTE_ID,
  type CustomPalette, type ThemePaletteId, type ThemePreference,
} from '../theme-settings.ts'

/** Selectable palette summary kept JSON-compatible for the component. */
export interface PaletteOption {
  id: ThemePaletteId
  label: string
}

/** Store state mirrored from the theme snapshot. */
export interface AppearanceRowState {
  preference: ThemePreference
  palette: ThemePaletteId
  palettes: readonly PaletteOption[]
  missingPalette: boolean
  customPalette: CustomPalette
  revision: number
}

type AppearanceRowActions = {
  sync: (
    draft: AppearanceRowState,
    preference: ThemePreference,
    revision: number,
    palette?: ThemePaletteId,
    palettes?: readonly PaletteOption[],
    missingPalette?: boolean,
    customPalette?: CustomPalette,
  ) => void
}

/**
 * Declare the Appearance row state and write surface.
 * @returns the store handle.
 */
export function createAppearanceRowStore(): EngineStoreHandle<AppearanceRowState, AppearanceRowActions> {
  return defineStore({
    init: (): AppearanceRowState => ({
      preference: 'system', palette: DEFAULT_PALETTE_ID, palettes: [], missingPalette: false,
      customPalette: { light: { ...DEFAULT_CUSTOM_PALETTE.light }, dark: { ...DEFAULT_CUSTOM_PALETTE.dark } },
      revision: -1,
    }),
    actions: {
      sync: (
        d, preference, revision, palette = DEFAULT_PALETTE_ID, palettes = [], missingPalette = false,
        customPalette = DEFAULT_CUSTOM_PALETTE as CustomPalette,
      ) => {
        if (revision <= d.revision) return
        d.preference = preference
        d.palette = palette
        d.palettes = [...palettes]
        d.missingPalette = missingPalette
        d.customPalette = { light: { ...customPalette.light }, dark: { ...customPalette.dark } }
        d.revision = revision
      },
    },
  })
}
