import type { ChildProcess } from 'node:child_process'
import { spawn } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium, type Browser, type Page } from 'playwright'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { newEnglishPage, REPO_ROOT, requireDist } from './support.ts'

function waitForReadyLine(child: ChildProcess): Promise<string> {
  return new Promise((resolveReady, reject) => {
    let out = ''
    const timer = setTimeout(() => { reject(new Error(`dsh web not ready in 90s; output:\n${out}`)) }, 90_000)
    const onData = (chunk: Buffer): void => {
      out += chunk.toString()
      const match = /dsh web: (http:\/\/[^\s]+)/u.exec(out)
      if (match?.[1] !== undefined) {
        clearTimeout(timer)
        resolveReady(match[1])
      }
    }
    child.stdout?.on('data', onData)
    child.stderr?.on('data', onData)
    child.once('exit', (code) => {
      clearTimeout(timer)
      reject(new Error(`dsh web exited early (code ${String(code)}); output:\n${out}`))
    })
  })
}

async function clickIfVisible(page: Page, name: RegExp): Promise<boolean> {
  const button = page.getByRole('button', { name }).first()
  try {
    await button.waitFor({ state: 'visible', timeout: 5_000 })
    await button.click()
    return true
  } catch {
    return false
  }
}

async function dismissOnboarding(page: Page): Promise<void> {
  for (let step = 0; step < 4; step++) {
    const acted = await clickIfVisible(page, /continue|继续|configure later|稍后配置/iu)
    if (!acted) return
    await page.waitForTimeout(500)
  }
}

async function clickFileRow(page: Page, text: string): Promise<void> {
  const row = page.getByRole('button').filter({ hasText: text }).first()
  await row.waitFor({ state: 'visible', timeout: 20_000 })
  await row.click()
}

describe('workspace file viewer web smoke', () => {
  let browser: Browser

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true })
  })

  afterAll(async () => {
    await browser.close()
  })

  it('opens from the sidebar and renders an allowlisted Markdown plan file', async () => {
    requireDist()
    const root = mkdtempSync(join(tmpdir(), 'dsh-file-viewer-root-'))
    const home = mkdtempSync(join(tmpdir(), 'dsh-file-viewer-home-'))
    const planDir = join(root, 'projects', 'openclaw-chip', '.plans')
    mkdirSync(planDir, { recursive: true })
    writeFileSync(join(planDir, '2026-08-15-dsh-chip-spike.md'), '# DSH Chip Spike\n\n## Task 4\n\nValidated Markdown file viewer.\n')
    const patchPath = join(home, 'file-viewer.patch.yml')
    writeFileSync(patchPath, [
      '- id: workspace-file-viewer',
      '  config:',
      '    roots:',
      `      - path: ${JSON.stringify(root)}`,
      '        label: Smoke workspace',
      '    maxFileBytes: 65536',
      '',
    ].join('\n'))

    const tsxLoader = pathToFileURL(createRequire(join(REPO_ROOT, 'package.json')).resolve('tsx')).href
    const child = spawn(
      process.execPath,
      ['--import', tsxLoader, join(REPO_ROOT, 'apps/cli/src/bin.ts'), 'web', '--patch', patchPath, '--port', '0'],
      {
        cwd: REPO_ROOT,
        env: {
          ...process.env,
          DEEPSEEK_API_KEY: 'keyless-file-viewer-smoke',
          DSH_HOME: join(home, '.dsh'),
          DSH_AGENTS_HOME: join(home, '.agents'),
          TSX_TSCONFIG_PATH: join(REPO_ROOT, 'tsconfig.json'),
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    )

    try {
      const baseUrl = await waitForReadyLine(child)
      const page = await newEnglishPage(browser, 900)
      const consoleErrors: string[] = []
      page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()) })
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
      await dismissOnboarding(page)
      await page.getByRole('button', { name: 'Open workspace file browser' }).click()
      await page.getByRole('heading', { name: 'Workspace files' }).waitFor({ timeout: 30_000 })
      for (const segment of ['projects', 'openclaw-chip', '.plans']) await clickFileRow(page, segment)
      await clickFileRow(page, '2026-08-15-dsh-chip-spike.md')
      await page.getByRole('heading', { name: '2026-08-15-dsh-chip-spike.md' }).waitFor({ timeout: 30_000 })
      await page.getByRole('heading', { name: 'DSH Chip Spike' }).waitFor({ timeout: 30_000 })
      await page.getByRole('heading', { name: 'Task 4' }).waitFor({ timeout: 30_000 })
      expect(consoleErrors).toEqual([])
      await page.close()
    } finally {
      const closed = child.exitCode === null
        ? new Promise<void>((resolveClose) => { child.once('close', () => { resolveClose() }) })
        : Promise.resolve()
      if (child.exitCode === null) child.kill('SIGTERM')
      await closed
      rmSync(root, { recursive: true, force: true })
      rmSync(home, { recursive: true, force: true })
    }
  })
})
