/**
 * Appearance preference row registered into the General section item slot
 * (figma 501:30012 'Frame 2117131228'): title + three preference cubes.
 * Registered by this package — the theme feature owns its own settings
 * surface. Selection follows the persisted preference, never the resolved
 * active theme.
 */
import clsx from 'clsx'
import {
  IconDarkOutline16, IconFollowsystemOutline16, IconLightOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRenderSlots, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import {
  CUSTOM_PALETTE_ID, DEFAULT_PALETTE_ID, type ThemePaletteId, type ThemePreference,
} from '../theme-settings.ts'
import type { ThemeKey } from './locales.ts'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type { createAppearanceRowStore } from './settings-store.ts'
import css from './AppearanceRow.module.css'

/** Injected business face: the preference write (t rides the standard locale seat). */
export interface AppearanceRowInjected {
  /** Switch the color-scheme preference. */
  setTheme: (id: ThemePreference) => void
  /** Select one registered orthogonal palette. */
  setPalette: (id: ThemePaletteId) => void
}

/** Full component props: runtime share + store share + locale seat + injected face. */
export type AppearanceRowComponentProps =
  PropsRuntime<'settings.general.item'> & PropsRenderSlots<'settings.appearance.item'>
  & PropsStore<ReturnType<typeof createAppearanceRowStore>>
  & PropsLocale<'settings.theme'> & AppearanceRowInjected

/** Cube order and icons (figma 501:30015-30017: Light, Dark, System). */
const CUBES: readonly { id: ThemePreference; labelKey: ThemeKey; Icon: typeof IconLightOutline16 }[] = [
  { id: 'light', labelKey: 'appearance.light', Icon: IconLightOutline16 },
  { id: 'dark', labelKey: 'appearance.dark', Icon: IconDarkOutline16 },
  { id: 'system', labelKey: 'appearance.system', Icon: IconFollowsystemOutline16 },
]

/**
 * Render the Appearance row.
 * @param props - composed slot props.
 * @returns the row element tree.
 */
export function AppearanceRow({ t, setTheme, setPalette, useStore, renderSlot }: AppearanceRowComponentProps) {
  const preference = useStore(s => s.preference)
  const palette = useStore(s => s.palette)
  const palettes = useStore(s => s.palettes)
  const missingPalette = useStore(s => s.missingPalette)
  return (
    <div className={css.group}>
      <div className={css.title}>{t('appearance.title')}</div>
      <div className={css.cubeRow}>
        {CUBES.map(({ id, labelKey, Icon }) => (
          <button
            key={id}
            type="button"
            className={clsx(css.themeCube, preference === id && css.selected)}
            aria-pressed={preference === id}
            onClick={() => { setTheme(id) }}
          >
            <Icon />
            {t(labelKey)}
          </button>
        ))}
      </div>
      <label className={css.paletteLabel}>
        <span>{t('appearance.palette')}</span>
        <select
          value={missingPalette ? DEFAULT_PALETTE_ID : palette}
          onChange={(event) => { setPalette(event.currentTarget.value as ThemePaletteId) }}
        >
          {palettes.map(option => (
            <option key={option.id} value={option.id}>
              {option.id === DEFAULT_PALETTE_ID ? t('appearance.palette.default')
                : option.id === CUSTOM_PALETTE_ID ? t('appearance.palette.custom') : option.label}
            </option>
          ))}
        </select>
      </label>
      {renderSlot('settings.appearance.item', {})}
    </div>
  )
}
