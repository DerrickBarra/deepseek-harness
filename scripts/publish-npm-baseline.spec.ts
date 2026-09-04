import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import {
  createBaselineIdentity, deriveExternalPackages, validateExternalPackages, type ExternalPackage,
} from './publish-npm-baseline.ts'

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url))
const script = fileURLToPath(new URL('./publish-npm-baseline.ts', import.meta.url))

function invoke(args: string[]) {
  return spawnSync(process.execPath, ['--import', 'tsx/esm', script, ...args], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    env: { ...process.env, LANG: 'C', LC_ALL: 'C' },
  })
}

function checkedOutShortCommit(): string {
  const result = spawnSync('git', ['rev-parse', '--short=10', 'HEAD'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  })
  if (result.status !== 0) throw new Error(result.stderr)
  return result.stdout.trim()
}

const nativeExternal: ExternalPackage = {
  name: '@deepseek-ai/node-addon-landlock-run',
  version: '0.1.1',
  ranges: ['^0.1.1'],
}

describe('publish-npm-baseline', () => {
  it('keeps stable baseline identities unchanged', () => {
    expect(createBaselineIdentity('0.1.0', '20260904153045', '5fc9d6c37a')).toEqual({
      version: '0.1.0-20260904153045-5fc9d6c37a',
      distTag: 'dev-0.1.0',
    })
  })

  it('rejects a prerelease base by default', () => {
    expect(() => createBaselineIdentity('0.1.0-rc.5', '20260904153045', '5fc9d6c37a'))
      .toThrow('package.json must have a stable X.Y.Z version, got 0.1.0-rc.5')
  })

  it('extends a valid prerelease with dot identifiers under a non-version dist-tag', () => {
    expect(createBaselineIdentity(
      '0.1.0-rc.5+appearance',
      '20260904153045',
      '5fc9d6c37a',
      true,
    )).toEqual({
      version: '0.1.0-rc.5.20260904153045.5fc9d6c37a+appearance',
      distTag: 'dev-0.1.0-rc.5',
    })
  })

  it.each([
    '0.1.0-rc..5',
    '0.1.0-01',
    '0.1.0_rc.5',
    '0.1.0+appearance',
  ])('rejects invalid prerelease base %s', (version) => {
    expect(() => createBaselineIdentity(version, '20260904153045', '5fc9d6c37a', true))
      .toThrow(`package.json must have a stable or prerelease SemVer version, got ${version}`)
  })

  it('derives only absent scoped dependencies backed by outside-target workspace packages', () => {
    const manifests = [{
      dependencies: {
        '@deepseek-ai/dsh': '0.1.0-next',
        '@deepseek-ai/node-addon-landlock-run': '^0.1.1',
        'plain-external': '^2.0.0',
      },
    }, {
      optionalDependencies: { '@deepseek-ai/node-addon-landlock-run': '^0.1.1' },
    }]
    expect(deriveExternalPackages(
      manifests,
      new Set(['@deepseek-ai/dsh']),
      new Map([[nativeExternal.name, nativeExternal.version]]),
    )).toEqual([nativeExternal])
    expect(() => deriveExternalPackages(manifests, new Set(['@deepseek-ai/dsh']), new Map()))
      .toThrow(/outside-target workspace packages/)
  })

  it('rejects missing, extra, duplicate, and mismatched external declarations', () => {
    const cases: ExternalPackage[][] = [
      [],
      [nativeExternal, { name: '@deepseek-ai/unused', version: '1.0.0', ranges: ['^1.0.0'] }],
      [nativeExternal, nativeExternal],
      [{ ...nativeExternal, version: '0.1.2' }],
      [{ ...nativeExternal, ranges: ['^0.1.0'] }],
    ]
    for (const declared of cases) {
      expect(() => { validateExternalPackages(declared, [nativeExternal]) }).toThrow()
    }
  })

  it('rejects unsafe external package names, versions, and ranges', () => {
    const cases: ExternalPackage[] = [
      { ...nativeExternal, name: '@other/native' },
      { ...nativeExternal, version: 'latest' },
      { ...nativeExternal, ranges: ['workspace:^'] },
      { ...nativeExternal, ranges: ['file:../native'] },
    ]
    for (const declared of cases) {
      expect(() => { validateExternalPackages([declared], [nativeExternal]) }).toThrow()
    }
  })

  it('plans the checked-out prerelease only with the explicit pack option', () => {
    const rejected = invoke(['pack'])
    expect(rejected.status).toBe(1)
    expect(rejected.stderr).toContain('must have a stable X.Y.Z version, got 0.1.0-rc.5')

    const allowed = invoke(['pack', '--allow-prerelease-base'])
    expect(allowed.status).toBe(1)
    expect(allowed.stdout).toMatch(
      new RegExp(`version:\\s+0\\.1\\.0-rc\\.5\\.\\d{14}\\.${checkedOutShortCommit()}`, 'u'),
    )
    expect(allowed.stdout).toContain('dist-tag:  dev-0.1.0-rc.5')
    expect(allowed.stderr).toContain('pack requires an interactive terminal or --yes')
  })

  it.each(['release', 'publish', 'verify'])('rejects the pack-only option for %s', (command) => {
    const result = invoke([command, '--allow-prerelease-base'])
    expect(result.status).toBe(1)
    expect(result.stderr).toContain(
      `--allow-prerelease-base is pack-only and cannot be used with ${command}`,
    )
  })

  it('documents the pack-only safety boundary in help', () => {
    const result = invoke(['--help'])
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('Pack-only options:')
    expect(result.stdout).toContain('--allow-prerelease-base')
    expect(result.stdout).toContain('requires a stable X.Y.Z base')
  })
})
