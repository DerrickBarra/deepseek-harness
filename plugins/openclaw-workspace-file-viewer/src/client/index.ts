/** Workspace file viewer UI plugin, browser half. */

import workspaceFileViewerRemote from '@openclaw/dsh-workspace-file-viewer/remote'
import type {} from '@openclaw/dsh-workspace-file-viewer/remote'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
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
export const inject = ['slots', 'locale', 'remote']

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
