# Evaluation — implementation — round 1

- **Score:** 91
- **Critical findings:** 0
- **Verdict:** ready

## Findings

| # | Severity | Location | Finding | Suggested fix |
|---|---|---|---|---|
| 1 | minor | CI, MCP Windows `Registry trust and discovery` (`checks.md`) | One check fails: `relayRegistryTrust > returns the canonical path for a private directory` timed out in 5000ms on `windows-latest`. The PR does not touch that test or `src/relayRegistryTrust.ts`, and other PR runs of the workflow passed on the same day, so it looks like a flaky timeout. But `checks.md` does not show it as shared with `upstream` `main`, so the checklist item "every CI check passing" is not met. | Re-run the failed job. If it passes, record the re-run in `checks.md`. If it fails again, show that it also fails without this change. |
| 2 | minor | `packages/vite-plugin-foldkit/test/relayCleanup.test.ts:141` (`reports no relay defect when the dev server closes`) | The test calls `server.close()` right after the listening line. At that point, the forked relay fiber may still be in the uninterruptible `publishRelay` tap, or it may already be done. `startMcpRelay` returns after publish, so a later close only runs the scope finalizer and does not interrupt the fiber. Whether the test interrupts the relay fiber at all therefore depends on timing. It does not deterministically cover I1's stated reason ("interruption is not a defect"). The test also never covers the long interruptible window, which is a close during bind retries on a busy fixed port. | Add a case, or change this one, so that the dev server closes while the relay fiber is still running. For example, occupy a fixed `devToolsMcpPort` so `Effect.retry` is in `Schedule.spaced`, close the server, and assert that no `RELAY_DEFECT_MESSAGE` call occurs. |
| 3 | minor | `packages/vite-plugin-foldkit/test/relayCleanup.test.ts:98-177` | The two new tests copy the setup of the existing test almost line for line: `httpServers.splice(0)`, the `onTestFinished` cleanup block, the `console.error`/`console.log` spies, the `createServer({ root: PACKAGE_ROOT, configFile: false, logLevel: 'silent', server: { middlewareMode: true }, plugins: [foldkit()] })` call, and the server-close hook. The file now has three copies of that block. | Extract a local helper (for example, `startDevServer()` that does the spies, cleanup registration and `createServer`) and call it from all three tests. |

## Notes

- I traced the change. `Effect.tapDefect` in the pinned `effect` source (`repos/effect/packages/effect/src/internal/effect.ts:2863`) is `tapCauseFilter(self, findDefect, f)`. It runs only when the cause contains a defect, it reports only the first defect, and the cause passes through unchanged. A `RelayBindFailed` is a typed failure and `catchTag` handles it before the tap, so I3 holds by construction. The relay release runs in `main`'s scope, outside the tapped Effect, so cleanup (I2) does not change, and a defect inside the release is not reported. That case is outside this contribution's scope.
- V1 is checked correctly. The assertion uses the exact message and checks identity (`defect === stdoutClosed`). `status.md` records that the test failed on the base. The redundant first poll on `isRelayListening` is harmless.
- No changes to types, casts, `relayId`, `package.json` or the lockfile. No debug output, TODOs or formatting churn.
