# CI checks — round 1

Pull request https://github.com/foldkit/foldkit/pull/1752 at head 8857c39080f1cbb2ca3db3d2ed455a8a021c9521. Comparison: the latest CI on the `upstream` default branch, merge-queue runs 39516319886 (CI) and 39516319708 (Examples E2E) for the commit now on `main`, both `success`.

| Check | Workflow | Result | Shared with `upstream/main` | Link |
|---|---|---|---|---|
| Lint, Typecheck & Test | CI | fail | no | https://github.com/foldkit/foldkit/actions/runs/39627031288/job/119314791820 |
| Plan | Examples E2E | pass | — | https://github.com/foldkit/foldkit/actions/runs/39627031647/job/119314793981 |
| Shard 1 to Shard 10 | Examples E2E | pass (all 10) | — | https://github.com/foldkit/foldkit/actions/runs/39627031647 |
| Examples E2E | Examples E2E | pass | — | https://github.com/foldkit/foldkit/actions/runs/39627031647/job/119316777420 |
| Registry trust and discovery | MCP Windows | pass | — | https://github.com/foldkit/foldkit/actions/runs/39627031318/job/119314791672 |

## Failure detail

`Lint, Typecheck & Test` failed at the step `Check commit message line length` ("Commit message prose must wrap at 80 characters"). Every commit in the range has a body line over the limit:

| Commit | Subject | Over-long body lines |
|---|---|---|
| 93ca18bd | fix(vite-plugin): revalidate the development build id after a dev server restart | line 3 (533 chars), line 5 (373 chars) |
| f1500a50 | fix(vite-plugin): clarify the development build id test and changeset | line 3 (211 chars) |
| 6b3cc5b7 | refactor(vite-plugin): resolve the development build id module with if/else | line 3 (111 chars) |
| 35e1efbf | test(vite-plugin): read the page build id through the shared helper | line 3 (119 chars) |
| 8857c390 | refactor(vite-plugin): keep the development build id binding beside its import | line 3 (201 chars) |

The job stopped at that step, so every later step of the job was skipped and did not run in CI: formatting, changeset checks, build, lint, dead code, circular dependencies, typecheck, the SSR and host parity gates, website build, and the tests. CI therefore gives no result for those gates on this head.
