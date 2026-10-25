import { spawnSync } from 'node:child_process'
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const reproductionDirectory = dirname(fileURLToPath(import.meta.url))
const worktree = resolve(process.argv.at(2))
const pinnedCommit = 'b702a5efbb74bebc056b798b414ddb923a82fbd5'
const timeoutMilliseconds = 30000
const unavailableExitCode = 2

const run = (command, args, cwd) => {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    timeout: timeoutMilliseconds,
  })

  if (result.error) {
    throw result.error
  }

  return {
    status: result.status,
    signal: result.signal,
    output: result.stdout + result.stderr,
  }
}

const head = run('git', ['rev-parse', 'HEAD'], worktree)
const upstream = run('git', ['rev-parse', 'upstream/main'], worktree)
const status = run('git', ['status', '--porcelain=v1'], worktree)

if (
  head.status !== 0 ||
  head.output.trim() !== pinnedCommit ||
  upstream.output.trim() !== pinnedCommit
) {
  throw new Error(
    'The worktree and upstream/main must match the pinned baseline',
  )
}

if (status.status !== 0 || status.output.trim() !== '') {
  throw new Error('The contribution worktree must be clean')
}

const packageMetadata = JSON.parse(
  readFileSync(join(worktree, 'packages/foldkit/package.json'), 'utf8'),
)
const compiler = join(worktree, 'packages/foldkit/node_modules/.bin/tsc')
const compilerVersion = run(compiler, ['--version'], worktree)
const scratch = mkdtempSync(join(tmpdir(), 'foldkit-1772-baseline-'))

try {
  cpSync(join(reproductionDirectory, 'reported'), scratch, { recursive: true })
  symlinkSync(
    join(worktree, 'node_modules'),
    join(scratch, 'node_modules'),
    'dir',
  )

  for (const fixture of ['supported-api.ts', 'preview-api.ts']) {
    cpSync(join(reproductionDirectory, fixture), join(scratch, fixture))
  }

  const makeConfiguration = file => ({
    extends: './tsconfig.json',
    files: [file],
  })

  for (const fixture of ['supported-api', 'preview-api']) {
    writeFileSync(
      join(scratch, `tsconfig.${fixture}.json`),
      JSON.stringify(makeConfiguration(`${fixture}.ts`)),
    )
  }

  const results = Object.fromEntries(
    ['supported-api', 'preview-api', 'control', 'repro'].map(fixture => [
      fixture,
      run(
        compiler,
        ['-p', `tsconfig.${fixture}.json`, '--pretty', 'false'],
        scratch,
      ),
    ]),
  )

  const isBlockedByMissingApi = ['preview-api', 'control', 'repro'].every(
    fixture =>
      results[fixture].status !== 0 &&
      results[fixture].signal === null &&
      results[fixture].output.includes("has no exported member 'Block'"),
  )

  console.log(
    JSON.stringify(
      {
        baseline: head.output.trim(),
        foldkit: packageMetadata.version,
        node: process.version,
        platform: process.platform,
        architecture: process.arch,
        compiler: compilerVersion.output.trim(),
        packageExports: Object.keys(packageMetadata.exports),
        results,
        outcome:
          isBlockedByMissingApi && results['supported-api'].status === 0
            ? 'NOT_REPRODUCED_ON_UPSTREAM_MAIN: Blocks API is unavailable; these failures do not reproduce policy type depth'
            : 'UNEXPECTED_BASELINE_RESULT: inspect diagnostics',
      },
      undefined,
      2,
    ),
  )

  process.exitCode =
    isBlockedByMissingApi && results['supported-api'].status === 0
      ? unavailableExitCode
      : 1
} finally {
  rmSync(scratch, { recursive: true, force: true })
}
