/** Public response fields for the workspace file viewer Remote. */

export interface WorkspaceFileViewerRoot {
  /** Stable allowlist index used by follow-up list/read calls. */
  readonly id: string
  /** Canonical absolute directory path. */
  readonly path: string
  /** Display label configured for the root. */
  readonly label: string
}

export interface WorkspaceFileViewerEntry {
  /** Relative path from the root using `/` separators. */
  readonly path: string
  /** Base file or folder name. */
  readonly name: string
  /** Entry kind. */
  readonly kind: 'directory' | 'file'
  /** Whether the UI can open the entry in the text viewer. */
  readonly readable: boolean
  /** File byte size when the entry is a regular file. */
  readonly size?: number
}

export interface WorkspaceFileViewerListing {
  /** Root metadata for the listed directory. */
  readonly root: WorkspaceFileViewerRoot
  /** Relative directory path that was listed. */
  readonly path: string
  /** Breadcrumb segments from root to the listed path. */
  readonly breadcrumbs: readonly WorkspaceFileViewerEntry[]
  /** Sorted entries directly under the listed directory. */
  readonly entries: readonly WorkspaceFileViewerEntry[]
}

export interface WorkspaceFileViewerFile {
  /** Root metadata for the file. */
  readonly root: WorkspaceFileViewerRoot
  /** Relative file path from the root. */
  readonly path: string
  /** Base file name. */
  readonly name: string
  /** Render mode the client should use. */
  readonly mode: 'html' | 'markdown' | 'text'
  /** UTF-8 decoded content. */
  readonly content: string
  /** Physical byte size read from disk. */
  readonly size: number
}
