import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import type { ChatFileMentionProvider, TurnTailOwnerProps } from '../src/client/contract/slots.ts'
import { ChatFileMentionRegistry } from '../src/client/file-mentions.ts'

const OWNER = {} as TurnTailOwnerProps

function provider(
  name: string,
  priority: number | undefined,
  setup: ChatFileMentionProvider['forClosing'],
): ChatFileMentionProvider {
  return { name, priority, forClosing: setup }
}

function mention(title: string) {
  return { open: vi.fn(), label: `Open ${title}`, title }
}

describe('ChatFileMentionRegistry', () => {
  it('orders by ascending priority then registration order with per-Turn decline and per-token fallback', () => {
    const ctx = new Context()
    const registry = new ChatFileMentionRegistry(ctx)
    const calls: string[] = []
    const fallback = mention('fallback.txt')
    const winner = mention('winner.txt')

    registry.register(provider('late', 10, () => ({
      resolve: (token) => {
        calls.push(`late:${token}`)
        return fallback
      },
    })))
    registry.register(provider('declines', -1, () => undefined))
    registry.register(provider('first', 0, () => ({
      resolve: (token) => {
        calls.push(`first:${token}`)
        return undefined
      },
    })))
    registry.register(provider('second', 0, () => ({
      resolve: (token) => {
        calls.push(`second:${token}`)
        return token === 'hit' ? winner : undefined
      },
    })))

    expect(registry.providers.getSnapshot()).toEqual([
      { name: 'declines', priority: -1 },
      { name: 'first', priority: 0 },
      { name: 'second', priority: 0 },
      { name: 'late', priority: 10 },
    ])
    const resolver = registry.forClosing(OWNER)
    expect(resolver?.resolve('hit')).toBe(winner)
    expect(calls).toEqual(['first:hit', 'second:hit'])
    calls.length = 0
    expect(resolver?.resolve('miss')).toBe(fallback)
    expect(calls).toEqual(['first:miss', 'second:miss', 'late:miss'])
  })

  it('fails duplicate live names, publishes roster changes, and disposes idempotently', () => {
    const ctx = new Context()
    const registry = new ChatFileMentionRegistry(ctx)
    const listener = vi.fn()
    registry.providers.subscribe(listener)
    const first = provider('same', undefined, () => undefined)
    const dispose = registry.register(first)

    expect(listener).toHaveBeenCalledOnce()
    expect(registry.providers.getSnapshot()).toEqual([{ name: 'same', priority: 0 }])
    expect(registry.forClosing(OWNER)).toBeUndefined()
    expect(() => registry.register(provider('same', 2, () => undefined)))
      .toThrow('chat file-mention provider "same" is already registered')

    dispose()
    dispose()
    expect(listener).toHaveBeenCalledTimes(2)
    expect(registry.providers.getSnapshot()).toEqual([])
    expect(() => registry.register(provider('same', 2, () => ({ resolve: () => undefined }))))
      .not.toThrow()
    expect(registry.forClosing(OWNER)?.resolve('missing')).toBeUndefined()
  })

  it('logs setup and resolution exceptions and continues to later providers', () => {
    const ctx = new Context()
    const registry = new ChatFileMentionRegistry(ctx)
    const warn = vi.spyOn(ctx.logger, 'warn').mockImplementation(() => undefined)
    const resolved = mention('ok.txt')
    registry.register(provider('setup-error', 0, () => { throw new Error('setup') }))
    registry.register(provider('resolve-error', 1, () => ({
      resolve: () => { throw new Error('resolve') },
    })))
    registry.register(provider('working', 2, () => ({ resolve: () => resolved })))

    expect(registry.forClosing(OWNER)?.resolve('ok.txt')).toBe(resolved)
    expect(warn.mock.calls.map(call => String(call[0]))).toEqual(expect.arrayContaining([
      expect.stringContaining('setup-error'),
      expect.stringContaining('resolve-error'),
      'Error: setup',
      'Error: resolve',
    ]))
  })

  it('binds registration to the caller fiber lifecycle', async () => {
    const ctx = new Context()
    const registry = new ChatFileMentionRegistry(ctx)
    const fiber = ctx.plugin({
      apply(child) {
        child.chatFileMentions.register(provider('fiber', 0, () => undefined))
      },
    })
    await fiber.await()
    expect(registry.providers.getSnapshot()).toEqual([{ name: 'fiber', priority: 0 }])

    await fiber.dispose()
    expect(registry.providers.getSnapshot()).toEqual([])
  })
})
