# Assignment — issue-1733-relay-uuid

- **Base:** `foldkit/foldkit` `upstream/main` @ `7ee214268c602967937b80f6f20d1e831f2e8ab6`
- **Branch:** `issue-1733-relay-uuid`
- **Target branch:** `main`
- **Analysis:** https://github.com/foldkit/foldkit/issues/1733#issuecomment-6317480108

## Goal

When the forked DevTools MCP relay fiber dies with a defect, the dev server prints the defect on stderr instead of losing it. Issue #1733 is the user-visible failure: with `effect` 4.0.3 or later, `relayId` dies with `TypeError: yield* (intermediate value) is not iterable`, the relay never starts, and the dev server prints nothing about it. This contribution adds only the defect report. The `relayId` call change and the `effect` peer change belong to open PR #1699 and are out of scope.

## Verification

| # | Given | When | Then |
|---|---|---|---|
| V1 | A Vite dev server with `plugins: [foldkit()]`, and `console.log` mocked to throw `new Error('stdout is closed')` for the line that starts with `[foldkit:devTools] MCP relay listening at ` (the seam the existing test in `test/relayCleanup.test.ts` uses), so the relay fiber dies with a defect after it binds | The relay fiber dies | `console.error` receives a call whose first argument is exactly `[foldkit:devTools] MCP relay failed with an unexpected error` and whose second argument is that same `Error` instance. On the base, `console.error` receives no such call. |
| V2 | A packed build of the changed `@foldkit/vite-plugin`, installed with `foldkit` 0.169.0, `vite` 8.3.2 and `effect` 4.0.4 (with `overrides` for `effect`) | `npx vite` starts the dev server | stderr shows `[foldkit:devTools] MCP relay failed with an unexpected error` followed by `TypeError: yield* (intermediate value) is not iterable`. On the base (published 0.28.0), stderr shows nothing about the relay. Manual check only; record the command and output in the pull request description. |

| # | Invariant | Observed by |
|---|---|---|
| I1 | A relay that starts and then closes with the dev server prints no `[foldkit:devTools] MCP relay failed with an unexpected error` line, because interruption is not a defect. | New assertion in a test that starts a dev server with a working relay, closes it, and checks `console.error` calls (add it in `test/relayCleanup.test.ts` beside V1) |
| I2 | A relay acquired before a defect is still closed when the dev server closes. | Existing `closes a relay acquired before startup logging fails` in `test/relayCleanup.test.ts` |
| I3 | A failed bind (`RelayBindFailed`) prints only the existing `reportRelayBindFailed` message, not the new defect line. | Existing port-in-use and bind-failure tests in `test/mcpRelay.test.ts` |
| I4 | All existing relay behavior: listening line, publish, discovery, cleanup, registry trust. | `pnpm --filter @foldkit/vite-plugin test` |

- **Reproduction:** `reproduction/run.sh` and `reproduction/repro.mjs` in the artifact directory
- **Command:** `reproduction/run.sh 4.0.4` (exit 1, "relay did NOT start", nothing on stderr); `reproduction/run.sh 4.0.0` (exit 0, "relay started")
- **Test placement:** `packages/vite-plugin-foldkit/test/relayCleanup.test.ts`, Vitest, top-level `it(...)` as in that file. Spy on `console.error` with `vi.spyOn(console, 'error').mockImplementation(() => {})` so the test output stays clean, and read calls through `vi.mocked(console.error).mock.calls`. Restore mocks in `onTestFinished` as the existing test does. In the existing `closes a relay acquired before startup logging fails` test, also mock `console.error` so the new defect line does not print into the test output.

## Specification

File: `packages/vite-plugin-foldkit/src/index.ts`.

1. Next to `reportRelayBindFailed`, add a module-private function:

   ```ts
   const reportRelayDefect = (defect: unknown) =>
     Console.error(
       '[foldkit:devTools] MCP relay failed with an unexpected error',
       defect,
     )
   ```

2. In `main`, at the `Effect.forkScoped(startMcpRelay(server, options.devToolsMcpPort, enqueue))` call, pipe the relay Effect through `Effect.tapDefect(reportRelayDefect)` before forking:

   ```ts
   yield* Effect.forkScoped(
     startMcpRelay(server, options.devToolsMcpPort, enqueue).pipe(
       Effect.tapDefect(reportRelayDefect),
     ),
   )
   ```

   Use `Effect.tapDefect`, not `Effect.tapCause`, so interruption on a normal close prints nothing (I1). Keep the existing `// NOTE:` comment above the `if` unchanged.

3. Do not change `relayId`, `relayToken`, `startMcpRelay`, the retry or `RelayBindFailed` handling, the release logic, or any `package.json`.

Integration points: the plugin runs `main` with `Effect.runFork` in `configureServer`, and `stopMain` interrupts it on close; neither changes. `Console.error` writes through `console.error`, so tests observe it with a spy.

## Compatibility

No public API change. Observable behavior change: a defect in the relay fiber now prints one `console.error` line with the defect; before, nothing printed. No change to the relay protocol, registry records, or options. Version impact: `patch` for `@foldkit/vite-plugin`.

## Boundaries

- Out of scope: the `relayId` change to `crypto.randomUUIDv4()` and the `effect` peer range; PR #1699 owns both. Do not touch `packages/vite-plugin-foldkit/package.json` or `pnpm-lock.yaml`.
- Out of scope: defect reporting in other forked fibers or packages (`@foldkit/devtools-mcp`, `foldkit` runtime).
- Out of scope: a test that injects a defect into `relayId` through a substitute `Crypto` service; the plugin provides `NodeCrypto.layer` internally and has no seam for it, and adding one is a design change this contribution does not make.
- Out of scope: website docs; the change adds no API.

## Completion

- Add `.changeset/report-relay-defects.md` with `'@foldkit/vite-plugin': patch`. Write it as release notes, one line per paragraph, no em dashes: say that a defect in the DevTools MCP relay fiber was lost so the relay could fail to start with no output (for example, with `effect` 4.0.3 or later), and that the dev server now prints the defect. End with thanks to @Makisuo, who reported #1733.
- Commit: Conventional Commits, `fix(vite-plugin): <subject naming the mechanism>`, with a body that states what was wrong and what changed, prose wrapped at 80 characters. No AI attribution in the commit, PR title, or PR description.
- Pull request title is the commit subject; description is the commit body with each paragraph on one line, plus `Refs #1733` (not `Fixes`, because the `relayId` change in #1699 is still needed to resolve the issue). Put the V2 manual verification output in the first PR comment, not the description, per `AGENTS.md`.
- Run `pnpm lint`, `pnpm -r typecheck`, `pnpm --filter @foldkit/vite-plugin test`, `pnpm format`, and `pnpm changeset status` before pushing; the pre-push hook runs `pnpm pre-push`. Where `CONTRIBUTING.md` and `AGENTS.md` differ, `AGENTS.md` prevails for PR description content (verification goes in the first comment).

## Risks

- Critical: the new line printing on a normal dev server close or restart (would mean `tapCause` or an interrupt path was used). I1 must pass.
- Critical: the change altering relay cleanup, so a relay stays bound after `server.close()`. I2 must pass.
- Critical: any edit to `relayId`, peer ranges, or dependencies that overlaps PR #1699.
- V1 must be shown to fail on the base: revert the `tapDefect` line, run the test, confirm it fails on the missing `console.error` call, then restore.
- In analysis validation on the base, `test/devToolsOverlay.test.ts > injects the overlay before the application entry during development` failed with and without the change, and `test/mcpRelay.test.ts > refuses a relay connection that lacks the published token` failed once in a full parallel run and passed in three isolated runs. Do not count either as a regression from this change unless it fails in the contribution worktree after `pnpm build` and also passes there on the base.
- `Console.error` itself can throw if stderr is closed; the tap then dies too, which matches the base behavior and needs no handling.
