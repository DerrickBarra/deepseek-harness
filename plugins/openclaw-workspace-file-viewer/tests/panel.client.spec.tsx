// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import {
  closeWorkspaceFileViewer, openWorkspaceFileViewerTarget, resolveHtmlPreviewPath, WorkspaceFileViewerAction,
  WorkspaceFileViewerOverlay, type WorkspaceFileViewerActionProps,
  type WorkspaceFileViewerInjected, type WorkspaceFileViewerOverlayProps,
} from '../src/client/WorkspaceFileViewerPanel.tsx'
import { zh } from '../src/client/locales.ts'

afterEach(() => {
  closeWorkspaceFileViewer()
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
          { path: '.env', name: '.env', kind: 'file', readable: false, size: 9 },
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
      content: path.endsWith('.md')
        ? '# Title'
        : path.endsWith('.html') ? '<a href="next.html">Next</a>' : path === '.env' ? 'KEY=value' : 'note',
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
    resolveOpenPath: async (rawTarget) => ({
      root: { id: '0', path: '/workspace', label: 'Workspace' },
      path: rawTarget.replace(/^\/workspace\/?/u, ''),
      kind: rawTarget.endsWith('/docs') ? 'directory' : 'file',
      displayPath: rawTarget,
    }),
    addToChat: () => {},
    ...overrides,
  }
}

describe('WorkspaceFileViewerPanel', () => {
  it('resolves only relative local HTML preview links', () => {
    expect(resolveHtmlPreviewPath('docs/index.html', 'next.html')).toBe('docs/next.html')
    expect(resolveHtmlPreviewPath('docs/index.html', './next.html#details')).toBe('docs/next.html')
    expect(resolveHtmlPreviewPath('docs/current/index.html', '../next.html')).toBe('docs/next.html')
    expect(resolveHtmlPreviewPath('docs/index.html', '#section')).toBeUndefined()
    expect(resolveHtmlPreviewPath('docs/index.html', 'next.md')).toBeUndefined()
    expect(resolveHtmlPreviewPath('docs/index.html', '/workspace/next.html')).toBeUndefined()
    expect(resolveHtmlPreviewPath('docs/index.html', 'https://example.test/next.html')).toBeUndefined()
    expect(resolveHtmlPreviewPath('index.html', '../next.html')).toBeUndefined()
  })

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

  it('opens dotenv files without the unsupported hover even when list metadata is stale', async () => {
    const save = vi.fn(props().save)
    const injected = props({ save })
    render(
      <>
        <WorkspaceFileViewerAction {...({ ...injected, wide: true, t } as WorkspaceFileViewerActionProps)} />
        <WorkspaceFileViewerOverlay {...({ ...injected, t } as WorkspaceFileViewerOverlayProps)} />
      </>,
    )

    fireEvent.click(screen.getByRole('button', { name: zh['action.aria'] }))
    const row = await screen.findByRole('button', { name: '.env9 bytes' })
    expect(row.getAttribute('aria-disabled')).toBe('false')
    expect(row.getAttribute('title')).toBeNull()
    fireEvent.click(row)
    expect(await screen.findByRole('heading', { name: '.env' })).toBeDefined()
    expect(await screen.findByText('KEY=value')).toBeDefined()

    fireEvent.click(await screen.findByRole('button', { name: zh['viewer.edit'] }))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'KEY=hidden' } })
    fireEvent.click(screen.getByRole('button', { name: zh['viewer.save'] }))
    await waitFor(() => {
      expect(save).toHaveBeenCalledWith('0', '.env', 'KEY=hidden')
    })
    expect(await screen.findByText('KEY=hidden')).toBeDefined()
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

  it('opens a resolved folder in the explorer and clears file preview state', async () => {
    const read = vi.fn(props().read)
    const injected = props({ read })
    render(<WorkspaceFileViewerOverlay {...({ ...injected, t } as WorkspaceFileViewerOverlayProps)} />)

    openWorkspaceFileViewerTarget({
      root: { id: '0', path: '/workspace', label: 'Workspace' },
      path: 'docs',
      kind: 'directory',
      displayPath: '/workspace/docs',
    })

    expect(await screen.findByRole('heading', { name: zh['panel.title'] })).toBeDefined()
    expect(await screen.findByRole('button', { name: 'note.txt4 bytes' })).toBeDefined()
    expect(screen.getByText(zh['viewer.empty'])).toBeDefined()
    expect(read).not.toHaveBeenCalled()
  })

  it('opens a resolved file with its parent folder context visible', async () => {
    const list = vi.fn(props().list)
    const read = vi.fn(props().read)
    const injected = props({ list, read })
    render(<WorkspaceFileViewerOverlay {...({ ...injected, t } as WorkspaceFileViewerOverlayProps)} />)

    openWorkspaceFileViewerTarget({
      root: { id: '0', path: '/workspace', label: 'Workspace' },
      path: 'docs/note.txt',
      kind: 'file',
      displayPath: '/workspace/docs/note.txt',
    })

    expect(await screen.findByRole('heading', { name: 'note.txt' })).toBeDefined()
    expect(await screen.findByRole('button', { name: 'note.txt4 bytes' })).toBeDefined()
    expect(list).toHaveBeenCalledWith('0', 'docs')
    expect(read).toHaveBeenCalledWith('0', 'docs/note.txt')
  })

  it('stores positive line hints and scrolls text previews to the hinted line', async () => {
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    const injected = props({
      read: async (_rootId, path) => ({
        root: { id: '0', path: '/workspace', label: 'Workspace' },
        path,
        name: 'note.txt',
        mode: 'text',
        content: 'first\nsecond\nthird',
        size: 18,
      }),
    })
    render(<WorkspaceFileViewerOverlay {...({ ...injected, t } as WorkspaceFileViewerOverlayProps)} />)

    openWorkspaceFileViewerTarget({
      root: { id: '0', path: '/workspace', label: 'Workspace' },
      path: 'docs/note.txt',
      kind: 'file',
      displayPath: '/workspace/docs/note.txt',
      line: 2,
    })

    expect(await screen.findByRole('heading', { name: 'note.txt' })).toBeDefined()
    await waitFor(() => {
      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center' })
    })
    expect(document.querySelector('[data-line="2"]')?.textContent).toBe('second\n')
  })

  it('routes relative HTML preview links through the workspace reader', async () => {
    const read = vi.fn(props().read)
    const list = vi.fn(props().list)
    const injected = props({ read, list })
    render(
      <>
        <WorkspaceFileViewerAction {...({ ...injected, wide: true, t } as WorkspaceFileViewerActionProps)} />
        <WorkspaceFileViewerOverlay {...({ ...injected, t } as WorkspaceFileViewerOverlayProps)} />
      </>,
    )

    fireEvent.click(screen.getByRole('button', { name: zh['action.aria'] }))
    fireEvent.click(await screen.findByRole('button', { name: 'docs' }))
    fireEvent.click(await screen.findByRole('button', { name: 'note.txt4 bytes' }))
    await screen.findByRole('heading', { name: 'note.txt' })
    read.mockClear()
    fireEvent.click(screen.getByRole('button', { name: zh['breadcrumb.root'] }))
    await screen.findByRole('button', { name: 'README.md7 bytes' })

    read.mockImplementation(async (_rootId, path) => ({
      root: { id: '0', path: '/workspace', label: 'Workspace' },
      path,
      name: path.split('/').at(-1) ?? path,
      mode: 'html',
      content: '<a href="next.html">Next</a><a href="https://example.test/">External</a>',
      size: 64,
    }))
    fireEvent.click(screen.getByRole('button', { name: 'README.md7 bytes' }))
    expect(await screen.findByRole('heading', { name: 'README.md' })).toBeDefined()
    const frame = document.querySelector('iframe')
    expect(frame).not.toBeNull()
    const frameDocument = frame?.contentDocument
    expect(frameDocument).toBeDefined()
    frameDocument!.body.innerHTML = '<a href="next.html">Next</a><a href="https://example.test/">External</a>'
    fireEvent.load(frame!)
    fireEvent.click(frameDocument!.querySelector('a[href="next.html"]')!)
    await waitFor(() => {
      expect(read).toHaveBeenCalledWith('0', 'next.html')
    })
    const externalClick = new window.MouseEvent('click', { bubbles: true, cancelable: true })
    frameDocument!.querySelector('a[href="https://example.test/"]')!.dispatchEvent(externalClick)
    expect(externalClick.defaultPrevented).toBe(true)
    expect(list).toHaveBeenCalledWith('0', '')
  })
})
