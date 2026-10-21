# Assignment | issue-1641-mount-late-dispatch

- **Base:** `foldkit/foldkit` `upstream/main` @ `b702a5efbb74bebc056b798b414ddb923a82fbd5`
- **Branch:** `issue-1641-mount-late-dispatch`
- **Target branch:** `main`
- **Analysis:** https://github.com/foldkit/foldkit/issues/1641#issuecomment-6323514249

## Goal

Drop each Mount emission whose owning lifecycle has ended, before dispatch or Submodel boundary lookup. A controlled test that delays destroy-triggered fiber interruption exposes two failures on the base: a root Mount delivers a Message after destroy, and a Mount in a removed Submodel logs a missing-wrap failure. Guarding delivery belongs in the framework's OnMount handler, which owns the lifecycle and dispatch.

The target matches the Unmount contract in `packages/website/src/page/core/mount.md`: update must not receive a Mount Message for a removed element. The controlled test isolates the interval between lifecycle release and completed cancellation. Ordinary interruption probes did not reproduce the issue author's reported jsdom/Dialog frequency; do not claim that frequency was verified.

## Verification

Each row needs a regression test observed failing on the clean base and passing with the change. Exercise the real Html hooks, Stream runner, snabbdom patching, and boundary registry. Delay only the destroy-triggered `Fiber.interrupt` through the test seam used in the reproduction, then perform the real interruption during cleanup.

| # | Given | When | Then |
|---|---|---|---|
| V1 | A root Mount backed by a Queue has delivered one live `CompletedProbe` Message, and destroy-triggered interruption is held pending | Destroy its element, then emit another `CompletedProbe` and wait until the Stream processes it | The second Message is dropped, no error is logged, and tracking records one start and one end. On the base the second Message reaches dispatch. Test: `drops a root Mount emission after destroy while interruption is pending`. |
| V2 | The same Mount is inside a Submodel boundary and has delivered one live Message | Patch out the Submodel, removing its boundary registration, then emit another Message with interruption held pending | The second Message is dropped before boundary lookup, no `[OnMount Probe] unhandled failure` is logged, and tracking records one start and one end. On the base the missing-wrap failure is logged. Test: `drops a Mount emission after its Submodel boundary is removed while interruption is pending`. |

| # | Invariant | Observed by |
|---|---|---|
| I1 | Live root and Submodel emissions reach dispatch. Every emission is checked against its own captured lifecycle. | Positive live-delivery assertions in V1 and V2; existing `dispatches every Message a streaming Stream emits over the element lifetime` in `html/onMount.test.ts`. |
| I2 | Destroy requests interruption, acquired resources finalize, and lifecycle tracking ends exactly once. The delivery guard does not replace cancellation. | V1/V2 assert a pending interruption and drain it in cleanup; existing listener cleanup, key-change cleanup, parent re-render cleanup, and `Mount.define wraps an Effect` tests in `html/onMount.test.ts`. |
| I3 | Replay release precedes replacement acquisition; a released lifecycle cannot acquire a replacement after unmount. Each acquisition has its own lifecycle object. | Existing `releases a replay Mount before acquiring its live replacement through a controlled-property postpatch` and `does not acquire the live replacement when the element unmounts during replay cleanup` in `html/onMount.test.ts`. |
| I4 | A surviving live Mount uses the latest live Submodel wrapper, including during paused historical views and resume. | Existing `uses the latest live Submodel wrapper when a surviving Mount emits`, acquisition-render wrapper, paused-result, and resume tests in `runtime/mountViewState.test.ts`. |
| I5 | OnUnmount Messages and DOM events raised during teardown retain their dispatch semantics. | All tests in `html/onUnmount.test.ts` and `html/submodelTeardown.test.ts`. |
| I6 | Stream factory defects are reported and genuine live dispatch errors are not hidden. | Existing synchronous factory failure and failing Stream tests in `html/onMount.test.ts`; inspect that `catchCause` and boundary lookup behavior are unchanged. |
| I7 | The delivery check adds one allocation-free lifecycle read and branch per emission, without a new fiber, async boundary, or per-emission lookup/allocation. | Inspect the dispatch callback and run `reproduction/mount-emission-benchmark.mjs` against built base and implementation entries. Analysis measured +2.84% locally; this is evidence, not a hard timing threshold. |

- **Reproduction:** [late-dispatch.test.ts](reproduction/late-dispatch.test.ts), [vitest.config.mjs](reproduction/vitest.config.mjs), and [README.md](reproduction/README.md).
- **Command:** From `/home/om/TAO/Tools/foldkit-worktrees/issue-1641-mount-late-dispatch/packages/foldkit`, run `FOLDKIT_WORKTREE=/home/om/TAO/Tools/foldkit-worktrees/issue-1641-mount-late-dispatch pnpm exec vitest run --config /home/om/TAO/Tools/foldkit/.maintainer/contributions/issue-1641-mount-late-dispatch/reproduction/vitest.config.mjs --maxWorkers 2`.
- **Test placement:** Add `packages/foldkit/src/html/onMountLateDispatch.test.ts` for V1/V2. Keep the controlled Effect module mock isolated in that file so ordinary-interruption tests exercise the real implementation. Adapt the reproduction to repository-relative `.js` imports, typed fixtures, Schema Message constructors, and the repository's naming/style rules. Restore mocks and interrupt every held fiber even when an assertion fails. Use bounded waits with positive Stream-processing assertions so a test cannot pass because its second emission was never consumed. Keep executable fixtures as source, not template strings.

## Specification

1. In `packages/foldkit/src/html/index.ts`, locate the `OnMount` attribute handler's `acquireMount`, its captured `lifecycle`, and `runMount`. Inside the existing per-emission `Effect.sync` callback passed to `Stream.runForEach`, call `mountDispatch(message)` only when that captured `lifecycle.isActive` is true. Read the flag inside the Effect's synchronous body, immediately before dispatch, on every emission.
2. Preserve the initial `Effect.suspend` active check, which prevents starting work for a released lifecycle. Preserve `releaseMount` setting the flag before destroy forks interruption. Preserve `Fiber.interrupt`, finalization, tracker notifications, replay acquisition ordering, and per-acquisition lifecycle identity.
3. Preserve the `resolveMountDispatch.resolve()` integration and its live boundary-wrapping behavior. Do not capture an eager wrapper chain, bypass the boundary registry, catch missing-wrap errors, or weaken the missing-wrap diagnostic. A released Mount must skip dispatch before any boundary resolution; an active Mount must use the existing dispatch path.
4. Add the regression file specified above and `.changeset/drop-released-mount-emissions.md`. These and `html/index.ts` are the intended implementation files. Existing focused test files are verification inputs; change them only if necessary to integrate equivalent coverage, without changing the required assertions.

No new API, service, runtime state, dependency, or cancellation mechanism is needed. Related PRs #1541 (Dialog resource release), #1568 (Scene Mount startup), #1655, and #1729 did not cover this root cause at analysis time. Recheck upstream changes under the implementation stage's base-change rule before editing.

## Compatibility

Public exports, types, signatures, and dependencies are unchanged. Observable behavior changes only for emissions from released Mount lifecycles: the Message is discarded rather than delivered at the root or sent through a removed Submodel boundary. Active Mount dispatch and resource cleanup retain their contracts. Consumers need no migration. Version impact is `patch` for `foldkit`; Changesets handles the fixed version group with `@foldkit/ui` and `@foldkit/devtools`.

## Boundaries

- Exclude Dialog resource ownership, `Dom.showDialog`, UI package changes, Scene startup, Subscriptions, Commands, general dispatch filtering, and boundary registry redesign.
- Exclude a benchmark harness shipped in package source or a timing assertion in CI. The artifact benchmark provides local comparative evidence.
- The documented lifecycle contract already describes the target behavior. No website, historical release post, public API documentation, dependency, lockfile, or manual version edit is required.
- No later increment or maintainer API decision is required for this fix.

## Completion

- Add `.changeset/drop-released-mount-emissions.md` with `"foldkit": patch`. Explain the root delivery and removed-Submodel failure, and that released Mount emissions are discarded while cleanup runs. Credit @boozedog for the report and suggested guard. Use release-note prose, one source line per paragraph, without em dashes.
- Run the artifact reproduction on the clean base and then the implementation. Run the new regression tests before adding the guard and observe both expected failures. After the fix, remove only the delivery guard temporarily and rerun V1/V2 to prove they detect the regression, then restore it.
- From the worktree root run `pnpm --dir packages/foldkit exec vitest run src/html/onMountLateDispatch.test.ts src/html/onMount.test.ts src/html/onUnmount.test.ts src/html/submodelTeardown.test.ts src/runtime/mountViewState.test.ts --maxWorkers 2`, `pnpm -F foldkit typecheck`, and `pnpm -F foldkit build`. Analysis's disposable guard passed the two artifact tests, the 53 existing focused tests, typecheck, and build. Implementation must verify its own final change.
- Compare the supplied benchmark against built base and final implementation using `node /home/om/TAO/Tools/foldkit/.maintainer/contributions/issue-1641-mount-late-dispatch/reproduction/mount-emission-benchmark.mjs /path/to/prepared/worktree`. Follow the alternating-pair method in its README and record results without converting them into a browser latency claim.
- Check formatting, lint, and changeset status; complete repository-required checks before any eventual push. Use at most two test workers on this host. Commit conventions are `fix(foldkit): <subject naming the lifecycle delivery guard>`, an explanatory body, and author `Taras Kornichuk <dread9ko@gmail.com>`. Follow the repository commit helper and exact committed-diff review gate when authorized to commit and push.
- Eventual PR target is `foldkit/foldkit:main`, head `artile/foldkit:issue-1641-mount-late-dispatch`, with `Fixes #1641`. Its title is the Conventional Commit subject and description the squash commit body; put verification in the first Validation comment. Repository `AGENTS.md` prevails over conflicting generic templates and `CONTRIBUTING.md` for those fields.
- On 2026-10-21 the daily PR count is 3/3. Implementation is held locally today. Do not open a PR or publish its Validation comment until a later authorized run reserves capacity under the state lock and passes the required gates. Until delivery is allowed, record progress under `analysis: assignment ready`, not `implementation: delivered round 1`.

## Risks

- Critical: checking the flag only when creating the Effect or starting the Stream. Release can happen before a later emission executes.
- Critical: filtering only missing Submodels. A root Mount must also drop emissions after release.
- Critical: reading another acquisition's lifecycle, or changing wrapper capture so a surviving live Mount uses stale wrapping.
- Critical: replacing interruption with filtering, suppressing finalizers, changing replay cleanup ordering, or losing lifecycle tracker balance.
- Critical: tests passing because cancellation stops the second emission before it reaches the controlled window. Assert Stream processing, live delivery, and the pending interrupt, and show both tests fail without the guard.
- The scheduling seam deliberately postpones interruption. The ordinary-interruption frequency and Dialog-specific report are unverified; evaluation must distinguish those claims from the deterministic lifecycle regression.
