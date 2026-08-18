// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import {
  WorkspaceFileViewerAction, WorkspaceFileViewerOverlay, type WorkspaceFileViewerActionProps,
  type WorkspaceFileViewerInjected, type WorkspaceFileViewerOverlayProps,
} from '../src/client/WorkspaceFileViewerPanel.tsx'
import { zh } from '../src/client/locales.ts'

afterEach(() => {
  cleanup()
})

const t = makeTranslate(zh)

function props(overrides: Partial<WorkspaceFileViewerInjected> = {}): WorkspaceFileViewerInjected {
  return {
    roots: async () => [{ id: '0', path: '/workspace', label: 'Workspace' }],
    list: async (_rootId, path) => ({
      root: { id: '0', path: '/workspace', label: 'Workspace' },
      path,
      breadcrumbs: path === '' ? [] : [{ path: 'docs', name: 'docs', kind: 'directory', readable: false }],
      entries: path === ''
        ? [
          { path: 'docs', name: 'docs', kind: 'directory', readable: false },
          { path: 'README.md', name: 'README.md', kind: 'file', readable: true, size: 7 },
          { path: 'archive.zip', name: 'archive.zip', kind: 'file', readable: false, size: 3 },
        ]
        : [
          { path: 'docs/note.txt', name: 'note.txt', kind: 'file', readable: true, size: 4 },
        ],
    }),
    read: async (_rootId, path) => ({
      root: { id: '0', path: '/workspace', label: 'Workspace' },
      path,
      name: path.split('/').at(-1) ?? path,
      mode: path.endsWith('.md') ? 'markdown' : path.endsWith('.html') ? 'html' : 'text',
      content: path.endsWith('.md') ? '# Title' : 'note',
      size: 7,
    }),
    save: async (_rootId, path, content) => ({
      root: { id: '0', path: '/workspace', label: 'Workspace' },
      path,
      name: path.split('/').at(-1) ?? path,
      mode: path.endsWith('.md') ? 'markdown' : path.endsWith('.html') ? 'html' : 'text',
      content,
      size: content.length,
    }),
    addToChat: () => {},
    ...overrides,
  }
}

describe('WorkspaceFileViewerPanel', () => {
  it('opens from the sidebar action, navigates folders, and previews Markdown and text', async () => {
    const injected = props()
    render(
      <>
        <WorkspaceFileViewerAction {...({ ...injected, wide: true, t } as WorkspaceFileViewerActionProps)} />
        <WorkspaceFileViewerOverlay {...({ ...injected, t } as WorkspaceFileViewerOverlayProps)} />
      </>,
    )

    fireEvent.click(screen.getByRole('button', { name: zh['action.aria'] }))
    expect(await screen.findByRole('heading', { name: zh['panel.title'] })).toBeDefined()
    expect(await screen.findByRole('button', { name: 'README.md7 bytes' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'archive.zip3 bytes' }).getAttribute('aria-disabled')).toBe('true')

    fireEvent.click(screen.getByRole('button', { name: 'README.md7 bytes' }))
    expect(await screen.findByRole('heading', { name: 'README.md' })).toBeDefined()
    expect(screen.getByRole('heading', { name: 'Title' })).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'docs' }))
    expect(await screen.findByRole('button', { name: 'note.txt4 bytes' })).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'note.txt4 bytes' }))
    await waitFor(() => {
      expect(within(screen.getByText('note').closest('pre') ?? document.body).getByText('note')).toBeDefined()
    })
  })

  it('adds paths to chat from the row context menu and collapses the explorer', async () => {
    const addToChat = vi.fn()
    const injected = props({ addToChat })
    render(
      <>
        <WorkspaceFileViewerAction {...({ ...injected, wide: true, t } as WorkspaceFileViewerActionProps)} />
        <WorkspaceFileViewerOverlay {...({ ...injected, t } as WorkspaceFileViewerOverlayProps)} />
      </>,
    )

    fireEvent.click(screen.getByRole('button', { name: zh['action.aria'] }))
    const row = await screen.findByRole('button', { name: 'README.md7 bytes' })
    fireEvent.contextMenu(row, { clientX: 30, clientY: 40 })
    fireEvent.click(await screen.findByRole('menuitem', { name: zh['menu.addToChat'] }))
    expect(addToChat).toHaveBeenCalledWith('/workspace/README.md')

    fireEvent.click(screen.getByRole('button', { name: zh['panel.collapse'] }))
    expect(screen.queryByRole('button', { name: 'README.md7 bytes' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: zh['panel.expand'] }))
    expect(await screen.findByRole('button', { name: 'README.md7 bytes' })).toBeDefined()
  })

  it('edits, saves, and cancels file text from the viewer', async () => {
    const save = vi.fn(async (_rootId: string, path: string, content: string) => ({
      root: { id: '0', path: '/workspace', label: 'Workspace' },
      path,
      name: path.split('/').at(-1) ?? path,
      mode: 'text' as const,
      content,
      size: content.length,
    }))
    const injected = props({ save })
    render(
      <>
        <WorkspaceFileViewerAction {...({ ...injected, wide: true, t } as WorkspaceFileViewerActionProps)} />
        <WorkspaceFileViewerOverlay {...({ ...injected, t } as WorkspaceFileViewerOverlayProps)} />
      </>,
    )

    fireEvent.click(screen.getByRole('button', { name: zh['action.aria'] }))
    fireEvent.click(await screen.findByRole('button', { name: 'README.md7 bytes' }))
    fireEvent.click(await screen.findByRole('button', { name: zh['viewer.edit'] }))
    const editor = screen.getByRole('textbox')
    fireEvent.change(editor, { target: { value: '# Changed' } })
    fireEvent.click(screen.getByRole('button', { name: zh['viewer.view'] }))
    expect(screen.queryByRole('textbox')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: zh['viewer.edit'] }))
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('# Changed')
    fireEvent.click(screen.getByRole('button', { name: zh['viewer.cancel'] }))
    fireEvent.click(screen.getByRole('button', { name: zh['viewer.edit'] }))
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('# Title')
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '# Saved' } })
    fireEvent.click(screen.getByRole('button', { name: zh['viewer.save'] }))
    await waitFor(() => {
      expect(save).toHaveBeenCalledWith('0', 'README.md', '# Saved')
    })
    expect(await screen.findByText(/Saved/u)).toBeDefined()
  })
})
