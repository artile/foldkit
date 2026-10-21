import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

type Check = Readonly<{ ok: boolean; message: string }>

const LENS_FILES = [
  'brief.md',
  'checks.md',
  'maintainer.md',
  'implementation.md',
  'outcome.md',
] as const

const ROOT_ENTRIES = new Set([
  'status.md',
  'assignment.md',
  'reproduction',
  'evaluation',
])

const STATE_PATTERNS: ReadonlyArray<RegExp> = [
  /^analysis: in progress$/,
  /^analysis: assignment ready$/,
  /^analysis: published$/,
  /^analysis: concluded$/,
  /^implementation: delivered round [1-9]\d*$/,
  /^evaluation: failed round [1-9]\d*$/,
  /^evaluation: promoted round [1-9]\d*$/,
  /^(analysis|implementation|evaluation): escalated$/,
]

const pass = (message: string): Check => ({ ok: true, message })
const fail = (message: string): Check => ({ ok: false, message })

const isDirectory = (path: string): boolean =>
  existsSync(path) && statSync(path).isDirectory()

const readState = (statusPath: string): string | undefined => {
  const match = readFileSync(statusPath, 'utf8').match(
    /^Contribution `[^`]+` is currently at `([^`]+)`\.$/m,
  )
  return match?.[1]?.trim()
}

const roundOf = (state: string): number | undefined => {
  const match = state.match(/ round (\d+)$/)
  return match ? Number(match[1]) : undefined
}

const evaluationRounds = (directory: string): ReadonlyArray<number> => {
  const evaluation = join(directory, 'evaluation')
  if (!isDirectory(evaluation)) {
    return []
  }
  return readdirSync(evaluation)
    .map(entry => entry.match(/^round-([1-9]\d*)$/)?.[1])
    .filter((round): round is string => round !== undefined)
    .map(Number)
    .sort((a, b) => a - b)
}

const checkLayout = (directory: string): ReadonlyArray<Check> => {
  const extra = readdirSync(directory).filter(
    entry => !ROOT_ENTRIES.has(entry) && entry !== '.DS_Store',
  )
  const layout =
    extra.length === 0
      ? pass('artifact directory holds only defined entries')
      : fail(`artifact directory holds undefined entries: ${extra.join(', ')}`)

  const evaluation = join(directory, 'evaluation')
  const strayRounds = isDirectory(evaluation)
    ? readdirSync(evaluation).filter(
        entry => !/^round-[1-9]\d*$/.test(entry) && entry !== '.DS_Store',
      )
    : []
  const rounds =
    strayRounds.length === 0
      ? pass('evaluation/ holds only round-N directories')
      : fail(`evaluation/ holds undefined entries: ${strayRounds.join(', ')}`)

  const roundFiles = evaluationRounds(directory).flatMap(round => {
    const roundDirectory = join(evaluation, `round-${round}`)
    const stray = readdirSync(roundDirectory).filter(
      entry =>
        !(LENS_FILES as ReadonlyArray<string>).includes(entry) &&
        entry !== '.DS_Store',
    )
    return stray.length === 0
      ? []
      : [
          fail(
            `evaluation/round-${round}/ holds undefined entries: ${stray.join(', ')}`,
          ),
        ]
  })

  return [layout, rounds, ...roundFiles]
}

const requireFile = (directory: string, path: string): Check =>
  existsSync(join(directory, path))
    ? pass(`${path} exists`)
    : fail(`${path} is missing`)

const checkRoundFiles = (directory: string, round: number): ReadonlyArray<Check> =>
  LENS_FILES.map(file =>
    requireFile(directory, join('evaluation', `round-${round}`, file)),
  )

const checkState = (directory: string, state: string): ReadonlyArray<Check> => {
  const round = roundOf(state)
  const completedRounds = evaluationRounds(directory)

  if (state === 'analysis: assignment ready') {
    return [requireFile(directory, 'assignment.md')]
  }
  if (state === 'analysis: published' || state === 'analysis: concluded') {
    return [
      existsSync(join(directory, 'assignment.md'))
        ? fail(`assignment.md exists although the state is ${state}`)
        : pass('no assignment.md, as the state requires'),
    ]
  }
  if (state.startsWith('implementation: delivered') && round !== undefined) {
    const expected = round - 1
    const inProgress =
      completedRounds.length === round && completedRounds.at(-1) === round
    return [
      requireFile(directory, 'assignment.md'),
      completedRounds.length === expected
        ? pass(`${expected} earlier evaluation round(s), as round ${round} requires`)
        : inProgress
          ? pass(`${expected} earlier evaluation round(s), with round ${round} under evaluation`)
          : fail(
              `round ${round} requires ${expected} earlier evaluation round(s), found ${completedRounds.length}`,
            ),
    ]
  }
  if (state.startsWith('evaluation: ') && round !== undefined) {
    return [
      requireFile(directory, 'assignment.md'),
      completedRounds.at(-1) === round
        ? pass(`round-${round} is the latest evaluation round`)
        : fail(`round-${round} is not the latest evaluation round`),
      ...checkRoundFiles(directory, round),
    ]
  }
  return []
}

const run = (directory: string, returnedState: string | undefined): ReadonlyArray<Check> => {
  if (!isDirectory(directory)) {
    return [fail(`${directory} is not a directory`)]
  }
  const statusPath = join(directory, 'status.md')
  if (!existsSync(statusPath)) {
    return [fail('status.md is missing')]
  }
  const state = readState(statusPath)
  if (state === undefined) {
    return [fail('status.md has no "Contribution `<slug>` is currently at `<state>`." line')]
  }
  const known = STATE_PATTERNS.some(pattern => pattern.test(state))
  const stateChecks: ReadonlyArray<Check> = [
    known
      ? pass(`state "${state}" is a known state`)
      : fail(`state "${state}" is not a known state, verbatim`),
    ...(returnedState === undefined
      ? []
      : [
          returnedState === state
            ? pass('returned state matches status.md')
            : fail(
                `returned state "${returnedState}" differs from status.md "${state}"`,
              ),
        ]),
  ]
  return [
    ...stateChecks,
    ...checkLayout(directory),
    ...(known ? checkState(directory, state) : []),
  ]
}

const [directory, returnedState] = process.argv.slice(2)

if (directory === undefined) {
  console.error('Usage: node check.ts <artifact directory> [returned state]')
  process.exit(2)
}

const checks = run(directory, returnedState)
for (const { ok, message } of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${message}`)
}
process.exit(checks.every(({ ok }) => ok) ? 0 : 1)
