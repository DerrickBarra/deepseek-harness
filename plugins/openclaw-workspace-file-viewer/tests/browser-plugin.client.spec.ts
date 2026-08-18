// @vitest-environment jsdom
import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it, vi } from 'vitest'
import InvariantRegistry from '@deepseek-ai/dsh-invariants'
import { SlotRegistry, type SessionId, type WorkspaceId } from '@deepseek-ai/dsh-client-runtime/client'
import { stubSettingsScope } from '@deepseek-ai/dsh-client-test-runtime'
import { apply as applyLocale, inject as localeInject } from '@deepseek-ai/dsh-client-locale/client'
import type { WorkspaceFileViewerInjected } from '../src/client/WorkspaceFileViewerPanel.tsx'
import { apply, inject } from '../src/client/index.ts'
import WorkspaceFileViewerGateway from '../src/index.ts'
import * as ViewerInvariant from '../src/invariant.ts'
import { en, NS, zh } from '../src/client/locales.ts'

type RootsResult = { ok: true; value: [] } | { ok: false; error: { message: string } }
type ListResult = { ok: true; value: { entries: []; path?: string } } | { ok: false; error: { message: string } }
type ReadResult = { ok: true; value: { content: string } } | { ok: false; error: { message: string } }
type SaveResult = { ok: true; value: { content: string } } | { ok: false; error: { message: string } }

async function bench(): Promise<{
  ctx: Context
  fiber: ReturnType<Context['plugin']>
  roots: ReturnType<typeof vi.fn<() => Promise<RootsResult>>>
  list: ReturnType<typeof vi.fn<(rootId: string, path?: string) => Promise<ListResult>>>
  read: ReturnType<typeof vi.fn<(rootId: string, path: string) => Promise<ReadResult>>>
  save: ReturnType<typeof vi.fn<(rootId: string, path: string, content: string) => Promise<SaveResult>>>
  connectWorkspace: ReturnType<typeof vi.fn<(workspaceId: WorkspaceId) => Promise<SessionId>>>
  openSession: ReturnType<typeof vi.fn<(sessionId: SessionId) => void>>
  setCurrent: (sessionId: SessionId | undefined) => void
  draft: () => string
  setDraft: (text: string) => void
}> {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  ctx.slots.register({
    name: 'root',
    children: {
      'sidebar.footer.action': { kind: 'list', scope: 'root' },
      'shell.overlay': { kind: 'list', scope: 'root' },
    },
  } as never, () => null)
  const roots = vi.fn<() => Promise<RootsResult>>().mockResolvedValue({ ok: true, value: [] })
  const list = vi.fn<(rootId: string, path?: string) => Promise<ListResult>>()
    .mockResolvedValue({ ok: true, value: { entries: [], path: '' } })
  const read = vi.fn<(rootId: string, path: string) => Promise<ReadResult>>()
    .mockResolvedValue({ ok: true, value: { content: '' } })
  const save = vi.fn<(rootId: string, path: string, content: string) => Promise<SaveResult>>()
    .mockResolvedValue({ ok: true, value: { content: '' } })
  let current: SessionId | undefined = 's-active' as SessionId
  let draft = 'existing'
  const scope = new Context()
  const connectWorkspace = vi.fn<(workspaceId: WorkspaceId) => Promise<SessionId>>()
    .mockResolvedValue('s-new' as SessionId)
  const openSession = vi.fn<(sessionId: SessionId) => void>((sessionId) => { current = sessionId })
  ctx.provide('remote', {
    $mount: async () => async () => {},
    $on: () => () => {},
    workspaceFileViewer: { roots, list, read, save },
  } as never)
  ctx.provide('remote.workspaceFileViewer', { roots, list, read, save } as never)
  ctx.provide('sessions', {
    list: {
      getSnapshot: () => ({
        ids: current === undefined ? [] : [current],
        byId: {},
        current,
        phase: 'ready',
        subagentsByParent: {},
        jobsBySession: {},
        currentAddress: undefined,
      }),
      subscribe: () => () => {},
    },
    scope: (sessionId: SessionId) => sessionId === current ? scope : undefined,
    open: openSession,
  } as never)
  ctx.provide('workspaces', {
    list: {
      getSnapshot: () => ({
        items: [
          { workspaceId: 'ws-repo', path: '/workspace/repo', sessionIds: [] },
          { workspaceId: 'ws-other', path: '/other', sessionIds: [] },
        ],
        archivedSessionIds: [],
        state: 'idle',
        phase: 'ready',
        error: null,
        baselinesReady: true,
        recentWorkspaceId: 'ws-other',
      }),
      subscribe: () => () => {},
    },
    connectWorkspace,
  } as never)
  ctx.provide('conversation', {
    input: {
      for: (actx: Context) => {
        if (actx !== scope) throw new Error('unexpected scope')
        return {
          state: { getSnapshot: () => ({ draft }) },
          setDraft: (next: string) => { draft = next },
          notify: vi.fn(),
        }
      },
    },
  } as never)
  ctx.provide('connection', { api: { settings: {} }, isLoopback: false } as never)
  ctx.provide('settingsScope', { bind: () => stubSettingsScope().scope } as never)
  await ctx.plugin({ inject: localeInject, apply: applyLocale }).await()
  const fiber = ctx.plugin({ inject: [...inject], apply })
  await fiber.await()
  return {
    ctx, fiber, roots, list, read, save, connectWorkspace, openSession,
    setCurrent: sessionId => { current = sessionId },
    draft: () => draft,
    setDraft: (text) => { draft = text },
  }
}

describe('ui-workspace-file-viewer browser half', () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  it('declares the services it binds', () => {
    expect(inject).toEqual(['slots', 'locale', 'remote', 'sessions', 'workspaces', 'conversation'])
  })

  it('registers sidebar and overlay entries and removes them on teardown', async () => {
    const { ctx, fiber } = await bench()
    expect(ctx.slots.entries('sidebar.footer.action').map(entry => entry.options.id)).toContain('workspace-file-viewer')
    expect(ctx.slots.entries('shell.overlay').map(entry => entry.options.id)).toContain('workspace-file-viewer')
    await fiber.dispose()
    expect(ctx.slots.entries('sidebar.footer.action').map(entry => entry.options.id)).not.toContain('workspace-file-viewer')
    expect(ctx.slots.entries('shell.overlay').map(entry => entry.options.id)).not.toContain('workspace-file-viewer')
    await ctx.fiber.dispose()
  })

  it('routes sidebar and overlay injected calls through remote.workspaceFileViewer', async () => {
    const { ctx, fiber, roots, list, read, save } = await bench()
    const actionInjected = ctx.slots.entries('sidebar.footer.action')[0]!.inject as unknown as () => WorkspaceFileViewerInjected
    const overlayInjected = ctx.slots.entries('shell.overlay')[0]!.inject as unknown as () => WorkspaceFileViewerInjected

    await expect(actionInjected().roots()).resolves.toEqual([])
    await expect(actionInjected().list('root-a', 'docs')).resolves.toEqual({ entries: [], path: '' })
    await expect(overlayInjected().read('root-a', 'README.md')).resolves.toEqual({ content: '' })
    await expect(overlayInjected().save('root-a', 'README.md', 'next')).resolves.toEqual({ content: '' })
    expect(roots).toHaveBeenCalledOnce()
    expect(list).toHaveBeenCalledWith('root-a', 'docs')
    expect(read).toHaveBeenCalledWith('root-a', 'README.md')
    expect(save).toHaveBeenCalledWith('root-a', 'README.md', 'next')

    roots.mockResolvedValueOnce({ ok: false, error: { message: 'no roots' } })
    await expect(actionInjected().roots()).rejects.toThrow('no roots')

    list.mockResolvedValueOnce({ ok: false, error: { message: 'offline' } })
    await expect(actionInjected().list('root-a', '')).rejects.toThrow('offline')

    read.mockResolvedValueOnce({ ok: false, error: { message: 'too large' } })
    await expect(overlayInjected().read('root-a', 'README.md')).rejects.toThrow('too large')

    await fiber.dispose()
    await ctx.fiber.dispose()
  })

  it('adds paths to the current chat draft', async () => {
    const { ctx, fiber, draft, connectWorkspace } = await bench()
    const injected = ctx.slots.entries('shell.overlay')[0]!.inject as unknown as () => WorkspaceFileViewerInjected

    await injected().addToChat('/workspace/repo/README.md')

    expect(draft()).toBe('existing\n/workspace/repo/README.md')
    expect(connectWorkspace).not.toHaveBeenCalled()
    await fiber.dispose()
    await ctx.fiber.dispose()
  })

  it('inserts paths through the visible composer textarea', async () => {
    const { ctx, fiber, draft, setDraft } = await bench()
    const composer = document.createElement('div')
    composer.dataset.composerCard = ''
    const textarea = document.createElement('textarea')
    textarea.value = 'visible'
    textarea.addEventListener('input', () => {
      setDraft(textarea.value)
    })
    composer.append(textarea)
    document.body.append(composer)
    const injected = ctx.slots.entries('shell.overlay')[0]!.inject as unknown as () => WorkspaceFileViewerInjected

    await injected().addToChat('/workspace/repo/README.md')

    expect(textarea.value).toBe('visible\n/workspace/repo/README.md')
    expect(draft()).toBe('visible\n/workspace/repo/README.md')
    await fiber.dispose()
    await ctx.fiber.dispose()
  })

  it('inserts paths into the read-only no-workspace composer when it is the visible draft', async () => {
    const { ctx, fiber, connectWorkspace, setCurrent } = await bench()
    setCurrent(undefined)
    const composer = document.createElement('div')
    composer.dataset.composerCard = ''
    const textarea = document.createElement('textarea')
    textarea.readOnly = true
    composer.append(textarea)
    document.body.append(composer)
    const injected = ctx.slots.entries('shell.overlay')[0]!.inject as unknown as () => WorkspaceFileViewerInjected

    await injected().addToChat('/workspace/repo/README.md')

    expect(textarea.value).toBe('/workspace/repo/README.md')
    expect(connectWorkspace).not.toHaveBeenCalled()
    await fiber.dispose()
    await ctx.fiber.dispose()
  })

  it('creates a workspace session before adding paths when no chat is active', async () => {
    const { ctx, fiber, connectWorkspace, openSession, setCurrent, draft } = await bench()
    setCurrent(undefined)
    const injected = ctx.slots.entries('shell.overlay')[0]!.inject as unknown as () => WorkspaceFileViewerInjected

    await injected().addToChat('/workspace/repo/plugins')

    expect(connectWorkspace).toHaveBeenCalledWith('ws-repo')
    expect(openSession).toHaveBeenCalledWith('s-new')
    expect(draft()).toBe('existing\n/workspace/repo/plugins')
    await fiber.dispose()
    await ctx.fiber.dispose()
  })

  it('registers key-identical dictionaries under its namespace', async () => {
    const { ctx, fiber } = await bench()
    const translate = ctx.locale.bind(NS)
    ctx.locale.setLocale('zh')
    expect(translate('panel.title')).toBe(zh['panel.title'])
    ctx.locale.setLocale('en')
    expect(translate('panel.title')).toBe(en['panel.title'])
    expect(Object.keys(en).sort()).toEqual(Object.keys(zh).sort())
    await fiber.dispose()
    await ctx.fiber.dispose()
  })
})

describe('ui-workspace-file-viewer node half and invariant', () => {
  it('exports the host Remote service and registers an empty invariant companion', async () => {
    expect(WorkspaceFileViewerGateway.name).toBe('WorkspaceFileViewerGateway')
    const ctx = new Context()
    await ctx.plugin(InvariantRegistry, { enabled: true })
    const fiber = ctx.plugin(ViewerInvariant)
    await expect(fiber.await()).resolves.toBeDefined()
    await fiber.dispose()
    await ctx.fiber.dispose()
  })
})
