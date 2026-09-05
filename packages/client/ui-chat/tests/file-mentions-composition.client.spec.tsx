// @vitest-environment jsdom
import { Context } from '@deepseek-ai/cordis'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, waitFor } from '@testing-library/react'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { SlotTestRuntime, TestRemote, stubSettingsScope } from '@deepseek-ai/dsh-client-test-runtime'
import type { PropsRenderSlots } from '@deepseek-ai/dsh-client-ui-slots'
import {
  ConversationEventRegistry, ConversationViewRegistry, type ConvViewOwnerProps,
} from '@deepseek-ai/dsh-client-ui-conversation/client'
import {
  en as conversationEn, NS as CONVERSATION_NS, zh as conversationZh,
} from '@deepseek-ai/dsh-client-ui-conversation/src/client/locales.ts'
import {
  apply as applyChat, inject as injectChat, type AssistantMessageNode, type ChatSnapshot,
} from '@deepseek-ai/dsh-client-ui-chat/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { chatSnapshotFixture } from './chat-snapshot-fixture.client.ts'

const SID = 'file-mention-composition' as SessionId

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

const runtimes: SlotTestRuntime[] = []

beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal('ResizeObserver', ResizeObserverStub)
})

afterEach(async () => {
  cleanup()
  vi.unstubAllGlobals()
  for (const runtime of runtimes.splice(0)) await runtime.dispose()
})

type AppRootProps = PropsRenderSlots<'conversation.view'>
const VIEW_OWNER: ConvViewOwnerProps = {
  viewRequest: null,
  openView: () => {},
  completeViewRequest: () => {},
}

function AppRoot({ renderSlot }: AppRootProps) {
  return <>{renderSlot('conversation.view', VIEW_OWNER, { only: 'chat' })}</>
}

const closing: AssistantMessageNode = {
  kind: 'assistant',
  seq: 2,
  time: 2_000,
  turn: 1,
  step: 1,
  blocks: [{ kind: 'text', text: 'Wrote `report.html`.' }],
}

async function bench(): Promise<SlotTestRuntime> {
  const runtime = await SlotTestRuntime.create()
  runtimes.push(runtime)
  const ctx = runtime.ctx
  const chat = createSnapshotStore<ChatSnapshot>(chatSnapshotFixture({
    nodes: [closing],
    turnEnds: new Map([[1, 3]]),
  }))
  ctx.provide('uiConversation', {
    events: new ConversationEventRegistry(ctx),
    views: new ConversationViewRegistry(ctx),
    binding: () => ({ target: () => chat }),
  } as never)
  ctx.provide('settingsScope', { bind: () => stubSettingsScope().scope } as never)
  ctx.provide('layout', { openDetails: vi.fn(), closeDetails: vi.fn() } as never)
  ctx.provide('uiWorkspace', {} as never)
  new TestRemote(ctx, {
    session: { openWorkspacePath: vi.fn(async () => ({ ok: true, value: { opened: true } })) },
  })
  const locale = new LocaleRuntime(ctx)
  ctx.provide('locale', locale)
  locale.register(CONVERSATION_NS, { zh: conversationZh, en: conversationEn })
  runtime.slots.installLocale(locale)
  await runtime.sessions.add({
    id: SID,
    summary: { title: 'File mentions', displayTitle: 'File mentions' },
  })
  await runtime.root.declare({
    'conversation.view': { kind: 'list', scope: 'session' },
  }, AppRoot)
  await runtime.mount({ inject: [...injectChat], apply: applyChat })
  return runtime
}

const providerPlugin = {
  inject: ['chatFileMentions'],
  apply(ctx: Context): void {
    ctx.chatFileMentions.register({
      name: 'composition-spec',
      priority: 10,
      forClosing: () => ({
        resolve: token => token === 'report.html'
          ? { open: () => {}, label: 'Open report.html', title: 'report.html' }
          : undefined,
      }),
    })
  },
}

it('rerenders the same settled mention across provider mount, dispose, and remount', async () => {
  const runtime = await bench()
  const first = await runtime.mount(providerPlugin)
  const view = runtime.renderRoot()
  expect(await view.findByRole('button', { name: 'Open report.html' })).toBeTruthy()

  await first.dispose()
  await waitFor(() => {
    expect(view.queryByRole('button', { name: 'Open report.html' })).toBeNull()
  })
  expect(view.getByText('report.html').tagName).toBe('CODE')

  await runtime.mount(providerPlugin)
  expect(await view.findByRole('button', { name: 'Open report.html' })).toBeTruthy()
})
