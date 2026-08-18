import { mkdtemp, readFile, rm, symlink, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { remoteMethods } from '@deepseek-ai/dsh-typert-protocol'
import WorkspaceFileViewerGateway from '../src/index.ts'

const roots: string[] = []
const contexts: Context[] = []

afterEach(async () => {
  await Promise.all(contexts.splice(0).map(ctx => ctx.fiber.dispose()))
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'dsh-workspace-file-viewer-'))
  roots.push(root)
  return root
}

async function harness(root: string, maxFileBytes = 4096): Promise<WorkspaceFileViewerGateway> {
  const ctx = new Context()
  contexts.push(ctx)
  await ctx.plugin(WorkspaceFileViewerGateway, {
    roots: [{ path: root, label: 'Fixture' }],
    maxFileBytes,
  })
  return ctx.get('workspaceFileViewer') as WorkspaceFileViewerGateway
}

async function configuredHarness(config: ConstructorParameters<typeof WorkspaceFileViewerGateway>[1]): Promise<WorkspaceFileViewerGateway> {
  const ctx = new Context()
  contexts.push(ctx)
  await ctx.plugin(WorkspaceFileViewerGateway, config)
  return ctx.get('workspaceFileViewer') as WorkspaceFileViewerGateway
}

function directHarness(config: ConstructorParameters<typeof WorkspaceFileViewerGateway>[1]): WorkspaceFileViewerGateway {
  const ctx = new Context()
  contexts.push(ctx)
  return new WorkspaceFileViewerGateway(ctx, config)
}

describe('WorkspaceFileViewerGateway', () => {
  it('publishes roots, list, and read as direct Remote methods', async () => {
    const viewer = await harness(await tempRoot())
    expect(viewer.typertRemote).toMatchObject({
      serviceKey: 'workspaceFileViewer',
      namespace: 'workspaceFileViewer',
    })
    expect(remoteMethods(viewer)).toEqual([
      { method: 'roots', invocation: { kind: 'direct' } },
      { method: 'list', invocation: { kind: 'direct' } },
      { method: 'read', invocation: { kind: 'direct' } },
      { method: 'save', invocation: { kind: 'direct' } },
    ])
  })

  it('lists directories and reads Markdown and plain text files', async () => {
    const root = await tempRoot()
    await mkdir(join(root, 'notes'))
    await writeFile(join(root, 'README.md'), '# Hello\n')
    await writeFile(join(root, 'notes', 'todo.txt'), 'one\ntwo\n')
    await mkdir(join(root, 'zzz'))
    await writeFile(join(root, 'aaa.txt'), 'aaa\n')
    await writeFile(join(root, 'image.bin'), 'binary')
    await symlink(join(root, 'README.md'), join(root, 'readme-link.md'))
    const viewer = await harness(root)
    const [configured] = await viewer.roots()

    expect(configured).toMatchObject({ id: '0', label: 'Fixture' })
    const listing = await viewer.list('0', '')
    expect(listing.entries.map(entry => [entry.kind, entry.name, entry.readable])).toEqual([
      ['directory', 'notes', false],
      ['directory', 'zzz', false],
      ['file', 'aaa.txt', true],
      ['file', 'image.bin', false],
      ['file', 'README.md', true],
    ])
    await expect(viewer.list('0', './')).resolves.toMatchObject({ path: '' })
    await expect(viewer.list('0', undefined as never)).resolves.toMatchObject({ path: '' })
    await expect(viewer.list('0', 'notes')).resolves.toMatchObject({
      path: 'notes',
      breadcrumbs: [{ path: 'notes', name: 'notes', kind: 'directory', readable: false }],
      entries: [{ path: 'notes/todo.txt', name: 'todo.txt', kind: 'file', readable: true, size: 8 }],
    })

    await expect(viewer.read('0', 'README.md')).resolves.toMatchObject({
      name: 'README.md',
      mode: 'markdown',
      content: '# Hello\n',
    })
    await expect(viewer.read('0', 'notes/todo.txt')).resolves.toMatchObject({
      name: 'todo.txt',
      mode: 'text',
      content: 'one\ntwo\n',
    })
    await expect(viewer.read('0', 'aaa.txt')).resolves.toMatchObject({
      name: 'aaa.txt',
      mode: 'text',
      content: 'aaa\n',
    })
  })

  it('saves supported UTF-8 text files inside the configured root', async () => {
    const root = await tempRoot()
    await writeFile(join(root, 'README.md'), '# Old\n')
    await writeFile(join(root, 'index.html'), '<h1>Old</h1>')
    const viewer = await harness(root)

    await expect(viewer.read('0', 'index.html')).resolves.toMatchObject({
      name: 'index.html',
      mode: 'html',
      content: '<h1>Old</h1>',
    })
    await expect(viewer.save('0', 'README.md', '# New\n')).resolves.toMatchObject({
      name: 'README.md',
      mode: 'markdown',
      content: '# New\n',
      size: 6,
    })
    await expect(readFile(join(root, 'README.md'), 'utf8')).resolves.toBe('# New\n')
    await expect(viewer.save('0', 'index.html', '<h1>New</h1>')).resolves.toMatchObject({
      name: 'index.html',
      mode: 'html',
      content: '<h1>New</h1>',
    })
  })

  it('rejects traversal, symlink escapes, unsupported files, and oversized reads', async () => {
    const root = await tempRoot()
    const outside = await tempRoot()
    await mkdir(join(root, 'folder'))
    await writeFile(join(root, 'ok.txt'), 'ok')
    await writeFile(join(root, 'large.txt'), '12345')
    await writeFile(join(root, 'archive.zip'), 'zip')
    await writeFile(join(outside, 'secret.txt'), 'secret')
    await symlink(join(outside, 'secret.txt'), join(root, 'secret-link.txt'))
    const viewer = await harness(root, 4)

    await expect(viewer.list('0', '../')).rejects.toThrow('escapes')
    await expect(viewer.list('0', '/')).rejects.toThrow('escapes')
    await expect(viewer.list('0', 'ok.txt')).rejects.toThrow('not a directory')
    await expect(viewer.read('0', '')).rejects.toThrow('file path is required')
    await expect(viewer.read('0', 'folder\\..\\archive.zip')).rejects.toThrow('unsupported')
    await expect(viewer.read('0', 'folder')).rejects.toThrow('not a file')
    await expect(viewer.read('0', 'secret-link.txt')).rejects.toThrow('escapes')
    await expect(viewer.read('0', 'archive.zip')).rejects.toThrow('unsupported')
    await expect(viewer.read('0', 'large.txt')).rejects.toThrow('exceeds')
    await expect(viewer.read('missing', 'ok.txt')).rejects.toThrow('unknown')
    await expect(viewer.save('0', '../ok.txt', 'no')).rejects.toThrow('escapes')
    await expect(viewer.save('0', 'secret-link.txt', 'no')).rejects.toThrow('escapes')
    await expect(viewer.save('0', 'archive.zip', 'no')).rejects.toThrow('unsupported')
    await expect(viewer.save('0', 'large.txt', '12345')).rejects.toThrow('exceeds')
  })

  it('validates configured roots and fills default configuration values', async () => {
    const root = await tempRoot()
    const rootFile = join(root, 'not-a-directory')
    await writeFile(rootFile, 'file')

    const withoutLimit = await configuredHarness({ roots: [{ path: root }] })
    await expect(withoutLimit.roots()).resolves.toMatchObject([{
      id: '0',
      label: root.split('/').at(-1),
    }])

    const defaultRoot = directHarness({})
    await expect(defaultRoot.roots()).resolves.toMatchObject([{
      id: '0',
      path: '/home/derrick/.openclaw/workspace',
      label: 'OpenClaw workspace',
    }])

    const filesystemRoot = await configuredHarness({ roots: [{ path: '/' }] })
    await expect(filesystemRoot.roots()).resolves.toMatchObject([{ id: '0', label: '/' }])

    const emptyRoots = await configuredHarness({ roots: [] })
    await expect(emptyRoots.roots()).rejects.toThrow('requires at least one root')

    const fileRoot = await configuredHarness({ roots: [{ path: rootFile }] })
    await expect(fileRoot.roots()).rejects.toThrow('not a directory')
  })
})
