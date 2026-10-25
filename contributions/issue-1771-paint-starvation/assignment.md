# Assignment | issue-1771-paint-starvation

- **Base:** `foldkit/foldkit` `upstream/main` @ `b702a5efbb74bebc056b798b414ddb923a82fbd5`
- **Branch:** `issue-1771-paint-starvation`, created from the pinned upstream commit. The supplied worktree is detached and clean.
- **Target branch:** `main`
- **Analysis:** https://github.com/foldkit/foldkit/issues/1771#issuecomment-6395405913

## Goal

Bound queue-related render refusals so the DOM advances during sustained Message production. Before forcing a commit, process the finite FIFO prefix captured from the pending queue so controlled-input Messages already queued at that opportunity are incorporated. Apply one allowance of three refusals across animation-frame and asynchronous ViewTransition update callbacks. The fourth blocked eligible opportunity catches up and commits plainly.

The contributor proxy affirmed Implementation and accepted the finite-prefix long-task tradeoff. This is an internal runtime correction with a `foldkit` patch release. The opportunity bound supplies no CPU-time, wall-clock, or browser-paint guarantee.

## Verification

Start with the executable reproduction and translate the readiness coverage into focused Vitest regressions. Pin each row with a test or separately named parameterized case. Demonstrate each regression fails on the base or with its corresponding behavior broken, then passes with the implementation. Where a row describes an existing lifecycle or ordering invariant, its test must also detect a deliberate violation of that invariant. Do not report all readiness cases as independently observed failures on the base: Phase 1 observed both producer failures and the fourth-blocked-frame failure; the base has no prefix operation.

| # | Given | When | Then |
|---|---|---|---|
| V1 | A 24-pulse reentrant producer; each update advances the controlled processing clock by 6 ms, exceeding the 5 ms budget | Alternate a held animation frame and one deferred delivery | The DOM advances while production is active and ends at 24; under this exact schedule the validated candidate commits 5, 10, 15, and 20 before 24. Base shows DOM 0 for Model 1 through 23. |
| V2 | The same costly workload with the driver producing the next click outside update | Alternate frame and delivery while producing externally | The DOM advances during production and ends at 24, with all Messages processed once in arrival order. This case does not require application side effects in update. |
| V3 | A reentrant deferred producer and a browser input whose latest value has a queued `UpdatedValue` Message | Deliver four blocked frames without delivering the pending drain | The first three refuse; the fourth includes the queued input value in both Model and DOM. Catch-up processes only the entry prefix; the producer suffix and its one posted task survive. |
| V4 | Boot processed A and deferred B, C; processing B and C enqueues D and E | Invoke `drainQueuedPrefix`, then deliver the scheduled tasks | The prefix processes B, C exactly once in FIFO order; D, E wait in the suffix and subsequently process in order. The prefix cannot grow reentrantly. |
| V5 | A posted drain owns B; catching up B leaves no pending Messages | Enqueue C before delivering that posted task | C waits for the existing task. Catch-up neither clears deferred ownership nor posts a duplicate task. |
| V6 | Pending Messages before boot, during processing or rendering, after disposal, or after crash | Attempt a prefix drain, including a nested attempt inside processing | Ineligible calls process nothing and do not reenter. After an eligible drain, processing state and elapsed-time accounting are restored. |
| V7 | A prefix B, C, D whose processing of C throws | Catch up, then deliver any held drain | The existing crash path identifies C as the failing Message, processing stops, and D never updates a crashed runtime. Cleanup and processing-time accounting run on the exceptional exit. |
| V8 | A sustained producer has just received a successful forced live patch | Deliver further queue-blocked opportunities | Exactly three further refusals are allowed before another forced commit. A successful commit resets the counter before patch-time Messages process. |
| V9 | ViewTransition callbacks repeatedly find new deferred work, even though the queue clears before each next transition starts | Deliver four such callbacks across successive transitions | The first three invalidate/skip and retry without settling the pending commit. The fourth invalidates/skips, catches up, and runs the ordinary render body inside that callback. Transition start and clear frame entry never replenish the allowance. |
| V10 | One refused asynchronous transition callback, followed by two queue-refused frames | Deliver the next blocked frame | It is the fourth refusal opportunity and commits plainly. Both paths consume the same counter; the forced frame starts no new transition. |
| V11 | An earlier transition callback is held while a producer causes four blocked frames | Force the plain frame, then invoke the old callback, including duplicate invocations | The forced frame skips/invalidates the old transition and patches once without creating another transition. Old or duplicate callbacks change neither DOM nor commit notification. |
| V12 | A Command waits through `Render.afterCommit` while the queue blocks the live render | Deliver three refusals, then the forced commit | The waiter stays pending through refusals and completes once after the successful patch, Mount attribution, and existing post-patch drain ordering. |
| V13 | A transition callback and frames are held when runtime disposal occurs | Deliver those callbacks after disposal | No live patch or prefix processing touches the released container. Existing terminal commit-waiter behavior is preserved. |
| V14 | A deferred prefix contains a Message whose update throws during forced catch-up | Deliver the fourth blocked opportunity | The crash view appears and no live render overwrites it. The renderer rechecks disposal/crash after catch-up before reading and patching the live Model. |

The existing 12 readiness checks cover V3 through V14, with some checks combining related assertions. Their source and results are evidence and executable behavioral fixtures, not production implementation. Add coverage for DevTools pause/replay eligibility and restore intent where the readiness fixture has only queue-level lifecycle checks.

| # | Invariant | Observed by |
|---|---|---|
| I1 | The bound is at most three queue-related refusals since the last successful live patch. Only otherwise eligible live commit opportunities count. An undelivered host callback supplies no opportunity. | V3, V8, V9, V10; controlled frame/callback traces |
| I2 | Every forced catch-up processes exactly the pending prefix captured once at entry. No suffix extension, loss, duplication, FIFO inversion, or task theft occurs. | V4, V5, V7; queue tests and original producer final counts |
| I3 | Ordinary drains retain the cumulative 5 ms budget, idle-gap reset, deferred MessageChannel ownership, arrival order, and boot barrier. Cheap Messages remain synchronous; coalescing and unchanged-Model detection are preserved. | Existing `messageProcessing.test.ts`, zero-cost reproduction control, queue tests |
| I4 | Disposal, crash, DevTools pause/replay, and live-restore guards precede refusal accounting. A retry preserves live-restore intent; paused/replay views cannot be replaced by an ineligible live callback. | V6, V13, V14; existing `viewTransition.test.ts` time-travel tests and added guarded-retry assertions |
| I5 | A clear queue at frame entry, transition start, retry scheduling, or replay does not reset the refusal counter. A successful live patch resets it before processing patch-time Messages. Failed patches do not reset it as successful commits. | V8, V9, V10 and focused counter-lifetime tests |
| I6 | Forced commits use the latest Model and dirty-Message attribution after catch-up. The previously rendered Model advances only after a successful patch. Mount, DevTools, drain-budget reset, and post-patch Message handling retain their ordering. | V3, V8, V12, V14; runtime render/slow-phase/Mount tests |
| I7 | A stale/duplicate transition callback is inert. Existing transition predicate, reduced-motion and unconfigured behavior, promise rejection suppression, skip safety, and start-failure plain fallback are preserved. | V9, V11, V13; existing transition tests |
| I8 | Commit waiters stay pending through queue-related refusals and settle through the existing success, crash, and teardown paths without duplicate live commits. | V12, V13, V14; `renderCommit.test.ts` and `viewTransition.test.ts` |
| I9 | Each normal-path pooled benchmark median is at most 1.10 times its base median under the documented fixture and process order. | `scheduling-benchmark.mjs`: cheap enqueues, coalesced clicks, individual commits |
| I10 | The sustained-workload pooled median is at most 1.35 times base, preserving every Message and intermediate commits. The exact validated fixture produces 1,001 candidate commits for 5,000 Messages, versus one on base. | `scheduling-benchmark.mjs`, producer/readiness traces |
| I11 | Each actual-cost prefix total-processing median is at most 1.10 times its corresponding base total. Prefix work is finite by Message count and may occupy a long task. | `prefix-cost-benchmark.mjs`, sizes 1, 16, 64 with actual 6 ms CPU updates |
| I12 | Existing controlled input semantics, Command execution, Subscriptions, crash reporting, hydration, and Mount lifecycle remain intact. | Focused affected tests and the runtime suite; repository pre-push checks before publication |

- **Reproduction:** [reproduction/producer-progress.mjs](reproduction/producer-progress.mjs), with [reproduction/README.md](reproduction/README.md) as the complete readiness specification and measurement record.
- **Command:** `node /home/om/TAO/Tools/foldkit/.maintainer/contributions/issue-1771-paint-starvation/reproduction/producer-progress.mjs /home/om/TAO/Tools/foldkit-worktrees/issue-1771-paint-starvation`. Build the selected worktree's `foldkit` package first. The script imports built modules directly; run Node without a TypeScript loader.
- **Test placement:** `packages/foldkit/src/runtime/messageProcessing.test.ts`, `viewTransition.test.ts`, and `renderCommit.test.ts`; add `messageQueue.test.ts` alongside them for direct queue contracts if needed. Preserve `packages/foldkit/src/html/onInput.test.ts`. Use Vitest and the repository's happy-dom fixtures, Schema-backed Models and Messages, named constants, `modifyFields`, and explicit host scheduling. Test through DOM/runtime behavior where possible; use queue-unit fixtures for prefix ownership. Synthetic reentrant dispatch belongs only in fixture instrumentation.

## Specification

Affected production files: `packages/foldkit/src/runtime/messageQueue.ts` and `packages/foldkit/src/runtime/renderer.ts`. Keep their existing imperative host-timing boundary. No new Effect layer or generalized scheduler is required.

1. Extend the internal `MessageQueue` contract and factory return with `drainQueuedPrefix`. Gate it on boot completion, processing, rendering, disposal, and crash, but allow it to consume work already deferred to a posted task. Capture and detach all pending Messages exactly once at entry. Process that prefix in FIFO order without the normal 5 ms cutoff. Enqueues during this operation form the separate suffix. Preserve the deferred flag and posted task even if the prefix leaves the queue empty. Attribute exceptions to the current Message through `crashWith`; restore processing state and account elapsed time on every exit. Preserve ordinary drain behavior and channel finalization.
2. In `renderer.ts`, introduce one internal refusal counter and a named limit of three. Use it for queue-related refusals in both `renderFramePlain` and the asynchronous update callback in `startFrameViewTransition`. Check lifecycle and DevTools eligibility before consulting the queue and counter. Guarded non-opportunities must not spend the allowance. Do not reset on a clear queue at frame entry, starting a transition, or scheduling a retry. Reset only after a successful live DOM patch, before post-patch Messages process.
3. For an otherwise eligible frame with queued deferred work and fewer than three refusals, increment once, retain the pending commit and live-restore intent, and request another frame. On the next blocked opportunity after three refusals, invalidate/skip an older pending transition, drain the captured prefix, and recheck disposal/crash. Read the latest live Model and dirty-Message attribution and execute the ordinary render body plainly. Bypass creation of a new transition on this forced frame, even when transition configuration would otherwise select one. The remaining suffix belongs to its existing posted drain.
4. A delayed transition callback first checks its own invalidated/didRun guard, then lifecycle/pause eligibility, before it participates in queue refusal accounting. If blocked with allowance left, mark that callback invalid, skip its transition, increment once, retain the commit waiter, and schedule another frame. These refusals share the frame allowance. If blocked after three refusals, invalidate/skip its transition, catch up the prefix, recheck disposal/crash, and execute the ordinary render body in this callback. It must not defer this forced commit to another transition. Duplicate or invalidated callbacks cannot drain, patch, spend allowance, or complete another commit. Preserve rejection suppression and the existing transition start-failure fallback.
5. Preserve the existing successful render-body sequencing: frame budget handling, post-catch-up Model/dirty attribution, live patch, rendered-Model update, live view restoration, rendered Mount attachment, buffered patch-time Message processing, and final commit notification. Restore rendering state on failure. A catch-up defect uses the existing crash UI and prevents a subsequent live patch.
6. Update only the scheduling explanation under Dispatch and Rendering in `packages/website/src/page/performance.md`. Describe three queue-related refusals shared by frames and transition callbacks, followed by a plain catch-up commit incorporating the already-queued prefix. Explain that reentrant suffix Messages wait for their task and that a large prefix can form a long task. State the opportunity bound and avoid a numerical wall-clock or browser-paint promise. Do not alter unrelated benchmark tables or historical announcements. No new executable documentation snippet is needed for this prose correction.

Readiness validation at the pinned commit passed both producer cases and all 12 readiness checks, the 53 affected baseline tests, all runtime tests (251 passed, 1 skipped), package build/typecheck, and formatting of the two production files. Counts overlap. These results describe the removed disposable prototype, not implementation delivery. No prototype source is supplied or may be copied into this handoff.

Re-run the external fixtures against the implementation's built package: `node <artifact-directory>/reproduction/readiness-checks.mjs <worktree>`, `node <artifact-directory>/reproduction/scheduling-benchmark.mjs <worktree>`, and `node <artifact-directory>/reproduction/prefix-cost-benchmark.mjs <worktree>`. The readiness script expects the internal prefix method; `--runtime-only` is the base-compatible mode that fails at the fourth blocked frame. The defect case intentionally writes a crash diagnostic to stderr.

Performance acceptance uses the same host, fixtures, warmups, and process order as the README. Run scheduling benchmarks sequentially in fresh processes in base/candidate/candidate/base order without overlapping test/build load. Each process warms the queue workload four times and records 15 samples; runtime workloads warm three times and record nine samples. Pool both processes per side and use the median. Real elapsed time uses `process.hrtime.bigint`; the sustained workload only simulates processing-clock cost.

| Fixture | Base pooled median | Readiness candidate pooled median | Candidate change | Acceptance ratio |
|---|---:|---:|---:|---:|
| 500,000 cheap enqueues | 49.490 ms | 49.591 ms | +0.2% | At most 1.10 |
| 20,000 coalesced DOM clicks | 83.314 ms | 83.643 ms | +0.4% | At most 1.10 |
| 1,500 individual DOM commits | 13.037 ms | 13.542 ms | +3.9% | At most 1.10 |
| 5,000 sustained Messages, simulated 6 ms cost | 22.051 ms | 26.672 ms | +21.0% | At most 1.35 |

The coalesced case commits once on both versions; the individual case commits 1,500 times on both. Sustained commits increase from 1 to 1,001 for identical Message totals. The extra work is actual happy-dom patching; the simulated clock does not spend 6 ms of CPU per Message. This fixture does not predict a browser's rendering cost or establish performance parity.

The actual-cost prefix benchmark spends 6 ms of CPU per update and measures three samples for each size. Base services the prefix through ordinary deferred deliveries; candidate catches it up in one operation. Compare total-processing medians, not a demand for equal maximum task length.

| Pending Messages | Base total / longest drain median | Readiness candidate total / longest drain median | Total acceptance ratio |
|---|---:|---:|---:|
| 1 | 6.031 / 6.025 ms | 6.011 / 6.011 ms | At most 1.10 |
| 16 | 96.133 / 6.014 ms | 96.218 / 96.215 ms | At most 1.10 |
| 64 | 384.528 / 6.016 ms | 384.062 / 384.051 ms | At most 1.10 |

These are fixture-specific acceptance bounds, not public performance contracts. The exact raw samples, failure traces, and passing readiness cases are in `reproduction/`. An implementation must meet the correctness and performance bounds; measurements outside them require returning findings rather than silently relaxing the assignment.

## Compatibility

No public exports, configuration fields, runtime options, dependencies, or consumer migration are added. The internal queue operation is not re-exported through a public barrel. Observable behavior changes under sustained deferred production: instead of waiting indefinitely for an empty deferred queue, the runtime commits after at most three queue-related refusals at eligible opportunities, following finite-prefix catch-up. The fourth blocked opportunity may skip a selected or pending ViewTransition and patch plainly, including inside the delayed transition callback.

Ordinary coalescing and input freshness are preserved. This is an opportunity bound under a delivering host, not necessarily four rAF callbacks when transition callbacks intervene. A finite prefix is not a CPU-time cap. Version impact: a `foldkit` patch changeset, with no breaking-change marker or deprecation.

## Boundaries

- Scope is the two runtime production modules, focused queue/render/transition tests, the performance guide's scheduling explanation, and one descriptive patch changeset.
- No new scheduling option, public API, latency guarantee, dependency, time-based policy, or general scheduler redesign.
- No partial-prefix patching, stale-input rendering, or CPU cutoff within the captured prefix. A policy that spreads catch-up over tasks needs a separate snapshot/commit design and is outside this assignment.
- No unrelated runtime refactoring, broader documentation cleanup, application-pattern changes, Cloudflare guide changes, benchmark leaderboard updates, or historical release edits.
- The implementation must be written from this specification. The removed prototype is validation evidence only.

## Completion

- Add `.changeset/bounded-queue-render-refusals.md` with `foldkit: patch` release metadata. Explain the sustained-backlog failure, shared refusal allowance, finite-prefix input freshness, and possible plain commit when a transition is skipped. Describe the long-task limitation without claiming a paint deadline. Follow repository changeset prose and attribution rules.
- Do not manually bump package versions, update lockfile versions, generate changelogs, or run a release. Changesets handles the fixed group containing `foldkit`, `@foldkit/ui`, and `@foldkit/devtools`; only `foldkit` needs the explicit patch entry for this change. The website is ignored for release bookkeeping. A real bug fix requires a patch entry rather than an empty changeset; `major` is blocked.
- Run the producer and readiness fixtures, the fixture-specific benchmark comparisons, `pnpm --filter foldkit build`, package typecheck, source/Markdown formatting, and the affected Vitest files. From `packages/foldkit`, the baseline command is `pnpm exec vitest run src/runtime/messageProcessing.test.ts src/runtime/renderCommit.test.ts src/runtime/viewTransition.test.ts src/html/onInput.test.ts`; include any new queue test file. Run `pnpm exec vitest run src/runtime` for cross-runtime integration. Follow repository setup reconciliation if built-module resolution fails.
- Before pushing in implementation, complete the repository's required `pnpm pre-push` suite and separate committed-diff review, plus the maintainer publish/push gates. This assignment does not claim full-workspace or browser validation has occurred. Repository `AGENTS.md` governs PR metadata: commit-body prose belongs in the description; verification and review-only material belong in the first PR comment, resolving the broader CONTRIBUTING wording. Follow the implementation stage for its draft PR and Validation comment; analysis creates neither.

## Risks

Evaluation must treat unbounded refusal retries, separate counters for frame and transition paths, resets at transition start or clear frame entry, or a fourth callback that starts another transition instead of committing as critical liveness findings.

Also critical are stale controlled-input restoration, inclusion of a reentrant suffix in the captured prefix, loss/duplication/reordering of Messages, stealing a posted drain, processing during boot/render/disposal/crash, live rendering over a paused/replay or crash view, stale callback mutation, and premature or stranded commit waiters. Preserve live-restore intent and Mount/DevTools attribution through retries.

The accepted cost is a potentially long catch-up task. The measured 16- and 64-Message prefixes occupy about 96 and 384 ms continuously; a larger or more expensive prefix can cost more. Neither the three-refusal policy nor the benchmark ratios imply a browser paint deadline. Treat any public guarantee of short frames or performance parity as an unsupported claim. Normal-path or sustained regression beyond the fixture bounds requires escalation with evidence.
