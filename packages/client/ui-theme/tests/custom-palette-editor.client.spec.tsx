// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-web-react'
import { CustomPaletteEditor, type CustomPaletteEditorProps } from '../src/client/CustomPaletteEditor.tsx'
import { createAppearanceRowStore } from '../src/client/settings-store.ts'
import {
  CUSTOM_PALETTE_ID, DEFAULT_CUSTOM_PALETTE, DEFAULT_PALETTE_ID, type CustomPalette,
} from '../src/theme-settings.ts'
import { en } from '../src/client/locales.ts'

const neverHook = (() => { throw new Error('unused hook') }) as never
const t: CustomPaletteEditorProps['t'] = key => (en as Record<string, string>)[key] ?? key
const clone = (colors: Readonly<CustomPalette>): CustomPalette => ({ light: { ...colors.light }, dark: { ...colors.dark } })

afterEach(cleanup)

function mount(save = vi.fn(async () => true)) {
  const store = createAppearanceRowStore().create()
  store.actions.sync('system', 0, CUSTOM_PALETTE_ID, [
    { id: DEFAULT_PALETTE_ID, label: 'Default' }, { id: CUSTOM_PALETTE_ID, label: 'Custom' },
  ])
  const preview = vi.fn<CustomPaletteEditorProps['preview']>()
  const cancelPreview = vi.fn()
  const props: CustomPaletteEditorProps = {
    useSessions: neverHook,
    useWorkspaces: neverHook,
    useStore: bindSnapshotSelector(store),
    actions: store.actions,
    t,
    preview,
    save,
    cancelPreview,
  }
  render(<CustomPaletteEditor {...props} />)
  return { store, preview, save, cancelPreview }
}

describe('CustomPaletteEditor', () => {
  it('switches one paired draft through accessible keyboard tabs', () => {
    const fixture = mount()
    const light = screen.getByRole('tab', { name: 'Light' })
    const dark = screen.getByRole('tab', { name: 'Dark' })
    expect(light.getAttribute('aria-selected')).toBe('true')
    expect(dark.getAttribute('aria-selected')).toBe('false')
    const panels = screen.getAllByRole('tabpanel', { hidden: true })
    expect(panels).toHaveLength(2)
    expect(light.getAttribute('aria-controls')).toBe(panels[0]!.id)
    expect(dark.getAttribute('aria-controls')).toBe(panels[1]!.id)
    expect(panels[0]!.hasAttribute('hidden')).toBe(false)
    expect(panels[1]!.hasAttribute('hidden')).toBe(true)
    expect(screen.queryByRole('textbox', { name: 'Dark Accent' })).toBeNull()

    fireEvent.change(screen.getByRole('textbox', { name: 'Light Accent' }), { target: { value: '#123456' } })
    const preview = fixture.preview.mock.lastCall?.[0]
    expect(preview?.light.accent).toBe('#123456')
    expect(preview?.dark).toEqual(DEFAULT_CUSTOM_PALETTE.dark)
    fireEvent.click(dark)
    expect(dark.getAttribute('aria-selected')).toBe('true')
    expect(panels[0]!.hasAttribute('hidden')).toBe(true)
    expect(panels[1]!.hasAttribute('hidden')).toBe(false)
    expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'Dark Accent' }).value)
      .toBe(DEFAULT_CUSTOM_PALETTE.dark.accent)
    expect(screen.queryByRole('textbox', { name: 'Light Accent' })).toBeNull()

    fireEvent.keyDown(dark, { key: 'Home' })
    expect(light.getAttribute('aria-selected')).toBe('true')
    fireEvent.keyDown(light, { key: 'End' })
    expect(dark.getAttribute('aria-selected')).toBe('true')
    fireEvent.keyDown(dark, { key: 'ArrowDown' })
    expect(light.getAttribute('aria-selected')).toBe('true')
    fireEvent.keyDown(light, { key: 'ArrowRight' })
    expect(dark.getAttribute('aria-selected')).toBe('true')
    fireEvent.keyDown(dark, { key: 'ArrowUp' })
    expect(light.getAttribute('aria-selected')).toBe('true')
    fireEvent.keyDown(light, { key: 'Escape' })
    expect(light.getAttribute('aria-selected')).toBe('true')
    fireEvent.keyDown(light, { key: 'ArrowLeft' })
    fireEvent.keyDown(dark, { key: 'ArrowRight' })
    expect(light.getAttribute('aria-selected')).toBe('true')
    expect(document.activeElement).toBe(light)
    expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'Light Accent' }).value).toBe('#123456')
  })

  it('keeps invalid text visible, withholds preview, and disables Save', () => {
    const fixture = mount()
    const input = screen.getByRole('textbox', { name: 'Light Accent' })
    fireEvent.change(input, { target: { value: '#12' } })
    expect((input as HTMLInputElement).value).toBe('#12')
    expect(fixture.preview).not.toHaveBeenCalled()
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Save' }).disabled).toBe(true)
  })

  it('previews native-picker edits and supports Reset and Cancel', () => {
    const fixture = mount()
    const pickers = document.querySelectorAll<HTMLInputElement>('input[type="color"]')
    fireEvent.change(pickers[0]!, { target: { value: '#123456' } })
    expect(fixture.preview.mock.lastCall?.[0].light.accent).toBe('#123456')
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(fixture.preview).toHaveBeenLastCalledWith(DEFAULT_CUSTOM_PALETTE)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(fixture.cancelPreview).toHaveBeenCalled()
    expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'Light Accent' }).value).toBe(DEFAULT_CUSTOM_PALETTE.light.accent)
  })

  it('keeps a rejected draft and clears an accepted save', async () => {
    const save = vi.fn(async () => false)
    const fixture = mount(save)
    fireEvent.change(screen.getByRole('textbox', { name: 'Light Accent' }), { target: { value: '#123456' } })
    fireEvent.click(screen.getByRole('tab', { name: 'Dark' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Dark Accent' }), { target: { value: '#654321' } })
    const paired = clone(DEFAULT_CUSTOM_PALETTE)
    paired.light.accent = '#123456'
    paired.dark.accent = '#654321'
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => { expect(save).toHaveBeenNthCalledWith(1, paired) })
    expect(fixture.cancelPreview).not.toHaveBeenCalled()
    save.mockResolvedValue(true)
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => { expect(save).toHaveBeenNthCalledWith(2, paired) })
    await waitFor(() => { expect(fixture.cancelPreview).toHaveBeenCalled() })
  })

  it('retracts a staged preview when selection leaves Custom', () => {
    const fixture = mount()
    fireEvent.change(screen.getByRole('textbox', { name: 'Light Accent' }), { target: { value: '#123456' } })
    expect(fixture.preview).toHaveBeenCalled()
    act(() => {
      fixture.store.actions.sync('system', 1, DEFAULT_PALETTE_ID, [
        { id: DEFAULT_PALETTE_ID, label: 'Default' }, { id: CUSTOM_PALETTE_ID, label: 'Custom' },
      ])
    })
    expect(fixture.cancelPreview).toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull()
  })

  it('adopts persisted external updates while clean without stomping a dirty draft', () => {
    const fixture = mount()
    const external = clone(DEFAULT_CUSTOM_PALETTE)
    external.light.accent = '#ABCDEF'
    act(() => { fixture.store.actions.sync('system', 1, CUSTOM_PALETTE_ID, [{ id: CUSTOM_PALETTE_ID, label: 'Custom' }], false, external) })
    expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'Light Accent' }).value).toBe('#ABCDEF')
    fireEvent.change(screen.getByRole('textbox', { name: 'Light Accent' }), { target: { value: '#123456' } })
    const later = clone(external)
    later.light.accent = '#FEDCBA'
    act(() => { fixture.store.actions.sync('system', 2, CUSTOM_PALETTE_ID, [{ id: CUSTOM_PALETTE_ID, label: 'Custom' }], false, later) })
    expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'Light Accent' }).value).toBe('#123456')
  })
})
