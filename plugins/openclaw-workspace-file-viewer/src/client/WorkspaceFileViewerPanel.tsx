import { useEffect, useRef, useState, type MouseEvent } from 'react'
import clsx from 'clsx'
import type {
  WorkspaceFileViewerEntry, WorkspaceFileViewerFile, WorkspaceFileViewerListing,
  WorkspaceFileViewerRoot,
} from '@openclaw/dsh-workspace-file-viewer/types'
import {
  IconCheckOutline16, IconCloseOutline16, IconCodeOutline16, IconEditOutline16, IconFolderClose16,
  IconFolderOpenOutline16, IconNewChatOutline16, IconPanelLeftOutline16, IconRefreshOutline16,
  IconBrowseOutline16, MarkdownText, Tooltip,
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
  save: (rootId: string, path: string, content: string) => Promise<WorkspaceFileViewerFile>
  addToChat: (path: string) => void
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
export function WorkspaceFileViewerOverlay({ roots, list, read, save, addToChat, t }: WorkspaceFileViewerOverlayProps) {
  const open = usePanelOpen()
  const [rootRows, setRootRows] = useState<readonly WorkspaceFileViewerRoot[]>([])
  const [rootId, setRootId] = useState('')
  const [listing, setListing] = useState<WorkspaceFileViewerListing | undefined>()
  const [file, setFile] = useState<WorkspaceFileViewerFile | undefined>()
  const [explorerOpen, setExplorerOpen] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [menu, setMenu] = useState<{ x: number; y: number; path: string } | undefined>()
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
        setEditMode(false)
        setDraft('')
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
        setEditMode(false)
        setDraft('')
        setMenu(undefined)
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
      .then((nextFile) => {
        setFile(nextFile)
        setDraft(nextFile.content)
        setEditMode(false)
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : String(cause))
      })
      .finally(() => { setLoading(false) })
  }
  const saveFile = (): void => {
    if (file === undefined || rootId === '') return
    setSaving(true)
    setError(undefined)
    save(rootId, file.path, draft)
      .then((nextFile) => {
        setFile(nextFile)
        setDraft(nextFile.content)
        setEditMode(false)
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : String(cause))
      })
      .finally(() => { setSaving(false) })
  }
  const selectedRoot = rootRows.find(root => root.id === rootId)
  const addPathToChat = (relativePath: string): void => {
    if (selectedRoot === undefined) return
    try {
      addToChat(rootPath(selectedRoot, relativePath))
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : String(cause))
    }
    setMenu(undefined)
  }

  if (!open) return null
  return (
    <div className={css.overlay}>
      <button type="button" className={css.backdrop} aria-label={t('panel.close')} onClick={() => { setPanelOpen(false) }} />
      <section className={css.panel} aria-label={t('panel.title')}>
        <header className={css.header}>
          <h2 className={css.title}>{t('panel.title')}</h2>
          <Tooltip label={explorerOpen ? t('panel.collapse') : t('panel.expand')} delayMs={500}>
            <button
              type="button"
              className={css.iconButton}
              aria-label={explorerOpen ? t('panel.collapse') : t('panel.expand')}
              onClick={() => { setExplorerOpen(value => !value) }}
            >
              <IconPanelLeftOutline16 />
            </button>
          </Tooltip>
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
        <div className={clsx(css.body, !explorerOpen && css.bodyCollapsed)}>
          {explorerOpen && <div className={css.browser}>
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
                  onMenu={(event, path) => {
                    event.preventDefault()
                    setMenu({ x: event.clientX, y: event.clientY, path })
                  }}
                  onTouchMenu={(point, path) => {
                    setMenu({ x: point.x, y: point.y, path })
                  }}
                  t={t}
                />
              ))}
            </div>
          </div>}
          <div className={css.viewer}>
            {file === undefined && <div className={css.notice}>{t('viewer.empty')}</div>}
            {file !== undefined && (
              <>
                <div className={css.viewerHeader}>
                  <h3 className={css.fileTitle}>{file.name}</h3>
                  <div className={css.viewerActions}>
                    {editMode
                      ? (
                        <>
                          <button type="button" className={css.textButton} onClick={saveFile} disabled={saving}>
                            <IconCheckOutline16 />
                            <span>{saving ? t('viewer.saving') : t('viewer.save')}</span>
                          </button>
                          <button
                            type="button"
                            className={css.textButton}
                            onClick={() => {
                              setDraft(file.content)
                              setEditMode(false)
                            }}
                            disabled={saving}
                          >
                            <IconCloseOutline16 />
                            <span>{t('viewer.cancel')}</span>
                          </button>
                        </>
                      )
                      : (
                        <Tooltip label={t('viewer.edit')} delayMs={500}>
                          <button type="button" className={css.iconButton} aria-label={t('viewer.edit')} onClick={() => { setEditMode(true) }}>
                            <IconEditOutline16 />
                          </button>
                        </Tooltip>
                      )}
                    {editMode && (
                      <Tooltip label={t('viewer.view')} delayMs={500}>
                        <button
                          type="button"
                          className={css.iconButton}
                          aria-label={t('viewer.view')}
                          onClick={() => { setEditMode(false) }}
                          disabled={saving}
                        >
                          <IconBrowseOutline16 />
                        </button>
                      </Tooltip>
                    )}
                  </div>
                </div>
                {editMode
                  ? <textarea className={css.editor} value={draft} onChange={(event) => { setDraft(event.currentTarget.value) }} />
                  : <FilePreview file={file} />}
              </>
            )}
          </div>
        </div>
        {menu !== undefined && (
          <div className={css.menu} style={{ left: menu.x, top: menu.y }} role="menu">
            <button type="button" className={css.menuItem} role="menuitem" onClick={() => { addPathToChat(menu.path) }}>
              <IconNewChatOutline16 />
              <span>{t('menu.addToChat')}</span>
            </button>
          </div>
        )}
      </section>
    </div>
  )
}

function FilePreview({ file }: { file: WorkspaceFileViewerFile }) {
  if (file.mode === 'markdown') return <MarkdownText text={file.content} />
  if (file.mode === 'html') return <iframe className={css.htmlPreview} sandbox="" srcDoc={file.content} title={file.name} />
  return <pre className={css.plain}>{file.content}</pre>
}

function rootPath(root: WorkspaceFileViewerRoot, relativePath: string): string {
  if (relativePath === '') return root.path
  return `${root.path.replace(/\/+$/u, '')}/${relativePath}`
}

function EntryRow({
  entry, onDirectory, onFile, onMenu, onTouchMenu, t,
}: {
  entry: WorkspaceFileViewerEntry
  onDirectory: (path: string) => void
  onFile: (path: string) => void
  onMenu: (event: MouseEvent, path: string) => void
  onTouchMenu: (point: { x: number; y: number }, path: string) => void
  t: WorkspaceFileViewerActionProps['t']
}) {
  const longPress = useRef<number | undefined>()
  const longPressed = useRef(false)
  const clearLongPress = (): void => {
    if (longPress.current !== undefined) window.clearTimeout(longPress.current)
    longPress.current = undefined
  }
  useEffect(() => clearLongPress, [])
  return (
    <button
      type="button"
      className={css.row}
      aria-disabled={entry.kind === 'file' && !entry.readable}
      title={entry.kind === 'file' && !entry.readable ? t('unsupported') : undefined}
      onContextMenu={(event) => { onMenu(event, entry.path) }}
      onTouchStart={(event) => {
        clearLongPress()
        const touch = event.touches[0]
        if (touch === undefined) return
        longPress.current = window.setTimeout(() => {
          longPressed.current = true
          onTouchMenu({ x: touch.clientX, y: touch.clientY }, entry.path)
        }, 550)
      }}
      onTouchMove={clearLongPress}
      onTouchEnd={clearLongPress}
      onTouchCancel={clearLongPress}
      onClick={() => {
        if (longPressed.current) {
          longPressed.current = false
          return
        }
        if (entry.kind === 'directory') onDirectory(entry.path)
        else if (entry.readable) onFile(entry.path)
      }}
    >
      {entry.kind === 'directory' ? <IconFolderClose16 /> : <IconCodeOutline16 />}
      <span className={css.name}>{entry.name}</span>
      <span className={css.meta}>{formatSize(entry.size, t)}</span>
    </button>
  )
}
