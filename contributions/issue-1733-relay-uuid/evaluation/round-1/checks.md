# CI checks — issue-1733-relay-uuid — round 1

Pull request https://github.com/foldkit/foldkit/pull/1751, head `0fde442c853e9d7fc1e872bdf887cce61802d852`. All runs finished on 21-10-2026.

| Check | Workflow | Result | Shared with `upstream` `main` |
|---|---|---|---|
| Lint, Typecheck & Test | CI | pass | — |
| Registry trust and discovery | MCP Windows | fail | not established |
| Plan | Examples E2E | pass | — |
| Shard 1 | Examples E2E | pass | — |
| Shard 2 | Examples E2E | pass | — |
| Shard 3 | Examples E2E | pass | — |
| Shard 4 | Examples E2E | pass | — |
| Shard 5 | Examples E2E | pass | — |
| Shard 6 | Examples E2E | pass | — |
| Shard 7 | Examples E2E | pass | — |
| Shard 8 | Examples E2E | pass | — |
| Shard 9 | Examples E2E | pass | — |
| Shard 10 | Examples E2E | pass | — |
| Examples E2E | Examples E2E | pass | — |

## Failure detail

- **Registry trust and discovery** (https://github.com/foldkit/foldkit/actions/runs/39612055676/job/119263172183): step `Test Vite plugin registry trust` (`vitest run test/relayRegistryTrust.test.ts` on `windows-latest`) failed one test, `relayRegistryTrust > returns the canonical path for a private directory`, with `Test timed out in 5000ms`; 22 passed, 9 skipped. The pull request does not change `test/relayRegistryTrust.test.ts` or `src/relayRegistryTrust.ts`, which that test imports.
- Shared status: `mcp-windows.yml` runs only on `pull_request` and `workflow_dispatch`, so `upstream` `main` has no run of this workflow to compare. The latest runs on other pull requests against `main` passed on 21-10-2026 (`feat/form-module` 9dffae0ca, `dependabot/npm_and_yarn/vite-8.3.3` 8ee1f66ed); the failed run on `dependabot/npm_and_yarn/modelcontextprotocol/sdk-1.32.0` failed at `Install dependencies`, a different failure. The failure is therefore not shown to be shared.
