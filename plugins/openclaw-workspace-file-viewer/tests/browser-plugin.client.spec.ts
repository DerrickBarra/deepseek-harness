import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import InvariantRegistry from '@deepseek-ai/dsh-invariants'
import { SlotRegistry } from '@deepseek-ai/dsh-client-runtime/client'
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

async function bench(): Promise<{
  ctx: Context
  fiber: ReturnType<Context['plugin']>
  roots: ReturnType<typeof vi.fn<() => Promise<RootsResult>>>
  list: ReturnType<typeof vi.fn<(rootId: string, path?: string) => Promise<ListResult>>>
  read: ReturnType<typeof vi.fn<(rootId: string, path: string) => Promise<ReadResult>>>
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
  ctx.provide('remote', {
    $mount: async () => async () => {},
    $on: () => () => {},
    workspaceFileViewer: { roots, list, read },
  } as never)
  ctx.provide('remote.workspaceFileViewer', { roots, list, read } as never)
  ctx.provide('connection', { api: { settings: {} }, isLoopback: false } as never)
  ctx.provide('settingsScope', { bind: () => stubSettingsScope().scope } as never)
  await ctx.plugin({ inject: localeInject, apply: applyLocale }).await()
  const fiber = ctx.plugin({ inject: [...inject], apply })
  await fiber.await()
  return { ctx, fiber, roots, list, read }
}

describe('ui-workspace-file-viewer browser half', () => {
  it('declares the services it binds', () => {
    expect(inject).toEqual(['slots', 'locale', 'remote'])
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
    const { ctx, fiber, roots, list, read } = await bench()
    const actionInjected = ctx.slots.entries('sidebar.footer.action')[0]!.inject as unknown as () => WorkspaceFileViewerInjected
    const overlayInjected = ctx.slots.entries('shell.overlay')[0]!.inject as unknown as () => WorkspaceFileViewerInjected

    await expect(actionInjected().roots()).resolves.toEqual([])
    await expect(actionInjected().list('root-a', 'docs')).resolves.toEqual({ entries: [], path: '' })
    await expect(overlayInjected().read('root-a', 'README.md')).resolves.toEqual({ content: '' })
    expect(roots).toHaveBeenCalledOnce()
    expect(list).toHaveBeenCalledWith('root-a', 'docs')
    expect(read).toHaveBeenCalledWith('root-a', 'README.md')

    roots.mockResolvedValueOnce({ ok: false, error: { message: 'no roots' } })
    await expect(actionInjected().roots()).rejects.toThrow('no roots')

    list.mockResolvedValueOnce({ ok: false, error: { message: 'offline' } })
    await expect(actionInjected().list('root-a', '')).rejects.toThrow('offline')

    read.mockResolvedValueOnce({ ok: false, error: { message: 'too large' } })
    await expect(overlayInjected().read('root-a', 'README.md')).rejects.toThrow('too large')

    await fiber.dispose()
    await ctx.fiber.dispose()
  })

  it('registers key-identical dictionaries under its namespace', async () => {
    const { ctx, fiber } = await bench()
    const translate = ctx.locale.bind(NS)
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
