# CI checks — issue-1733-relay-uuid — round 2

Pull request https://github.com/foldkit/foldkit/pull/1751, head `731fa2ba63e8b538ec9d3b895995b2f4d7b47583`. Runs CI 39617794838, MCP Windows 39617794703 and Examples E2E 39617794963 finished on 21-10-2026.

| Check | Workflow | Result | Shared with `upstream` `main` |
|---|---|---|---|
| Lint, Typecheck & Test | CI | pass | — |
| Registry trust and discovery | MCP Windows | pass | — |
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

## Note on the round 1 failure

The round 1 failure of `Registry trust and discovery` (`relayRegistryTrust > returns the canonical path for a private directory`, timed out in 5000ms, run 39612055676) does not repeat in run 39617794703. The pull request does not change that test or the module it imports, and status.md step 12 records the same test at 2074ms to 4108ms in earlier passing runs and failing on another branch. The round 1 failure is therefore a timing flake independent of the change.
