# Producer progress

Pinned upstream commit: `b702a5efbb74bebc056b798b414ddb923a82fbd5`.

Run against a worktree whose dependencies are installed and whose Foldkit package is built:

```sh
node /home/om/TAO/Tools/foldkit/.maintainer/contributions/issue-1771-paint-starvation/reproduction/producer-progress.mjs /home/om/TAO/Tools/foldkit-worktrees/issue-1771-paint-starvation
```

The script loads that worktree's built Foldkit modules, Effect 4.0.0, and happy-dom 20.14.5. It mounts a counter with `Runtime.makeElement`, dispatches real DOM clicks through `h.OnClick`, and controls animation-frame and MessageChannel delivery. Each expensive update advances the processing clock by 6 ms, exceeding the queue's 5 ms budget. One frame runs before each deferred drain delivery.

Two expensive cases exercise the same failure. The reentrant producer dispatches its next click during update, matching the issue's synthetic stress case. The external producer dispatches its next click from the driver after each deferred drain returns and before the next frame, so production of Messages does not depend on side effects in update. The mocked processing clock is fixture instrumentation. Dispatching DOM events from update is not an application pattern to copy.

Expected: the DOM displays an intermediate count while either 24-turn producer is active. The assertion deliberately does not prescribe the exact frame bound a fix chooses.

Observed on the pinned commit: both expensive cases print 23 samples with Model counts 1 through 23 and DOM count 0. Their final DOM count is 24 after the producer stops. The zero-cost reentrant control processes and renders 24 without a deferred drain. The script exits 1 with `AssertionError: the DOM must make progress before a 24-turn producer stops`, identifying both `reentrant` and `external` cases.

The expectation comes from issue #1771 and the runtime queue's documented intent to yield so the browser can paint, plus the performance guide's coalesced rendering model. The guide also requires processing deferred Messages before restoring controlled input values. There is no published numerical maximum delay. The reproduction tests DOM commits under a controlled schedule, not browser paint timing or a wall-clock latency guarantee.

Environment used: Linux 7.1.12-2-7-ARCH aarch64, Node v22.22.3, pnpm 11.8.0, Foldkit 0.169.0. No browser was used. The readiness validation below measures a disposable prototype; its implementation is excluded from these artifacts.


## Resolution readiness validation

On 25-10-2026, fetched `upstream` and `artile`; `upstream/main` is the pinned commit. Confirmed `artile/foldkit` is a fork of `foldkit/foldkit` with Actions disabled. Used detached disposable worktree `/home/om/TAO/Tools/foldkit-worktrees/validation-1771` from that commit. Installed dependencies offline from the existing pnpm store, ran cloud-session setup and the skill linker, and prototyped only the queue and renderer. The contribution worktree's tracked source was not changed.

The original producer script fails on base and passes on the candidate for both producers. Candidate DOM commits include 5, 10, 15, and 20 before reaching 24, with exactly three blocked frames between commits in the controlled schedule. `producer-base.txt` and `producer-candidate.txt` hold the results.

`readiness-checks.mjs` has 12 checks. Run it with `node <this-directory>/readiness-checks.mjs <worktree>`. It imports the selected worktree's built package. The queue checks call an internal method and therefore require the candidate. Pass `--runtime-only` to test the renderer on the base; it fails because the fourth blocked frame does not commit. `readiness-base.txt` holds that failure; `readiness-candidate.json` records all 12 passing checks. The candidate's stderr contains the expected crash diagnostic for the defect test.

Coverage: FIFO prefix capture; reentrant suffix isolation; ownership of the posted drain after an empty prefix; boot, rendering, disposal, and crash gates; nested-drain prevention; failure attribution; queued controlled-input freshness; exact fourth-opportunity progress and reset after commit; repeated asynchronous ViewTransition refusals; mixed frame and callback refusals; stale callback invalidation on a forced plain frame; `Render.afterCommit` pending and completion behavior; stale callbacks after disposal; and a defect during forced catch-up.

Candidate validation also passed the original affected test command (4 files, 53 tests), `pnpm exec vitest run src/runtime` (20 files passed, 1 file skipped; 251 tests passed, 1 skipped), `pnpm --filter foldkit build`, `pnpm --filter foldkit typecheck`, and Oxfmt checks for both changed source files. These counts overlap. Full workspace and browser suites were not run in Phase 1.

## Required target behavior

1. Add an internal queue operation named `drainQueuedPrefix`. Observe boot, processing, rendering, disposal, and crash gates. Capture all pending Messages once at entry, detach that finite prefix, and process it in FIFO order without the 5 ms cutoff. Messages enqueued while processing form a separate suffix and cannot extend the prefix. Preserve the deferred flag and already-posted MessageChannel task, even if the prefix empties the queue; subsequent arrivals belong to that task. Attribute errors to the current Message through the existing crash path. Restore processing state and account processing time on every exit. Normal drains retain their cumulative budget, idle-gap reset, task scheduling, and arrival order.
2. In `renderer.ts`, use one internal counter with a limit of three queue-related refusals since the last successful live DOM commit. Count only otherwise eligible live commit opportunities. Evaluate disposal, crash, and DevTools pause/replay guards first. A frame refused because the Model is behind the queue increments the counter, retains the pending commit, and schedules another frame. Preserve the live-restore intent when retrying. Starting a ViewTransition, a clear queue observed at frame entry, or requesting a retry does not reset the counter. Reset it only after a successful live patch, before processing patch-time Messages.
3. On the next blocked opportunity after three refusals, invalidate and skip an older pending ViewTransition, catch up the finite prefix, recheck disposal/crash, and commit plainly with the latest Model and dirty-Message attribution. A forced frame bypasses creation of a new ViewTransition. Preserve the existing frame budget reset and post-patch Message drain, Mount handling, DevTools attribution, and commit notifier ordering. Catch-up must not steal the suffix or posted drain.
4. A delayed ViewTransition update callback checks its invalidated/didRun guard and all lifecycle/pause guards before participating. If it finds queued deferred work and fewer than three refusals have accumulated, invalidate/skip that transition, increment the same counter once, retain the commit waiter, and request another frame. Repeated callback refusals and ordinary frame refusals share the allowance. If it is the fourth blocked opportunity, skip/invalidate its transition, catch up the prefix, recheck lifecycle, and execute the ordinary render body during that callback. Do not postpone this forced commit behind another transition. Every stale or duplicate callback is inert. Existing promise rejection suppression and transition start-failure fallback remain intact.
5. This is a bound on eligible queue-blocked commit opportunities under a delivering host. It is not a four-rAF guarantee when asynchronous callbacks intervene, a wall-clock bound, or a guarantee that the browser paints. An undelivered callback or frame supplies no opportunity. Catch-up is finite in Message count, not bounded in CPU time.

Affected production files are `packages/foldkit/src/runtime/messageQueue.ts` and `renderer.ts`; add focused tests alongside the runtime scheduling/transition tests and preserve input tests. No new public API, runtime option, dependency, or time-based policy is required. Publish a `foldkit` patch changeset describing the scheduling correction. Prototype source must not be copied into an assignment or any other handoff artifact.

## Base versus candidate measurements

Run `node <this-directory>/scheduling-benchmark.mjs <worktree>`. Used sequential fresh processes in base, candidate, candidate, base order, without overlapping the test run. Each process warms the queue workload 4 times and measures 15 samples, and warms each runtime workload 3 times and measures 9 samples. The table pools samples from the two processes for each side. Timings use `process.hrtime.bigint`; only the drain clock is simulated. Assertions require identical total Message counts and final DOM values. Raw output is in `benchmark-{base,candidate}-{1,2}.json`; pooled medians are in `benchmark-summary.json`.

| Workload | Base median | Candidate median | Change |
|---|---:|---:|---:|
| 500,000 cheap queue enqueues | 49.490 ms | 49.591 ms | +0.2% |
| 20,000 DOM clicks, coalesced commit | 83.314 ms | 83.643 ms | +0.4% |
| 1,500 individual DOM commits | 13.037 ms | 13.542 ms | +3.9% |
| 5,000 sustained reentrant Messages, simulated 6 ms processing cost | 22.051 ms | 26.672 ms | +21.0% |

The first runtime workload commits once on both versions; the second commits 1,500 times on both. The sustained workload commits once on base and 1,001 times on the candidate. Its simulated update cost triggers deferral without spending 6 ms of CPU per Message. The measured overhead pays for actual extra DOM work in happy-dom and does not predict a browser's render or paint cost. These measurements do not establish performance parity.

Run `node <this-directory>/prefix-cost-benchmark.mjs <worktree>` for actual 6 ms CPU updates and pending-prefix sizes 1, 16, and 64, three samples each. On base the benchmark services the pending Messages through normal deferred tasks; on the candidate it invokes the prefix operation once. Both process the same pending count. Raw results are in `prefix-cost-{base,candidate}.json`.

| Pending Messages | Base total / longest drain median | Candidate total / longest drain median |
|---|---:|---:|
| 1 | 6.031 / 6.025 ms | 6.011 / 6.011 ms |
| 16 | 96.133 / 6.014 ms | 96.218 / 96.215 ms |
| 64 | 384.528 / 6.016 ms | 384.062 / 384.051 ms |

The prefix deliberately concentrates work into a long task. If queued work is large, the opportunity bound cannot also imply a short frame. Imposing a CPU cap while repainting before all already-queued input Messages process would violate the input-freshness requirement; processing a prefix across more tasks would require a different snapshot/commit policy. Do not promise a numerical paint latency.

Carry these regression bounds into implementation Verification: on the same host, with the same fixture, warmups, and alternating process order, each normal-path pooled median must be at most 1.10 times base, and the sustained-workload median at most 1.35 times base while preserving all Messages and making the required intermediate commits. Actual-cost prefix total-processing medians must be at most 1.10 times the corresponding base totals. These are fixture-specific acceptance bounds, not public performance contracts. The correctness bound is at most three queue-related refusals before the next eligible commit; a single catch-up processes exactly the captured prefix, with no reentrant extension.

The observed costs and coverage support Implementation. A large-backlog long task is an explicit tradeoff of the issue's input-freshness requirement, not a measured latency guarantee. No new facts require revising the parent's claim text. No GitHub publication or assignment was authorized in this validation.

The disposable worktree was removed after validation, including its two modified source files and installed dependencies. The contribution worktree is clean. All validation processes have completed; the parent retains its lock and owns publication, state-file management, and the path decision.
