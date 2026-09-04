/** Host registration for the browser theme preference and pre-plugin palette. */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
import { injectBootTheme } from './boot-theme.ts'
import {
  DEFAULT_CUSTOM_PALETTE, DEFAULT_PALETTE_ID, DEFAULT_PREFERENCE,
  THEME_SETTINGS_NAMESPACE, ThemeSettingsSchema, type ThemeSettings, validateThemeSettings,
} from './theme-settings.ts'

export {
  CUSTOM_PALETTE_FIELD, CUSTOM_PALETTE_ID, DEFAULT_CUSTOM_PALETTE, DEFAULT_PALETTE_ID,
  DEFAULT_PREFERENCE, HEX_COLOR_PATTERN, SEMANTIC_COLOR_KEYS, SEMANTIC_TOKEN_MAP,
  THEME_PALETTE_FIELD, THEME_PREFERENCE_FIELD, THEME_PREFERENCES, THEME_SETTINGS_NAMESPACE,
  type CustomPalette, type SemanticColorKey, type SemanticColors, type ThemePaletteId,
  type ThemePreference, type ThemeSettings,
} from './theme-settings.ts'

const THEME_NAMESPACE = settingsNamespace(THEME_SETTINGS_NAMESPACE)

/** Read the registered section or use schema defaults without a settings provider. */
function readThemeSettings(ctx: Context): ThemeSettings {
  const section = ctx.get('settings')?.get(THEME_NAMESPACE) as ThemeSettings | undefined
  return section ?? {
    preference: DEFAULT_PREFERENCE,
    palette: DEFAULT_PALETTE_ID,
    customPalette: DEFAULT_CUSTOM_PALETTE,
  }
}

/**
 * Register the durable theme section and initial-theme index transform when
 * their optional Host services are composed.
 * @param ctx - Host context that may acquire settings and HTTP services.
 */
export function apply(ctx: Context): void {
  ctx.inject(['settings'], (settingsCtx) => {
    settingsCtx.settings.register(THEME_NAMESPACE, ThemeSettingsSchema, { validate: validateThemeSettings })
  })
  ctx.inject(['webServer'], (httpCtx) => {
    httpCtx.effect(
      () => httpCtx.webServer.tapIndex(html => injectBootTheme(html, readThemeSettings(ctx))),
      'client-ui-theme: initial theme bootstrap',
    )
  })
}
