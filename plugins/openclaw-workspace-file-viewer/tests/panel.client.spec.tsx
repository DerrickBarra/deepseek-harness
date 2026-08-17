// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
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

function props(): WorkspaceFileViewerInjected {
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
      mode: path.endsWith('.md') ? 'markdown' : 'text',
      content: path.endsWith('.md') ? '# Title' : 'note',
      size: 7,
    }),
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
    expect(screen.getByRole('button', { name: 'archive.zip3 bytes' }).hasAttribute('disabled')).toBe(true)

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
})
