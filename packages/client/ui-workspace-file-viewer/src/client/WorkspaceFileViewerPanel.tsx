import { useEffect, useState } from 'react'
import clsx from 'clsx'
import type {
  WorkspaceFileViewerEntry, WorkspaceFileViewerFile, WorkspaceFileViewerListing,
  WorkspaceFileViewerRoot,
} from '@deepseek-ai/dsh-host-workspace-file-viewer/types'
import {
  IconCloseOutline16, IconCodeOutline16, IconFolderClose16, IconFolderOpenOutline16,
  IconRefreshOutline16, MarkdownText, Tooltip,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import { NS } from './locales.ts'
import css from './WorkspaceFileViewerPanel.module.css'

/** Host Remote calls supplied by the slot registration. */
export interface WorkspaceFileViewerInjected {
  roots: () => Promise<readonly WorkspaceFileViewerRoot[]>
  list: (rootId: string, path: string) => Promise<WorkspaceFileViewerListing>
  read: (rootId: string, path: string) => Promise<WorkspaceFileViewerFile>
}

/** Full props for the sidebar footer action. */
export type WorkspaceFileViewerActionProps =
  PropsRuntime<'sidebar.footer.action'> & WorkspaceFileViewerInjected & PropsLocale<typeof NS>

/** Full props for the overlay panel entry. */
export type WorkspaceFileViewerOverlayProps =
  PropsRuntime<'shell.overlay'> & WorkspaceFileViewerInjected & PropsLocale<typeof NS>

let panelOpen = false
const listeners = new Set<() => void>()

function setPanelOpen(next: boolean): void {
  panelOpen = next
  for (const listener of listeners) listener()
}

function usePanelOpen(): boolean {
  const [open, setOpen] = useState(panelOpen)
  useEffect(() => {
    const listener = (): void => { setOpen(panelOpen) }
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  }, [])
  return open
}

function formatSize(size: number | undefined, t: WorkspaceFileViewerActionProps['t']): string {
  return size === undefined ? '' : t('file.size', { size })
}

/** Sidebar footer action that opens the workspace file browser overlay. */
export function WorkspaceFileViewerAction({ wide, t }: WorkspaceFileViewerActionProps) {
  return (
    <Tooltip label={t('action.aria')} delayMs={500} disabled={wide}>
      <button
        type="button"
        className={clsx(css.actionButton, !wide && css.actionButtonRail)}
        aria-label={t('action.aria')}
        onClick={() => { setPanelOpen(true) }}
      >
        <IconFolderOpenOutline16 size={wide ? 16 : 18} />
        {wide && <span className={css.actionLabel}>{t('action.label')}</span>}
      </button>
    </Tooltip>
  )
}

/** Frame overlay that browses configured roots and previews Markdown/plain text files. */
export function WorkspaceFileViewerOverlay({ roots, list, read, t }: WorkspaceFileViewerOverlayProps) {
  const open = usePanelOpen()
  const [rootRows, setRootRows] = useState<readonly WorkspaceFileViewerRoot[]>([])
  const [rootId, setRootId] = useState('')
  const [listing, setListing] = useState<WorkspaceFileViewerListing | undefined>()
  const [file, setFile] = useState<WorkspaceFileViewerFile | undefined>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>()

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setError(undefined)
    roots()
      .then((rows) => {
        if (cancelled) return
        setRootRows(rows)
        const nextRoot = rows[0]?.id ?? ''
        setRootId(nextRoot)
        if (nextRoot === '') return undefined
        return list(nextRoot, '')
      })
      .then((nextListing) => {
        if (cancelled || nextListing === undefined) return
        setListing(nextListing)
        setFile(undefined)
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [list, open, roots])

  const loadDirectory = (nextRootId: string, path: string): void => {
    setLoading(true)
    setError(undefined)
    list(nextRootId, path)
      .then((nextListing) => {
        setRootId(nextRootId)
        setListing(nextListing)
        setFile(undefined)
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : String(cause))
      })
      .finally(() => { setLoading(false) })
  }
  const loadFile = (path: string): void => {
    if (rootId === '') return
    setLoading(true)
    setError(undefined)
    read(rootId, path)
      .then(setFile)
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : String(cause))
      })
      .finally(() => { setLoading(false) })
  }

  if (!open) return null
  const selectedRoot = rootRows.find(root => root.id === rootId)
  return (
    <div className={css.overlay}>
      <button type="button" className={css.backdrop} aria-label={t('panel.close')} onClick={() => { setPanelOpen(false) }} />
      <section className={css.panel} aria-label={t('panel.title')}>
        <header className={css.header}>
          <h2 className={css.title}>{t('panel.title')}</h2>
          <Tooltip label={t('panel.refresh')} delayMs={500}>
            <button
              type="button"
              className={css.iconButton}
              aria-label={t('panel.refresh')}
              onClick={() => { loadDirectory(rootId, listing?.path ?? '') }}
              disabled={rootId === ''}
            >
              <IconRefreshOutline16 />
            </button>
          </Tooltip>
          <Tooltip label={t('panel.close')} delayMs={500}>
            <button type="button" className={css.iconButton} aria-label={t('panel.close')} onClick={() => { setPanelOpen(false) }}>
              <IconCloseOutline16 />
            </button>
          </Tooltip>
        </header>
        <div className={css.body}>
          <div className={css.browser}>
            <select
              className={css.rootSelect}
              aria-label={t('root.label')}
              value={rootId}
              onChange={(event) => { loadDirectory(event.currentTarget.value, '') }}
            >
              {rootRows.map(root => <option key={root.id} value={root.id}>{root.label}</option>)}
            </select>
            <nav className={css.breadcrumbs} aria-label={selectedRoot?.label ?? t('breadcrumb.root')}>
              <button type="button" className={css.crumb} onClick={() => { loadDirectory(rootId, '') }}>
                {t('breadcrumb.root')}
              </button>
              {listing?.breadcrumbs.map(crumb => (
                <button key={crumb.path} type="button" className={css.crumb} onClick={() => { loadDirectory(rootId, crumb.path) }}>
                  {crumb.name}
                </button>
              ))}
            </nav>
            <div className={css.list}>
              {loading && <div className={css.notice}>{t('loading')}</div>}
              {error !== undefined && <p className={css.error}>{t('error.title')}: {error}</p>}
              {!loading && error === undefined && listing?.entries.length === 0 && <div className={css.notice}>{t('empty')}</div>}
              {listing?.entries.map(entry => (
                <EntryRow
                  key={`${entry.kind}:${entry.path}`}
                  entry={entry}
                  onDirectory={(path) => { loadDirectory(rootId, path) }}
                  onFile={loadFile}
                  t={t}
                />
              ))}
            </div>
          </div>
          <div className={css.viewer}>
            {file !== undefined && (
              <>
                <h3 className={css.fileTitle}>{file.name}</h3>
                {file.mode === 'markdown'
                  ? <MarkdownText text={file.content} />
                  : <pre className={css.plain}>{file.content}</pre>}
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

function EntryRow({
  entry, onDirectory, onFile, t,
}: {
  entry: WorkspaceFileViewerEntry
  onDirectory: (path: string) => void
  onFile: (path: string) => void
  t: WorkspaceFileViewerActionProps['t']
}) {
  return (
    <button
      type="button"
      className={css.row}
      disabled={entry.kind === 'file' && !entry.readable}
      title={entry.kind === 'file' && !entry.readable ? t('unsupported') : undefined}
      onClick={() => {
        if (entry.kind === 'directory') onDirectory(entry.path)
        else onFile(entry.path)
      }}
    >
      {entry.kind === 'directory' ? <IconFolderClose16 /> : <IconCodeOutline16 />}
      <span className={css.name}>{entry.name}</span>
      <span className={css.meta}>{formatSize(entry.size, t)}</span>
    </button>
  )
}
