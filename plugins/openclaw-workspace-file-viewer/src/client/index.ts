/** Workspace file viewer UI plugin, browser half. */

import workspaceFileViewerRemote from '@openclaw/dsh-workspace-file-viewer/remote'
import type {} from '@openclaw/dsh-workspace-file-viewer/remote'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import {
  WorkspaceFileViewerAction, WorkspaceFileViewerOverlay, type WorkspaceFileViewerInjected,
} from './WorkspaceFileViewerPanel.tsx'
import { en, NS, zh, type WorkspaceFileViewerKey } from './locales.ts'

export type {
  WorkspaceFileViewerActionProps, WorkspaceFileViewerInjected, WorkspaceFileViewerOverlayProps,
} from './WorkspaceFileViewerPanel.tsx'
export type { WorkspaceFileViewerKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Workspace file viewer overlay copy. */
    workspaceFileViewer: WorkspaceFileViewerKey
  }
}

/** Services required before this plugin can mount its own Remote namespace and UI. */
export const inject = ['slots', 'locale', 'remote', 'sessions', 'workspaces', 'conversation']

/** Mount the package Remote contribution, sidebar action, and shell overlay. */
export async function apply(ctx: ClientContext): Promise<void> {
  await ctx.remote.$mount(workspaceFileViewerRemote)
  const remote = (): NonNullable<ClientContext['remote']['workspaceFileViewer']> => {
    const namespace = ctx.get('remote.workspaceFileViewer') as ClientContext['remote']['workspaceFileViewer'] | undefined
    if (namespace === undefined) throw new Error('workspaceFileViewer Remote namespace is unavailable')
    return namespace
  }
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-workspace-file-viewer: dictionaries')
  const injected = (): WorkspaceFileViewerInjected => ({
    roots: async () => {
      const result = await remote().roots()
      if (!result.ok) throw new Error(result.error.message)
      return result.value
    },
    list: async (rootId, path) => {
      const result = await remote().list(rootId, path)
      if (!result.ok) throw new Error(result.error.message)
      return result.value
    },
    read: async (rootId, path) => {
      const result = await remote().read(rootId, path)
      if (!result.ok) throw new Error(result.error.message)
      return result.value
    },
    save: async (rootId, path, content) => {
      const result = await remote().save(rootId, path, content)
      if (!result.ok) throw new Error(result.error.message)
      return result.value
    },
    addToChat: async (path) => {
      const sessionId = await resolveSessionForDraft(ctx, path)
      const scope = ctx.sessions.scope(sessionId)
      if (scope === undefined) throw new Error(ctx.locale.bind(NS)('chat.noSession'))
      const input = ctx.conversation.input.for(scope)
      const draft = input.state.getSnapshot().draft
      input.setDraft(insertPath(draft, path))
      input.notify('info', ctx.locale.bind(NS)('chat.added'))
    },
  })
  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
    name: 'sidebar.footer.action',
    id: 'workspace-file-viewer',
    order: 5,
    locale: NS,
    inject: injected,
  }, WorkspaceFileViewerAction))
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'workspace-file-viewer',
    order: 10,
    locale: NS,
    inject: injected,
  }, WorkspaceFileViewerOverlay))
}

async function resolveSessionForDraft(
  ctx: ClientContext,
  path: string,
): Promise<NonNullable<ReturnType<ClientContext['sessions']['list']['getSnapshot']>['current']>> {
  const current = ctx.sessions.list.getSnapshot().current
  if (current !== undefined) return current
  const target = targetWorkspaceId(ctx, path)
  if (target === undefined) throw new Error(ctx.locale.bind(NS)('chat.noSession'))
  const sessionId = await ctx.workspaces.connectWorkspace(target)
  ctx.sessions.open(sessionId)
  return sessionId
}

function targetWorkspaceId(ctx: ClientContext, path: string): ReturnType<ClientContext['workspaces']['list']['getSnapshot']>['recentWorkspaceId'] {
  const snapshot = ctx.workspaces.list.getSnapshot()
  return snapshot.items
    .filter(item => isSameOrChildPath(path, item.path))
    .sort((left, right) => right.path.length - left.path.length)[0]
    ?.workspaceId ?? snapshot.recentWorkspaceId
}

function isSameOrChildPath(candidate: string, root: string): boolean {
  const normalizedRoot = root.replace(/[/\\]+$/u, '')
  if (candidate === normalizedRoot) return true
  return candidate.startsWith(`${normalizedRoot}/`) || candidate.startsWith(`${normalizedRoot}\\`)
}

function insertPath(draft: string, path: string): string {
  if (draft === '') return path
  return `${draft.replace(/\s*$/u, '')}\n${path}`
}
