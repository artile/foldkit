# Mount emissions after teardown

Pinned upstream/main: `b702a5efbb74bebc056b798b414ddb923a82fbd5` (Foldkit 0.169.0, Effect 4.0.0). GitHub's main ref matched this pin during analysis on 21 October 2026.

Run against a prepared worktree:

```sh
cd /home/om/TAO/Tools/foldkit-worktrees/issue-1641-mount-late-dispatch/packages/foldkit
FOLDKIT_WORKTREE=/home/om/TAO/Tools/foldkit-worktrees/issue-1641-mount-late-dispatch pnpm exec vitest run --config /home/om/TAO/Tools/foldkit/.maintainer/contributions/issue-1641-mount-late-dispatch/reproduction/vitest.config.mjs --maxWorkers 2
```

The two tests use the actual Html hooks, Mount lifecycle, Stream processing, snabbdom patching and Submodel registry. The fixture deliberately postpones `Fiber.interrupt` until test cleanup, isolating delivery while the lifecycle is inactive and cancellation has not completed. It delivers one Message while live, destroys the element, and produces a second Message. A positive assertion proves the Stream processed both emissions. The worker limit is also set to 2 in the config.

Expected: the live Message is delivered, the late Message is dropped, lifecycle tracking reports one start and one end, and no error is logged.

Observed on the pinned base: both tests fail. The root Mount delivers the late `CompletedProbe` Message. The Submodel Mount logs:

```text
[OnMount Probe] unhandled failure
Foldkit: Mount dispatch missing wrap for ancestor "probe" of boundary "probe". The Submodel's wrap was absent from the Mount's render owner.
```

This is a controlled scheduling regression, not an independent reproduction of the issue author's reported Dialog frequency. Exploratory tests with ordinary interruption prevented late delivery. The claim that Dialog reaches this schedule roughly one run in five under jsdom was not verified here.

The expected contract is documented at `packages/website/src/page/core/mount.md:157`: unmount interrupts Mount work and Messages produced after interruption are discarded so update does not receive a Mount Message for a removed element. `Mount.define` also documents that `destroy` starts interruption without waiting and asynchronous release may finish later.

A disposable worktree at the same pin was used to validate checking `lifecycle.isActive` inside the per-emission `Effect.sync`. Both reproduction tests passed. The disposable fix is not part of these artifacts. Its other checks passed:

```sh
pnpm --dir packages/foldkit exec vitest run src/html/onMount.test.ts src/html/onUnmount.test.ts src/html/submodelTeardown.test.ts src/runtime/mountViewState.test.ts --maxWorkers 2
pnpm -F foldkit typecheck
pnpm -F foldkit build
```

The four focused test files passed all 53 tests. They cover Mount startup and finalization, replay acquisition, surviving live wrappers, OnUnmount, and DOM events fired during Submodel teardown.

The included benchmark uses built package entries and measures 500,000 live root Mount emissions, excluding module loading. Run it with:

```sh
node /home/om/TAO/Tools/foldkit/.maintainer/contributions/issue-1641-mount-late-dispatch/reproduction/mount-emission-benchmark.mjs /path/to/prepared/worktree
```

Three alternating process pairs, with two warmup batches and seven measured batches per process, produced process medians of 87.178 / 86.669 / 87.134 ms on the base and 89.611 / 89.674 / 88.736 ms with the guard. The median of process medians increased from 87.134 to 89.611 ms (2.84%, about 5 ns per emission). This is a local microbenchmark, not a browser latency measurement or a CI threshold. The intended complexity invariant is one allocation-free lifecycle read and branch per emission.
