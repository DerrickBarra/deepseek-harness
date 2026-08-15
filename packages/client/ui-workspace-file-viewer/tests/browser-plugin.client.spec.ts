import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import InvariantRegistry from '@deepseek-ai/dsh-invariants'
import { SlotRegistry } from '@deepseek-ai/dsh-client-runtime/client'
import { stubSettingsScope } from '@deepseek-ai/dsh-client-test-runtime'
import { apply as applyLocale, inject as localeInject } from '@deepseek-ai/dsh-client-locale/client'
import { apply, inject } from '../src/client/index.ts'
import { apply as applyNode } from '../src/index.ts'
import * as ViewerInvariant from '../src/invariant.ts'
import { en, NS, zh } from '../src/client/locales.ts'

async function bench(): Promise<{ ctx: Context; fiber: ReturnType<Context['plugin']> }> {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  ctx.slots.register({
    name: 'root',
    children: {
      'sidebar.footer.action': { kind: 'list', scope: 'root' },
      'shell.overlay': { kind: 'list', scope: 'root' },
    },
  } as never, () => null)
  ctx.provide('remote', {
    $on: () => () => {},
    workspaceFileViewer: {
      roots: async () => ({ ok: true, value: [] }),
      list: async () => ({ ok: true, value: { entries: [] } }),
      read: async () => ({ ok: true, value: { content: '' } }),
    },
  } as never)
  ctx.provide('remote.workspaceFileViewer', {} as never)
  ctx.provide('connection', { api: { settings: {} }, isLoopback: false } as never)
  ctx.provide('settingsScope', { bind: () => stubSettingsScope().scope } as never)
  await ctx.plugin({ inject: localeInject, apply: applyLocale }).await()
  const fiber = ctx.plugin({ inject: [...inject], apply })
  await fiber.await()
  return { ctx, fiber }
}

describe('ui-workspace-file-viewer browser half', () => {
  it('declares the services it binds', () => {
    expect(inject).toEqual(['slots', 'locale', 'remote', 'remote.workspaceFileViewer'])
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
  it('contributes no host behavior and registers an empty invariant companion', async () => {
    expect(applyNode).not.toThrow()
    const ctx = new Context()
    await ctx.plugin(InvariantRegistry, { enabled: true })
    const fiber = ctx.plugin(ViewerInvariant)
    await expect(fiber.await()).resolves.toBeDefined()
    await fiber.dispose()
    await ctx.fiber.dispose()
  })
})
