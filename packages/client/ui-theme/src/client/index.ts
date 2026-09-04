/**
 * Browser theme registry over the `--dsw-*` token stylesheets. The service
 * owns the live color-scheme preference (light/dark/system), resolves `system`
 * through `prefers-color-scheme`, and publishes immutable snapshots; it never touches
 * the DOM — ui-layout's presenter consumes the resolved snapshot. The Host
 * settings scope loads and stores the preference in the user-settings
 * document. The plugin also registers the Appearance preference row into the
 * settings General section — the theme feature owns its own settings surface.
 */
import type { Context } from '@deepseek-ai/cordis'
import type { BoundActions } from '@deepseek-ai/dsh-client-ui-slots'
import type { ClientContext, SettingsScope } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: the ctx.settingsScope Context merge. Cross-plugin collaboration
// goes through the service, never a value import (client bundle purity gate).
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type { AppearanceRowInjected } from './AppearanceRow.tsx'
import { AppearanceRow } from './AppearanceRow.tsx'
import { CustomPaletteEditor, type CustomPaletteEditorInjected } from './CustomPaletteEditor.tsx'
import { createAppearanceRowStore } from './settings-store.ts'
import { en, zh, type ThemeKey } from './locales.ts'
import {
  CUSTOM_PALETTE_ID, DEFAULT_CUSTOM_PALETTE, DEFAULT_PALETTE_ID, DEFAULT_PREFERENCE,
  isCustomPalette, isThemePreference, SEMANTIC_TOKEN_MAP, THEME_PALETTE_FIELD,
  THEME_PREFERENCE_FIELD, THEME_SETTINGS_NAMESPACE,
  type CustomPalette, type ThemePaletteId, type ThemePreference, type ThemeSettings,
} from '../theme-settings.ts'

export type { AppearanceRowComponentProps, AppearanceRowInjected } from './AppearanceRow.tsx'
export type { AppearanceRowState } from './settings-store.ts'
export type { ThemeKey } from './locales.ts'
export type {
  CustomPalette, SemanticColorKey, SemanticColors, ThemePaletteId, ThemePreference, ThemeSettings,
} from '../theme-settings.ts'

/** Namespace owning this feature's settings-row copy. */
export const SETTINGS_NS = 'settings.theme'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The Appearance settings row's copy. */
    'settings.theme': ThemeKey
  }
}

/** Theme token dictionary: --dsw-alias-* overrides keyed by variable name. */
export type ThemeTokens = Record<string, string>

/**
 * One override-layer token value: both palette modes are mandatory (repeat
 * the same value when the token is scheme-invariant) so an override never
 * goes illegible when the user switches to the other scheme.
 */
export interface ThemeTokenModes {
  /** Value applied while the light base palette is active. */
  light: string
  /** Value applied while the dark base palette is active. */
  dark: string
}

/** Override-layer dictionary: token names to per-mode value pairs. */
export type ThemeTokenOverrides = Record<string, ThemeTokenModes>

/** One resolved built-in color scheme with composed alias-token overrides. */
export interface ThemeDefinition {
  /** Resolved fixed color-scheme id. */
  id: Exclude<ThemePreference, 'system'>
  /**
   * Which base palette this theme builds on. The presenter switches
   * `body[data-ds-dark-theme]` from this field — never from the id.
   */
  colorScheme: 'light' | 'dark'
  /** Alias-layer overrides applied as inline CSS variables over the base palette. */
  tokens: ThemeTokens
}

/** One orthogonal light/dark palette registration. */
export interface PaletteDefinition {
  /** Stable lowercase kebab-case id persisted independently of registration lifetime. */
  id: ThemePaletteId
  /** Optional user-facing label; settings falls back to the id. */
  label?: string
  /** Alias values for both color schemes. */
  tokens: ThemeTokenOverrides
}

/** Immutable theme state published on every change. */
export interface ThemeSnapshot {
  /** The persisted preference (may be `system`). */
  preference: ThemePreference
  /**
   * The resolved active theme (`system` resolved via prefers-color-scheme)
   * with override layers folded into its tokens (seq order, later layers win
   * per-token; each value picked for the active color scheme).
   */
  active: ThemeDefinition
  /** Built-in light and dark bases. */
  themes: readonly ThemeDefinition[]
  /** Requested durable palette id, retained while its registration is absent. */
  palette: ThemePaletteId
  /** Registered palette definitions in registration order. */
  palettes: readonly PaletteDefinition[]
  /** Whether the requested palette currently falls back to Default. */
  missingPalette: boolean
  /** Active resolved palette definition. */
  activePalette: PaletteDefinition
  /** Current paired Custom values. */
  customPalette: CustomPalette
  /** Monotonic change counter (registry or active changes). */
  revision: number
}

/** One theme token exposed to pre-definition Cordis inspection. */
export interface ThemeTokenInspection {
  /** Token name accepted by {@link ThemeService.overrideTokens}. */
  name: string
  /** Intended visual role. */
  description: string
  /** CSS value category. */
  valueType: string
  /** Whether override layers must supply both palette modes. */
  requiresLightAndDark: boolean
  /** CSS custom property consumed by UI styles. */
  cssVariable?: string
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    theme: ThemeRuntime
  }
  interface Events {
    /**
     * Theme state changed (preference switched, registry updated, or the OS
     * color scheme changed while the preference is `system`).
     * @param snapshot - Current immutable theme snapshot.
     * @mode emit
     */
    'theme/change'(snapshot: ThemeSnapshot): void
  }
}

const BUILTIN_THEMES: readonly ThemeDefinition[] = Object.freeze([
  Object.freeze({ id: 'light', colorScheme: 'light' as const, tokens: Object.freeze({}) }),
  Object.freeze({ id: 'dark', colorScheme: 'dark' as const, tokens: Object.freeze({}) }),
])

const DEFAULT_PALETTE: PaletteDefinition = Object.freeze({
  id: DEFAULT_PALETTE_ID,
  label: 'Default',
  tokens: Object.freeze({}),
})

function customPaletteDefinition(colors: CustomPalette): PaletteDefinition {
  const tokens: ThemeTokenOverrides = {}
  for (const [key, name] of Object.entries(SEMANTIC_TOKEN_MAP)) {
    tokens[name] = Object.freeze({
      light: colors.light[key as keyof CustomPalette['light']],
      dark: colors.dark[key as keyof CustomPalette['dark']],
    })
  }
  return Object.freeze({ id: CUSTOM_PALETTE_ID, label: 'Custom', tokens: Object.freeze(tokens) })
}

const BUILTIN_INSPECT_TOKENS: readonly ThemeTokenInspection[] = Object.freeze([
  { name: '--dsw-alias-bg-base', description: 'Application base background.', valueType: 'CSS color', requiresLightAndDark: true, cssVariable: '--dsw-alias-bg-base' },
  { name: '--dsw-alias-bg-layer-1', description: 'Primary raised surface background.', valueType: 'CSS color', requiresLightAndDark: true, cssVariable: '--dsw-alias-bg-layer-1' },
  { name: '--dsw-alias-bg-layer-2', description: 'Secondary nested surface background.', valueType: 'CSS color', requiresLightAndDark: true, cssVariable: '--dsw-alias-bg-layer-2' },
  { name: '--dsw-alias-bg-overlay', description: 'Overlay and popover background.', valueType: 'CSS color', requiresLightAndDark: true, cssVariable: '--dsw-alias-bg-overlay' },
  { name: '--dsw-alias-border-l1', description: 'Primary subtle border.', valueType: 'CSS color', requiresLightAndDark: true, cssVariable: '--dsw-alias-border-l1' },
  { name: '--dsw-alias-border-l2', description: 'Secondary stronger border.', valueType: 'CSS color', requiresLightAndDark: true, cssVariable: '--dsw-alias-border-l2' },
  { name: '--dsw-alias-brand-primary', description: 'Primary brand accent.', valueType: 'CSS color', requiresLightAndDark: true, cssVariable: '--dsw-alias-brand-primary' },
  { name: '--dsw-alias-label-primary', description: 'Primary text color.', valueType: 'CSS color', requiresLightAndDark: true, cssVariable: '--dsw-alias-label-primary' },
  { name: '--dsw-alias-label-secondary', description: 'Secondary text color.', valueType: 'CSS color', requiresLightAndDark: true, cssVariable: '--dsw-alias-label-secondary' },
  { name: '--dsw-alias-state-error-primary', description: 'Primary error state color.', valueType: 'CSS color', requiresLightAndDark: true, cssVariable: '--dsw-alias-state-error-primary' },
  { name: '--dsw-alias-state-success-primary', description: 'Primary success state color.', valueType: 'CSS color', requiresLightAndDark: true, cssVariable: '--dsw-alias-state-success-primary' },
  { name: '--dsw-alias-state-warn-primary', description: 'Primary warning state color.', valueType: 'CSS color', requiresLightAndDark: true, cssVariable: '--dsw-alias-state-warn-primary' },
  { name: '--dsw-specific-sidebar-fill', description: 'Sidebar column and title-row background.', valueType: 'CSS color', requiresLightAndDark: true, cssVariable: '--dsw-specific-sidebar-fill' },
])

/**
 * Color-scheme preference and palette owner. `light`/`dark` are fixed bases
 * and `system` resolves between them; third-party styling registers paired
 * palettes or reversible alias-token override layers. Reads go through
 * {@link getTheme}; color-scheme writes only through {@link setTheme};
 * continuous sync only through the `theme/change` event.
 * The service holds the `prefers-color-scheme` media query (environment
 * sensing, not presentation) and re-emits when the OS scheme flips while the
 * preference is `system`.
 */
export class ThemeRuntime {
  private readonly ctx: Context
  private readonly host: SettingsScope<ThemeSettings>
  private readonly themes = BUILTIN_THEMES
  private preference: ThemePreference
  private palette = DEFAULT_PALETTE_ID
  private customPalette: CustomPalette = cloneCustomPalette(DEFAULT_CUSTOM_PALETTE)
  private palettes: PaletteDefinition[] = [DEFAULT_PALETTE, customPaletteDefinition(this.customPalette)]
  private revision = 0
  private snapshot: ThemeSnapshot
  private readonly media: MediaQueryList | undefined
  /** Override layers by source; seq (monotonic) is the stacking order. */
  private readonly overrides = new Map<string, { seq: number; tokens: ThemeTokenOverrides }>()
  private overrideSeq = 0

  /**
   * @param ctx - owning context (change events are emitted on it; the
   * media-query and scope listeners are released through ctx.effect on dispose).
   * @param host - durable preference scope owned by the same plugin.
   */
  constructor(ctx: Context, host: SettingsScope<ThemeSettings>) {
    this.ctx = ctx
    this.host = host
    this.preference = DEFAULT_PREFERENCE
    // Non-browser runs (node e2e booting the client tree) have no matchMedia.
    this.media = typeof matchMedia === 'undefined' ? undefined : matchMedia('(prefers-color-scheme: dark)')
    this.snapshot = this.buildSnapshot()
    if (this.media !== undefined) {
      const media = this.media
      const onChange = (): void => {
        if (this.preference !== 'system') return
        this.publish()
      }
      ctx.effect(() => {
        media.addEventListener('change', onChange)
        return () => { media.removeEventListener('change', onChange) }
      }, 'ui-theme: prefers-color-scheme listener')
    }
    ctx.effect(() => host.subscribe(() => { this.adopt() }), 'ui-theme: settings scope adoption')
    this.adopt()
  }

  /**
   * Read the current immutable theme snapshot.
   * @returns the current snapshot (stable reference until the next change).
   */
  getTheme(): ThemeSnapshot {
    return this.snapshot
  }

  /**
   * Export the current token directory without reading DOM or computed styles.
   * @returns stable JSON-safe token descriptions, including registered and override-only names.
   */
  exportInspectTokens(): ThemeTokenInspection[] {
    const tokens = new Map(BUILTIN_INSPECT_TOKENS.map(token => [token.name, token]))
    for (const theme of this.themes) {
      for (const name of Object.keys(theme.tokens)) {
        if (!tokens.has(name)) tokens.set(name, dynamicToken(name))
      }
    }
    for (const palette of this.palettes) {
      for (const name of Object.keys(palette.tokens)) {
        if (!tokens.has(name)) tokens.set(name, dynamicToken(name))
      }
    }
    for (const layer of this.overrides.values()) {
      for (const name of Object.keys(layer.tokens)) {
        if (!tokens.has(name)) tokens.set(name, dynamicToken(name))
      }
    }
    return [...tokens.values()].map(token => ({ ...token })).sort((left, right) => left.name.localeCompare(right.name))
  }

  /**
   * Switch the fixed light/dark/system color-scheme preference.
   * @param id - built-in color-scheme preference; unknown runtime values throw.
   */
  setTheme(id: ThemePreference): void {
    if (!isThemePreference(id)) {
      throw new Error(`theme preference "${String(id)}" must be light, dark, or system`)
    }
    if (this.preference === id) return
    this.preference = id
    void this.host.set(THEME_PREFERENCE_FIELD, id)
    this.publish()
  }

  /**
   * Select a currently registered palette without changing light/dark/system.
   * @param id - registered palette id.
   */
  setPalette(id: ThemePaletteId): void {
    if (!this.palettes.some(palette => palette.id === id)) {
      throw new Error(`palette "${id}" is not registered`)
    }
    if (this.palette === id) return
    this.palette = id
    void this.host.set(THEME_PALETTE_FIELD, id)
    this.publish()
  }

  /**
   * Register an orthogonal paired palette.
   * @param definition - id, optional label, and light/dark token pairs.
   * @returns disposer retaining a durable missing id when active.
   */
  registerPalette(definition: PaletteDefinition): () => void {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(definition.id)) {
      throw new TypeError(`palette id "${definition.id}" must be lowercase kebab-case`)
    }
    if (this.palettes.some(palette => palette.id === definition.id)) {
      throw new Error(`palette "${definition.id}" is already registered`)
    }
    const entry = freezePalette(definition)
    this.palettes = [...this.palettes, entry]
    this.publish()
    return () => {
      if (!this.palettes.includes(entry)) return
      this.palettes = this.palettes.filter(palette => palette !== entry)
      this.publish()
    }
  }

  /**
   * Persist one complete Custom palette and verify Host read-back.
   * @param colors - complete strict-hex semantic values.
   * @returns whether the accepted settings snapshot equals the requested values.
   */
  async saveCustomPalette(colors: CustomPalette): Promise<boolean> {
    if (!isCustomPalette(colors)) throw new TypeError('custom palette must contain strict #RRGGBB values')
    const copy = cloneCustomPalette(colors)
    await this.host.set('customPalette', copy)
    const accepted = this.host.getSnapshot().value?.customPalette
    return accepted !== undefined && JSON.stringify(accepted) === JSON.stringify(copy)
  }

  /** Adopt accepted durable values without writing them back. */
  private adopt(): void {
    const section = this.host.getSnapshot().value
    if (section === undefined) return
    const nextCustom = isCustomPalette(section.customPalette)
      ? cloneCustomPalette(section.customPalette)
      : this.customPalette
    const nextPalette = section.palette
    const changed = this.preference !== section.preference || this.palette !== nextPalette
      || JSON.stringify(nextCustom) !== JSON.stringify(this.customPalette)
    if (!changed) return
    this.preference = section.preference
    this.palette = nextPalette
    this.customPalette = nextCustom
    this.palettes = this.palettes.map(palette => palette.id === CUSTOM_PALETTE_ID
      ? customPaletteDefinition(this.customPalette)
      : palette)
    this.publish()
  }

  /**
   * Stack a token override layer on top of the active theme — the token-level
   * analogue of slot shading: the base theme stays untouched, layers compose
   * in seq order with later layers winning per-token, and removing a layer
   * restores whatever it covered. Calling again with the same source replaces
   * that source's whole layer and restacks it on top (effect re-registration
   * semantics). Emits `theme/change` with the recomposed snapshot.
   * @param source - layer identity; one layer per source (dynamic packages
   * pass their package id — the façade pins it, so it also names the layer's
   * origin for inspection).
   * @param tokens - token-name → `{ light, dark }` value pairs. Validated at
   * runtime (model-authored callers reach this boundary with untyped JS);
   * a bare string value throws a teaching error.
   * @returns disposer removing exactly the layer this call created; a no-op
   * once the source has re-overridden (the newer layer is not torn down).
   */
  overrideTokens(source: string, tokens: ThemeTokenOverrides): () => void {
    const layer = { seq: this.overrideSeq++, tokens: validateOverrides(source, tokens) }
    this.overrides.set(source, layer)
    this.publish()
    return () => {
      if (this.overrides.get(source) !== layer) return
      this.overrides.delete(source)
      this.publish()
    }
  }

  private buildSnapshot(): ThemeSnapshot {
    const resolvedId = this.preference === 'system'
      ? (this.media?.matches === true ? 'dark' : 'light')
      : this.preference
    // Both fixed bases always exist and every accepted preference resolves to one.
    const active = this.themes.find(t => t.id === resolvedId)
    /* v8 ignore next 2 -- needs a registry without light/dark, which register()/dispose() cannot produce */
    if (active === undefined) throw new Error(`theme registry lost "${resolvedId}"`)
    const activePalette = this.palettes.find(palette => palette.id === this.palette) ?? DEFAULT_PALETTE
    return Object.freeze({
      preference: this.preference,
      active: this.composeActive(active, activePalette),
      themes: Object.freeze([...this.themes]),
      palette: this.palette,
      palettes: Object.freeze([...this.palettes]),
      missingPalette: activePalette.id !== this.palette,
      activePalette,
      customPalette: this.customPalette,
      revision: this.revision,
    })
  }

  /**
   * Fold the override layers into the active definition: seq order, later
   * layers win per-token, each value picked for the active color scheme (the
   * presenter consumes the composed snapshot and needs no override awareness).
   * Without layers the registered definition passes through by identity.
   */
  private composeActive(active: ThemeDefinition, palette: PaletteDefinition): ThemeDefinition {
    if (Object.keys(palette.tokens).length === 0 && this.overrides.size === 0) return active
    const tokens: ThemeTokens = { ...active.tokens }
    for (const [name, modes] of Object.entries(palette.tokens)) {
      tokens[name] = modes[active.colorScheme]
    }
    for (const layer of [...this.overrides.values()].sort((a, b) => a.seq - b.seq)) {
      for (const [name, modes] of Object.entries(layer.tokens)) {
        tokens[name] = modes[active.colorScheme]
      }
    }
    return Object.freeze({ ...active, tokens: Object.freeze(tokens) })
  }

  private publish(): void {
    this.revision += 1
    this.snapshot = this.buildSnapshot()
    this.ctx.emit('theme/change', this.snapshot)
  }
}

function cloneCustomPalette(colors: Readonly<CustomPalette>): CustomPalette {
  return Object.freeze({
    light: Object.freeze({ ...colors.light }),
    dark: Object.freeze({ ...colors.dark }),
  })
}

function freezePalette(definition: PaletteDefinition): PaletteDefinition {
  return Object.freeze({
    id: definition.id,
    ...(definition.label === undefined ? {} : { label: definition.label }),
    tokens: Object.freeze(validateOverrides(`palette:${definition.id}`, definition.tokens)),
  })
}

/**
 * Runtime shape check for one override layer (model-authored callers pass
 * untyped JS through the dynamic-package façade, so the static type cannot
 * enforce the pair shape there). Returns a defensive per-token copy so later
 * caller mutation cannot reach the stored layer.
 */
function validateOverrides(source: string, tokens: ThemeTokenOverrides): ThemeTokenOverrides {
  const validated: ThemeTokenOverrides = {}
  for (const [name, value] of Object.entries<unknown>(tokens)) {
    if (typeof value === 'string') {
      throw new TypeError(
        `theme override "${name}" from "${source}" is a bare string — pass { light: ${JSON.stringify(value)}, dark: ${JSON.stringify(value)} } `
        + '(repeat the value when it is the same in both palettes); a single value goes illegible when the user switches color scheme',
      )
    }
    if (typeof value !== 'object' || value === null
      || typeof (value as { light?: unknown }).light !== 'string'
      || typeof (value as { dark?: unknown }).dark !== 'string') {
      throw new TypeError(
        `theme override "${name}" from "${source}" must map to a { light, dark } pair of strings — one value per color scheme`,
      )
    }
    const modes = value as ThemeTokenModes
    validated[name] = Object.freeze({ light: modes.light, dark: modes.dark })
  }
  return validated
}

function dynamicToken(name: string): ThemeTokenInspection {
  return {
    name,
    description: 'Theme token registered by the current Client composition.',
    valueType: 'CSS value',
    requiresLightAndDark: true,
    ...(name.startsWith('--') ? { cssVariable: name } : {}),
  }
}

/**
 * Required services: settings transport plus slots/locale for the Appearance
 * row. `remote` carries the forwarded settings invalidation that
 * `bindSettingsScope` subscribes to on this context.
 */
export const inject = ['slots', 'locale', 'connection', 'remote', 'settingsScope']

/**
 * Client plugin body: provide the theme service and register the
 * feature-owned Appearance preference row into the General section's item
 * slot (a feature owns its settings surface).
 * @param ctx - client cordis context.
 */
export function apply(ctx: ClientContext): void {
  const host = ctx.settingsScope.bind<ThemeSettings>({ namespace: THEME_SETTINGS_NAMESPACE })
  const theme = new ThemeRuntime(ctx, host)
  ctx.provide('theme', theme)

  ctx.effect(() => ctx.locale.register(SETTINGS_NS, { zh, en }), 'ui-theme: settings row dictionaries')

  const store = createAppearanceRowStore()
  let bound: BoundActions<typeof store> | undefined
  const sync = (snapshot: ThemeSnapshot): void => {
    bound?.sync(
      snapshot.preference,
      snapshot.revision,
      snapshot.palette,
      snapshot.palettes.map(palette => ({ id: palette.id, label: palette.label ?? palette.id })),
      snapshot.missingPalette,
      snapshot.customPalette,
    )
  }
  ctx.on('theme/change', sync)
  const injected = (actions: BoundActions<typeof store>): AppearanceRowInjected => {
    bound = actions
    // Re-sync from the getter so no event is lost between registration and
    // first render (the store's revision guard drops stale duplicates).
    sync(theme.getTheme())
    return {
      setTheme: (id) => { theme.setTheme(id) },
      setPalette: (id) => { theme.setPalette(id) },
    }
  }
  ctx.slots.inject('settings.general.item', () => ctx.slots.register({
    name: 'settings.general.item',
    id: 'appearance',
    order: 10,
    children: {
      'settings.appearance.item': { kind: 'list', scope: 'root' },
    },
    store,
    locale: SETTINGS_NS,
    inject: injected,
  }, AppearanceRow))

  let disposePreview: (() => void) | undefined
  const cancelPreview = (): void => {
    disposePreview?.()
    disposePreview = undefined
  }
  const customInjected = (): CustomPaletteEditorInjected => ({
    preview: (colors) => {
      cancelPreview()
      disposePreview = theme.overrideTokens('ui-theme:custom-preview', customPaletteDefinition(colors).tokens)
    },
    save: async colors => theme.saveCustomPalette(colors),
    cancelPreview,
  })
  ctx.effect(() => () => { cancelPreview() }, 'ui-theme: custom preview cleanup')
  ctx.slots.inject('settings.appearance.item', () => ctx.slots.register({
    name: 'settings.appearance.item',
    id: 'custom-palette',
    order: 10,
    store,
    locale: SETTINGS_NS,
    inject: customInjected,
  }, CustomPaletteEditor))
}
