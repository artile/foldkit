# Evaluation — implementation — round 2

- **Score:** 96
- **Critical findings:** 0
- **Verdict:** ready

## Findings

| # | Severity | Location | Finding | Suggested fix |
|---|---|---|---|---|
| 1 | minor | `packages/vite-plugin-foldkit/test/relayCleanup.test.ts:134-147` (`reports no relay defect when closing interrupts a retrying bind`) | The I1 test does not show that the relay fiber was still retrying when `server.close()` ran. The bind retries for about 4 s (`RELAY_BIND_RETRY_COUNT` 40 × `RELAY_BIND_RETRY_DELAY` 100 ms). If a slow runner lets the retries run out before the close, `catchTag('RelayBindFailed')` ends the fiber with the port-in-use message, nothing is interrupted, and `relayDefectCalls()` is still `[]`. The test then passes without testing interruption, and the `Effect.onInterrupt(...)` mutation recorded in status.md step 12 would also pass. | After `await server.close()`, also assert that `console.error` received no `[foldkit:devTools] Port ${port} is in use` call (or no call at all). This proves that the close interrupted a bind that was still retrying. |
| 2 | nit | `packages/vite-plugin-foldkit/test/relayCleanup.test.ts:82-89` and `:113-119` | The two tests repeat the same `console.log` spy, which throws for lines that start with `RELAY_LOG_PREFIX`. Only the throw handling is different. Round 2 moved the rest of the shared setup into `startDevServer()`, but this spy is still duplicated. | Add a file-local helper such as `failRelayListeningLog(onLine?: (line: string) => void): Error` that installs the spy and returns the thrown `Error`. Call it from both tests. |

## Notes

- Traced `src/index.ts`. `Effect.tapDefect` uses `tapCauseFilter` with `findDefect` (`repos/effect/packages/effect/src/internal/effect.ts:2863`), so it fires only on a `Die` cause. Each path behaves as follows:
  - **Defect in `relayId`, `relayToken`, `bind*`, the listening `Console.log` or `publishRelay`:** the defect line prints. `Effect.catch` in `publishRelay` handles failures only, so a defect there also reaches the tap.
  - **`RelayBindFailed`:** recovered by `catchTag` before the tap, so the defect line does not print (I3).
  - **Normal close of a bound relay:** the forked fiber has already completed, so nothing is interrupted.
  - **Close during bind retries:** interruption is not a defect, so the defect line does not print.
- Relay release still runs on the `main` scope through `acquireRelease`. `tapDefect` does not change this, so I2 stays intact.
- The new line matches `reportRelayBindFailed`: `Console.error` with a `[foldkit:devTools]` message followed by the raw cause.
- V1 fails on the base, because the base never calls `console.error` with `RELAY_DEFECT_MESSAGE`. The defect identity check (`defect === stdoutClosed`) makes the test specific to this defect.
- I1 cannot tell `tapDefect` and `tapCause` apart, because neither runs on an external interrupt. Status.md uses an `onInterrupt` mutation to check I1 instead, which is a reasonable choice.
- I3 depends on the existing `mcpRelay.test.ts` bind-failure tests, as the assignment chose. Those tests do not assert that the defect line is absent. The guarantee comes from the `catchTag` ordering, not from a test. This is not a deduction, because the assignment names that coverage.
- A defect raised while the fiber is being interrupted, for example in an in-flight `Effect.callback` cleanup during close, is not reported. This matches the assignment's scope (Risks: interruption must print nothing).
- `relayFixtures.ts` registers no hooks at module level (`useRelayRegistry` is a function), so importing `holdFreePort` and `isListenAttemptedOn` into `relayCleanup.test.ts` adds no side effects. `Server.prototype.listen` is spied after `holdFreePort()`, so `isListenAttemptedOn` sees only the relay's attempts.
- No debug output, TODOs, commented-out code or stray files. `mcpRelay.test.ts` changes only by removing `holdFreePort` and the imports it used.
- `checks.md`: all 14 checks pass. The round 1 MCP Windows timeout did not happen again.
