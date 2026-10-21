# Evaluation — maintainer — round 1

- **Score:** 89
- **Critical findings:** 0
- **Verdict:** ready

## Findings

| # | Severity | Location | Finding | Suggested fix |
|---|---|---|---|---|
| 1 | minor | `.changeset/report-relay-defects.md:5` | The release note switches terms in one paragraph. It opens with "unexpected errors", then says "lost a defect in the relay fiber". "Defect" and "fiber" are Effect internals that a plugin user does not need, and AGENTS.md asks for one technical noun throughout an explanation. The example "for example with `effect` 4.0.3 or later" names a range outside the plugin's exact `effect: 4.0.0` peer. It also goes stale if #1699 (peer `^4.0.5`, fixed `relayId`) ships in the same release, because then the changelog says the relay fails on Effect versions that the same release supports. | Keep one term and drop the version example, for example: "Print unexpected errors from the DevTools MCP relay. Before, an unexpected error stopped the relay and the dev server printed nothing about it." Keep the second paragraph as it is. |
| 2 | minor | `packages/vite-plugin-foldkit/test/relayCleanup.test.ts:98-178` | The file now has three tests that each repeat the same `httpServers.splice(0)` / `onTestFinished` cleanup block, the same `console.error` / `console.log` spy setup and the same `createServer({ root, configFile: false, logLevel: 'silent', server: { middlewareMode: true }, plugins: [foldkit()] })` call. The two new tests also repeat the `Array.some(vi.mocked(console.error).mock.calls, ...)` reader. A maintainer would factor this before a fourth test copies it. | Extract a file-local `startDevServer()` that registers the cleanup and returns the server, and a `relayDefectCalls()` reader that returns the matching `console.error` calls. Use both in all three tests. |
| 3 | minor | PR #1751 description | CONTRIBUTING.md asks the description to "call out scope decisions explicitly so a reviewer can disagree with them directly". The main scope decision is that `relayId` is left to #1699, so the relay still does not start on `effect` 4.0.3 or later. The description does not say this. Only the Validation comment says it, and the comment does not become part of the squash commit. A maintainer who reads only the description will ask why the PR does not fix the `TypeError` it quotes. | Add one sentence to the body, for example: "The relay still does not start on effect 4.0.3 or later until #1699 changes relayId; this change makes that failure visible." |
| 4 | nit | PR #1751 description and commit body, last sentence of paragraph 2 | "This is a patch for @foldkit/vite-plugin with no public API change." is release bookkeeping that the changeset already records. It reads as review material in `git log` on `main`. | Delete the sentence. |
| 5 | nit | `.changeset/report-relay-defects.md:9` | "Thanks to @Makisuo for reporting #1733." does not match the form that existing changesets use ("Thanks @artile for the report."). | Write "Thanks @Makisuo for the report." |

## Notes

- Fit: the change is one concern in the right place. `reportRelayDefect` sits next to `reportRelayBindFailed`, uses the same `[foldkit:devTools]` prefix and passes the raw value to `Console.error` the same way that `reportRelayBindFailed` passes `cause`. The `tapDefect` at the `forkScoped` call does not change `relayId`, the peer range or the relay cleanup. Compatibility correctly lists the new stderr line as the only behavior change. The `patch` bump and the changeset file name match CONTRIBUTING.md.
- `@foldkit/devtools-mcp` (`src/server.ts:131`) reports fatal causes with `Effect.tapCause`, `Cause.hasInterruptsOnly` and `Cause.pretty`. The plugin now uses `Effect.tapDefect` with the raw defect. This is not a deduction: the assignment chose `tapDefect`, it is in a different package, and the raw `Error` gives Node's stack trace. A maintainer may still ask why the two packages report defects differently.
- `main` itself still runs under `Effect.runFork` in `configureServer`, and nothing reads its exit, so a defect outside the relay fiber is still lost. Boundaries exclude this. It may be worth a follow-up issue after this PR merges.
- The MCP Windows failure (`relayRegistryTrust > returns the canonical path for a private directory`, timeout) is in a file that this PR does not touch. It is not deducted under this lens.
