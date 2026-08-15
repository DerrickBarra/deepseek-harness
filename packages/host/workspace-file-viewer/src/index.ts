/** Allowlisted local folder listing and safe text-file reads for the web UI. */

import { constants } from 'node:fs'
import { access, readFile, readdir, realpath, stat } from 'node:fs/promises'
import path from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { TypertRemoteService, Remote } from '@deepseek-ai/dsh-typert-protocol'
import type {
  WorkspaceFileViewerEntry, WorkspaceFileViewerFile, WorkspaceFileViewerListing, WorkspaceFileViewerRoot,
} from './types.ts'

export type {
  WorkspaceFileViewerEntry, WorkspaceFileViewerFile, WorkspaceFileViewerListing, WorkspaceFileViewerRoot,
} from './types.ts'

/** One configured allowlisted root. */
export interface RootConfig {
  /** Existing directory to expose through this viewer. */
  path: string
  /** Optional display label. */
  label?: string
}

/** Plugin configuration. */
export interface Config {
  /**
   * Existing directories the browser may inspect.
   * @default [{ path: '/home/derrick/.openclaw/workspace/', label: 'OpenClaw workspace' }]
   */
  roots?: RootConfig[]
  /**
   * Maximum UTF-8 text bytes a single file read may return.
   * @default 262144
   */
  maxFileBytes?: number
}

interface CanonicalRoot extends WorkspaceFileViewerRoot {
  readonly pathWithSeparator: string
}

const DEFAULT_ROOT = '/home/derrick/.openclaw/workspace/'
const DEFAULT_MAX_FILE_BYTES = 256 * 1024
const TEXT_EXTENSIONS = new Set([
  '.c', '.cc', '.conf', '.cpp', '.cs', '.css', '.csv', '.env', '.go', '.h', '.hpp', '.html', '.ini', '.java',
  '.js', '.json', '.jsx', '.log', '.md', '.mdx', '.mjs', '.py', '.rs', '.sh', '.toml', '.ts', '.tsx', '.txt',
  '.xml', '.yaml', '.yml',
])
const MARKDOWN_EXTENSIONS = new Set(['.md', '.mdx'])
const KIND_ORDER = { directory: 0, file: 1 } as const satisfies Record<WorkspaceFileViewerEntry['kind'], number>

/** Host plugin configuration schema. */
export const Config: z<Config> = z.object({
  roots: z.array(z.object({
    path: z.string().required(),
    label: z.string(),
  })).default([{ path: DEFAULT_ROOT, label: 'OpenClaw workspace' }]),
  maxFileBytes: z.natural().min(1).default(DEFAULT_MAX_FILE_BYTES),
})

function normalizeRelative(requestPath: string | undefined): string {
  if (requestPath === undefined || requestPath === '' || requestPath === '.') return ''
  const normalized = path.posix.normalize(requestPath.replaceAll('\\', '/'))
  if (path.posix.isAbsolute(normalized) || normalized === '..' || normalized.startsWith('../')) {
    throw new Error(`path escapes the configured root: ${requestPath}`)
  }
  const relative = normalized.replace(/\/+$/u, '')
  if (relative === '.') return ''
  return relative
}

function entryName(relativePath: string): string {
  return path.posix.basename(relativePath)
}

function extensionOf(filePath: string): string {
  return path.extname(filePath).toLowerCase()
}

function isReadableTextPath(filePath: string): boolean {
  return TEXT_EXTENSIONS.has(extensionOf(filePath))
}

function toRootView(root: CanonicalRoot): WorkspaceFileViewerRoot {
  return { id: root.id, path: root.path, label: root.label }
}

/** Remote service for allowlisted workspace browsing. */
export class WorkspaceFileViewerGateway extends TypertRemoteService {
  static Config: z<Config> = Config

  private readonly maxFileBytes: number
  private readonly rootsReady: Promise<readonly CanonicalRoot[]>

  constructor(ctx: Context, config: Config) {
    super(ctx, 'workspaceFileViewer')
    this.maxFileBytes = config.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES
    this.rootsReady = this.resolveRoots(config.roots ?? [{ path: DEFAULT_ROOT, label: 'OpenClaw workspace' }])
  }

  /**
   * List configured allowlisted roots.
   * @returns Canonical root descriptors.
   */
  @Remote('roots')
  async roots(): Promise<readonly WorkspaceFileViewerRoot[]> {
    return (await this.rootsReady).map(toRootView)
  }

  /**
   * List one directory under an allowlisted root.
   * @param rootId - Root id returned by `roots`.
   * @param requestPath - Relative directory path from that root; pass an empty string for the root.
   * @returns Directory entries sorted folders first.
   */
  @Remote('list')
  async list(rootId: string, requestPath: string): Promise<WorkspaceFileViewerListing> {
    const root = await this.requireRoot(rootId)
    const relative = normalizeRelative(requestPath)
    const absolute = await this.resolveInside(root, relative)
    if (!(await stat(absolute)).isDirectory()) {
      throw new Error(`not a directory: ${relative}`)
    }
    const entries: WorkspaceFileViewerEntry[] = []
    for (const dirent of await readdir(absolute, { withFileTypes: true })) {
      const childRelative = relative === '' ? dirent.name : `${relative}/${dirent.name}`
      if (dirent.isDirectory()) {
        entries.push({ path: childRelative, name: dirent.name, kind: 'directory', readable: false })
      } else if (dirent.isFile()) {
        const childPath = path.join(absolute, dirent.name)
        const childStat = await stat(childPath)
        entries.push({
          path: childRelative,
          name: dirent.name,
          kind: 'file',
          readable: isReadableTextPath(dirent.name),
          size: childStat.size,
        })
      }
    }
    entries.sort((a, b) => {
      if (a.kind !== b.kind) return KIND_ORDER[a.kind] - KIND_ORDER[b.kind]
      return a.name.localeCompare(b.name)
    })
    return {
      root: toRootView(root),
      path: relative,
      breadcrumbs: this.breadcrumbs(relative),
      entries,
    }
  }

  /**
   * Read one Markdown or plain text file under an allowlisted root.
   * @param rootId - Root id returned by `roots`.
   * @param requestPath - Relative file path from that root.
   * @returns UTF-8 decoded file content and render mode.
   */
  @Remote('read')
  async read(rootId: string, requestPath: string): Promise<WorkspaceFileViewerFile> {
    const root = await this.requireRoot(rootId)
    const relative = normalizeRelative(requestPath)
    if (relative === '') throw new Error('file path is required')
    const absolute = await this.resolveInside(root, relative)
    const fileStat = await stat(absolute)
    if (!fileStat.isFile()) throw new Error(`not a file: ${relative}`)
    if (!isReadableTextPath(relative)) throw new Error(`unsupported file extension: ${relative}`)
    if (fileStat.size > this.maxFileBytes) {
      throw new Error(`file exceeds ${this.maxFileBytes} bytes: ${relative}`)
    }
    await access(absolute, constants.R_OK)
    const content = await readFile(absolute, 'utf8')
    return {
      root: toRootView(root),
      path: relative,
      name: entryName(relative),
      mode: MARKDOWN_EXTENSIONS.has(extensionOf(relative)) ? 'markdown' : 'text',
      content,
      size: fileStat.size,
    }
  }

  private async resolveRoots(configured: readonly RootConfig[]): Promise<readonly CanonicalRoot[]> {
    const roots: CanonicalRoot[] = []
    for (const [index, config] of configured.entries()) {
      const canonical = await realpath(config.path)
      if (!(await stat(canonical)).isDirectory()) {
        throw new Error(`workspace file viewer root is not a directory: ${canonical}`)
      }
      roots.push({
        id: String(index),
        path: canonical,
        pathWithSeparator: canonical.endsWith(path.sep) ? canonical : `${canonical}${path.sep}`,
        label: (config.label ?? path.basename(canonical)) || canonical,
      })
    }
    if (roots.length === 0) throw new Error('workspace file viewer requires at least one root')
    return roots
  }

  private async requireRoot(rootId: string): Promise<CanonicalRoot> {
    const root = (await this.rootsReady).find(entry => entry.id === rootId)
    if (root === undefined) throw new Error(`unknown workspace file viewer root: ${rootId}`)
    return root
  }

  private async resolveInside(root: CanonicalRoot, relative: string): Promise<string> {
    const target = path.resolve(root.path, relative)
    const canonical = await realpath(target)
    if (canonical !== root.path && !canonical.startsWith(root.pathWithSeparator)) {
      throw new Error(`path escapes the configured root: ${relative}`)
    }
    return canonical
  }

  private breadcrumbs(relative: string): WorkspaceFileViewerEntry[] {
    if (relative === '') return []
    const segments = relative.split('/')
    return segments.map((name, index) => ({
      name,
      path: segments.slice(0, index + 1).join('/'),
      kind: 'directory',
      readable: false,
    }))
  }
}

export default WorkspaceFileViewerGateway
