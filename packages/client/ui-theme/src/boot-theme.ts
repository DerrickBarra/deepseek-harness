/** Host-rendered palette bootstrap for the browser's pre-plugin interval. */

import {
  CUSTOM_PALETTE_ID, DEFAULT_CUSTOM_PALETTE, DEFAULT_PALETTE_ID, DEFAULT_PREFERENCE,
  SEMANTIC_TOKEN_MAP, type CustomPalette, type ThemePreference, type ThemeSettings,
} from './theme-settings.ts'

function normalize(input: ThemePreference | ThemeSettings): ThemeSettings {
  return typeof input === 'string'
    ? { preference: input, palette: DEFAULT_PALETTE_ID, customPalette: DEFAULT_CUSTOM_PALETTE }
    : input
}

/** Build the inline script for one schema-validated durable section. */
function bootThemeScript(settings: ThemeSettings): string {
  const customTokens = Object.fromEntries(
    Object.entries(SEMANTIC_TOKEN_MAP).map(([key, token]) => [token, {
      light: settings.customPalette.light[key as keyof CustomPalette['light']],
      dark: settings.customPalette.dark[key as keyof CustomPalette['dark']],
    }]),
  )
  return `<script>(() => {
  const preference = ${JSON.stringify(settings.preference)}
  const systemDark = preference === 'system'
    && typeof matchMedia !== 'undefined'
    && matchMedia('(prefers-color-scheme: dark)').matches
  const dark = preference === 'dark' || systemDark
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  document.body.toggleAttribute('data-ds-dark-theme', dark)
  if (${JSON.stringify(settings.palette === CUSTOM_PALETTE_ID)}) {
    const tokens = ${JSON.stringify(customTokens)}
    document.body.setAttribute('data-ds-theme-bootstrap-tokens', Object.keys(tokens).join(' '))
    for (const [name, modes] of Object.entries(tokens)) {
      document.body.style.setProperty(name, modes[dark ? 'dark' : 'light'])
    }
  }
})()</script>`
}

/**
 * Insert the theme bootstrap immediately after the opening body tag.
 * @param html - Raw application index HTML.
 * @param settings - Current Host-backed section or a preference for compatibility with callers.
 * @returns HTML containing the theme bootstrap.
 */
export function injectBootTheme(
  html: string,
  settings: ThemePreference | ThemeSettings = DEFAULT_PREFERENCE,
): string {
  const script = bootThemeScript(normalize(settings))
  const body = /<body(?:\s[^>]*)?>/i.exec(html)
  if (body === null) return `${html}${script}`
  const at = body.index + body[0].length
  return `${html.slice(0, at)}${script}${html.slice(at)}`
}
