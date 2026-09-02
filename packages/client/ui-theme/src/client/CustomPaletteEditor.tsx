import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import {
  CUSTOM_PALETTE_ID, DEFAULT_CUSTOM_PALETTE, HEX_COLOR_PATTERN, SEMANTIC_COLOR_KEYS,
  type CustomPalette, type SemanticColorKey,
} from '../theme-settings.ts'
import type { ThemeKey } from './locales.ts'
import type { createAppearanceRowStore } from './settings-store.ts'
import css from './CustomPaletteEditor.module.css'

/** Custom editor callbacks owned by the theme service. */
export interface CustomPaletteEditorInjected {
  preview: (colors: CustomPalette) => void
  save: (colors: CustomPalette) => Promise<boolean>
  cancelPreview: () => void
}

/** Composed Custom editor props. */
export type CustomPaletteEditorProps = PropsRuntime<'settings.appearance.item'>
  & PropsStore<ReturnType<typeof createAppearanceRowStore>>
  & PropsLocale<'settings.theme'> & CustomPaletteEditorInjected

type PaletteMode = keyof CustomPalette
const MODES: readonly PaletteMode[] = ['light', 'dark']

const clone = (colors: Readonly<CustomPalette>): CustomPalette => ({
  light: { ...colors.light }, dark: { ...colors.dark },
})

/** Render staged light/dark semantic color controls. */
export function CustomPaletteEditor({ t, useStore, preview, save, cancelPreview }: CustomPaletteEditorProps) {
  const persisted = useStore(state => state.customPalette)
  const selectedPalette = useStore(state => state.palette)
  const [draft, setDraft] = useState<CustomPalette>(() => clone(persisted))
  const [activeMode, setActiveMode] = useState<PaletteMode>('light')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const tabId = useId()
  const tabs = useRef<Record<PaletteMode, HTMLButtonElement | null>>({ light: null, dark: null })
  const valid = MODES.every(candidate =>
    SEMANTIC_COLOR_KEYS.every(color => HEX_COLOR_PATTERN.test(draft[candidate][color])))
  useEffect(() => cancelPreview, [cancelPreview])
  useEffect(() => {
    if (selectedPalette !== CUSTOM_PALETTE_ID) cancelPreview()
  }, [cancelPreview, selectedPalette])
  useEffect(() => {
    if (!dirty) setDraft(clone(persisted))
  }, [dirty, persisted])

  const edit = (mode: PaletteMode, key: SemanticColorKey, value: string): void => {
    const next = clone(draft)
    next[mode][key] = value
    setDraft(next)
    setDirty(true)
    if (MODES.every(candidate =>
      SEMANTIC_COLOR_KEYS.every(color => HEX_COLOR_PATTERN.test(next[candidate][color])))) preview(next)
  }
  const reset = (): void => {
    const next = clone(DEFAULT_CUSTOM_PALETTE)
    setDraft(next)
    setDirty(true)
    preview(next)
  }
  const cancel = (): void => {
    setDraft(clone(persisted))
    setDirty(false)
    cancelPreview()
  }
  const commit = async (): Promise<void> => {
    if (!valid) return
    setSaving(true)
    try {
      const accepted = await save(draft)
      if (accepted) {
        setDirty(false)
        cancelPreview()
      }
    } finally {
      setSaving(false)
    }
  }
  const activateMode = (mode: PaletteMode, focus: boolean): void => {
    setActiveMode(mode)
    if (focus) tabs.current[mode]?.focus()
  }
  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, mode: PaletteMode): void => {
    let next: PaletteMode | undefined
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = mode === 'light' ? 'dark' : 'light'
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = mode === 'dark' ? 'light' : 'dark'
    if (event.key === 'Home') next = 'light'
    if (event.key === 'End') next = 'dark'
    if (next === undefined) return
    event.preventDefault()
    activateMode(next, true)
  }

  if (selectedPalette !== CUSTOM_PALETTE_ID) return null

  return (
    <div className={css.editor}>
      <div className={css.title}>{t('custom.title')}</div>
      <div className={css.tabs} role="tablist" aria-label={t('custom.title')}>
        {MODES.map(mode => (
          <button
            key={mode}
            ref={(node) => { tabs.current[mode] = node }}
            id={`${tabId}-${mode}-tab`}
            type="button"
            role="tab"
            aria-selected={activeMode === mode}
            aria-controls={`${tabId}-${mode}-panel`}
            tabIndex={activeMode === mode ? 0 : -1}
            onClick={() => { activateMode(mode, false) }}
            onKeyDown={(event) => { onTabKeyDown(event, mode) }}
          >
            {t(`custom.${mode}` as ThemeKey)}
          </button>
        ))}
      </div>
      {MODES.map(mode => (
        <div
          key={mode}
          id={`${tabId}-${mode}-panel`}
          role="tabpanel"
          aria-labelledby={`${tabId}-${mode}-tab`}
          className={css.panel}
          hidden={activeMode !== mode}
        >
          <fieldset>
            <legend>{t(`custom.${mode}` as ThemeKey)}</legend>
            {SEMANTIC_COLOR_KEYS.map(key => (
              <label key={key}>
                <span>{t(`custom.${key}` as ThemeKey)}</span>
                <input
                  type="color"
                  value={HEX_COLOR_PATTERN.test(draft[mode][key]) ? draft[mode][key] : '#000000'}
                  onChange={(event) => { edit(mode, key, event.currentTarget.value) }}
                />
                <input
                  aria-label={`${t(`custom.${mode}` as ThemeKey)} ${t(`custom.${key}` as ThemeKey)}`}
                  pattern="#[0-9A-Fa-f]{6}"
                  maxLength={7}
                  value={draft[mode][key]}
                  onChange={(event) => { edit(mode, key, event.currentTarget.value) }}
                />
              </label>
            ))}
          </fieldset>
        </div>
      ))}
      <div className={css.actions}>
        <button type="button" onClick={reset}>{t('custom.reset')}</button>
        <button type="button" onClick={cancel}>{t('custom.cancel')}</button>
        <button type="button" disabled={saving || !valid} onClick={() => { void commit() }}>{t('custom.save')}</button>
      </div>
    </div>
  )
}
