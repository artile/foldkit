# Assignment: issue-1628-cold-vite-cache, first increment

- **Base:** `foldkit/foldkit` `upstream/main` @ `b702a5efbb74bebc056b798b414ddb923a82fbd5`
- **Branch:** `issue-1628-cold-vite-cache`
- **Target branch:** `foldkit/foldkit:main`, pushed through `artile/foldkit`
- **Analysis:** https://github.com/foldkit/foldkit/issues/1628#issuecomment-6432151925. Reporter correction: https://github.com/foldkit/foldkit/issues/1628#issuecomment-6060654246
- **Decision:** The contributor proxy decided autonomously to deliver the complete shared dependency declaration and adoption first, with permanent browser automation and CI in named follow-up increments. This resolves the first implementation escalation recorded in status steps 17–20; it does not start a second retry.

## Goal

Make cold development startup of the repository's source-aliased examples render every parallel browser page. Before Vite's initial client optimization, declare all five demonstrated dependencies hidden behind linked Foldkit source and the virtual DevTools overlay. This first PR contains the shared example-only helper, adoption across all 34 ordinary example configs, meaningful Node resolved-config regression tests, and planner registration with CLI regression coverage.

The pinned base demonstrated two empty pages out of three after `504 Outdated Optimize Dep`, without received `full-reload` or sent `foldkit:request-model`. The nested-include control rendered all three without optimizer reload. The failure occurs before entry execution. Runtime Model restoration and Query behavior require no changes.

The first increment ships the complete five-entry fix. Its browser, source identity, server and production correctness must be verified locally before draft delivery. Permanent browser harness files and workflow integration belong to increments F2 and F3 below. Their absence from the first diff does not waive any local acceptance gate.

## Verification

V1 and V2 share each page's first navigation, using the durable external reproduction and an artifact-only diagnostic fixture. V3 and V4 have small committed integration tests. Positive V3/V4 assertions must fail on base and pass with the declaration/adoption and planner registration; invariant assertions also run on the fixed tree. Configuration spelling checks and missing-module import failures are insufficient regression evidence.

| # | Given | When | Then | Placement in first increment |
|---|---|---|---|---|
| V1 | API Cache Query's disposable Vite cache is absent and a fresh dev server loads its real config | Three independent Chromium tests navigate concurrently with three workers and zero retries | Every page shows the existing post button whose accessible name contains `The Model Is the Cache` within 15 seconds. An empty root cannot satisfy it. Apply the bounded baseline protocol below. | Local external reproduction; permanent form in F2 |
| V2 | The same cold first navigations, including the virtual overlay | Every page reaches content and attached `#foldkit-devtools` | No Outdated Optimize Dep response, failed optimized-module request, uncaught page error or optimizer `full-reload`; no unresolved includes or late discovery of the five entries in server diagnostics. A recovering optimizer reload fails this gate even when content passes. | Local diagnostic fixture under `reproduction/`; permanent form in F2 |
| V3 | The actual API Cache Query, Counter, UI Showcase, SSR and SSG configs | Resolve each sequentially with Vite for `serve` | Each browser environment contains all five entries and retains existing Effect includes and Foldkit exclusion. Default Node SSR gets none of the five entries and its optimizer stays disabled. | Committed `scripts/example-client-dependencies.test.mjs` |
| V3a | An inline config rooted at Counter, containing existing includes/excludes and named environments | Resolve through Vite with the helper, rather than calling its hook directly | Existing includes/excludes merge; `consumer: 'server'` gets no helper entries even when named `client`; an environment with another name and `consumer: 'client'` gets all five. Conventional client and default server behavior match V3. Explicit server optimizer options retain their values. | Same committed Node test file |
| V3b | The real Counter config and the inline config | Resolve for `build` | The helper is inactive and adds none of the five entries to any environment; pre-existing build/server settings retain their values. | Same committed Node test file |
| V4 | Only `examples/vite.dependencies.ts` is an explicit changed path | Invoke the existing E2E planner CLI | Every real example is selected exactly once, with the existing shard bound and no empty shards. Base does not recognize the path. | Committed neighboring planner test |

| # | Invariant | Required first-increment evidence | Permanent allocation |
|---|---|---|---|
| I1 | Warm startup and ordinary interactions work | Three-worker warm diagnostic control; existing API Cache Query, Counter and UI Showcase E2E specs | Existing specs plus F2 warm control and F3 invocation |
| I2 | Foldkit, its DevTools host and linked overlay retain source/singleton identity | Actual resolved aliases and optimizer metadata; attached overlay and working Counter increment. No owning Foldkit/DevTools package or host subpath may be force-included or optimized. Nested third-party entries are allowed. | V3 configuration assertions where concise; existing plugin resolution/overlay tests; F2 browser assertions |
| I3 | Linked library source edits reach the browser without a package rebuild, preserving Model state | Exclusive Counter source-edit and exact byte restoration described below, followed by clean source diff | Local first; F2 exclusive source-edit test |
| I4 | Client declarations do not enable/change Node SSR optimization or production builds | V3/V3a/V3b, existing plugin tests, SSR/SSG production-serving E2E, three representative client builds | Committed Node tests and existing checks; F3 preserves production E2E commands |
| I5 | Existing ports, plugins, aliases, filesystem allowances, SSR settings and consumer options retain their values | Review all 34 wiring diffs; V3 merge/build checks and resolved-config comparison to base for representative configs | First-increment Node tests and focused wiring review |
| I6 | Local checks exercise the implementation and own their resources | Fresh server, strict port 5180, no reuse, occupied-port refusal and failed/interrupted-run teardown followed by a successful fresh bind. Clear only the selected example cache while its server is stopped. Restore edited bytes. | First-increment artifact fixture; portable launcher and tests in F2 |

- **Reproduction:** `/home/om/TAO/Tools/foldkit/.maintainer/contributions/issue-1628-cold-vite-cache/reproduction/README.md`, `cold-cache.spec.ts`, `playwright.config.ts`, `summary.json`, `instrumented-cold-2.log`, and `cold-results/`. Warm, serial, unsuccessful bare-include and successful nested-include controls are preserved beside them.
- **Committed test placement:** `scripts/example-client-dependencies.test.mjs` and `scripts/plan-examples-e2e.test.mjs`, using the existing Node test runner. The existing `scripts/run-script-tests.sh` discovers `scripts/**/*.test.mjs`; no new runner or CI registration is needed for the Node tests.
- **Local-only fixture placement:** New diagnostic Playwright specs/config/server code, temporary programs, captured config/metadata and logs belong under this artifact's `reproduction/`, with invocation commands retained there. Preserve existing evidence; use new filenames/output directories. No permanent browser harness or workflow file is required in the first PR.

Baseline commands, before implementation changes:

```sh
cd /home/om/TAO/Tools/foldkit-worktrees/issue-1628-cold-vite-cache
git status --porcelain=v1
git rev-parse HEAD upstream/main
git switch -c issue-1628-cold-vite-cache upstream/main
```

The parent fetched both remotes and verified fork, installation and setup. The clean detached tree is at the pinned SHA. If upstream has moved, apply the implementation stage's named-file comparison before branching. The named-file comparison includes every ordinary example Vite config, the plugin source used to establish the root cause, the existing E2E harness and planner. Those read-only context files need not appear in this PR. Do not silently rebase the analysis across a relevant change.

Run up to five independent cold attempts, stopping once a content failure with the expected diagnostic evidence is captured. Preserve every attempt, including passing attempts; do not replace earlier evidence. The loop deliberately does not stop at the first passing race sample:

```sh
artifact=/home/om/TAO/Tools/foldkit/.maintainer/contributions/issue-1628-cold-vite-cache
for attempt in 1 2 3 4 5; do
  node --input-type=module -e "import { rm } from 'node:fs/promises'; await rm('examples/api-cache-query/node_modules/.vite', { recursive: true, force: true })"
  DEBUG=vite:deps RAYON_NUM_THREADS=2 \
    REPRO_OUTPUT_DIR="$artifact/reproduction/implementation-baseline-$attempt-results" \
    pnpm --filter @foldkit/examples-e2e exec playwright test \
      --config "$artifact/reproduction/playwright.config.ts" \
      > "$artifact/reproduction/implementation-baseline-$attempt.log" 2>&1
  result=$?
  cat "$artifact/reproduction/implementation-baseline-$attempt.log"
  if [ "$result" -ne 0 ]; then
    break
  fi
done
```

Run this block without shell `errexit`, or handle the test command's exit explicitly. Before each cache removal, the previous test invocation must have ended and released port 5180. No `REPRO_MODE` control override may be set for the baseline. Match the captured failure to the durable evidence: 504 outdated optimized modules, empty root, absent received full-reload and absent sent Model request on affected pages; a healthy page may receive reload and render. Do not count assertion mistakes, setup errors, occupied ports or invented network failures as reproduction.

If all five content attempts pass, inspect their optimizer logs and frames, then run the artifact-only V2 diagnostic gate on base before adding the helper. A real optimizer reload must fail V2 even if the application recovers. If neither gate exposes the issue, make five further independent cold attempts, numbered 6 through 10. Ten passing samples do not invalidate the saved two-page failure or authorize a no-op PR: report the changed timing/environment and the unresolved baseline result to the parent. Never raise worker count, delay sockets, abort requests or synthesize 504s to obtain a red result. Record attempt counts and both the content and optimizer outcomes.

## Specification

1. Add `examples/vite.dependencies.ts`, exporting `exampleClientDependencies(): Plugin` with a type-only Vite `Plugin` import. Plugin name: `foldkit:example-client-dependencies`; `apply: 'serve'`. Its ordinary-order `configEnvironment(name, config)` hook takes `config.consumer` when present; otherwise the conventional `client` name means `client`, and every other name means `server`. For a browser consumer return a partial environment config whose `optimizeDeps.include` contains exactly these five additional entries:

   - `@effect/platform-browser`
   - `effect/http`
   - `effect/persistence`
   - `@foldkit/devtools > clsx`
   - `foldkit > parse5`

   Return `undefined` for server consumers. Return configuration for Vite to merge; do not mutate config, replace consumer settings, change `noDiscovery`, add root-level includes, or crawl dependencies. The published plugin's post-order hook owns the existing forced Effect namespace entries. Preserve the literal nested syntax: bare `clsx` and `parse5` failed under pnpm. Never force-include `foldkit`, any `foldkit/*` owner entry, `foldkit/devtools-host`, `@foldkit/devtools`, or `@foldkit/devtools/vite`. Do not modify `examples/vite.aliases.ts`.

2. Import from `../vite.dependencies` and insert `exampleClientDependencies()` before `foldkit(...)` in every ordinary source-aliased `examples/*/vite.config.ts`. Preserve all other fields and existing plugin order. The complete base set is: `api-cache`, `api-cache-query`, `auth`, `canvas-art`, `charting`, `counter`, `counters`, `crash-view`, `embedding`, `form`, `generative-art`, `interrupting-commands`, `job-application`, `kanban`, `managed-resource-layer`, `map`, `personal-blog`, `pixel-art`, `query-sync`, `route-transitions`, `routing`, `shopping-cart`, `slow-warnings`, `snake`, `ssg`, `ssr`, `state-machine`, `stopwatch`, `todo`, `ui-showcase`, `view-transitions`, `weather`, `web-components`, `websocket-chat`. All 34 have `foldkitAliases` and the required owning dependencies. Count and review every adoption; do not substitute representative adoption for the full set. Playground configs, comparison apps, website and scaffolds are excluded.

3. Add concise Node integration coverage using root Vite's `resolveConfig` and explicit absolute roots/config paths for the five real examples in V3. Resolve sequentially, without starting servers or optimization. Assert the five entries on the actual resolved client environment, not a source substring or isolated hook return. Also protect existing Effect entries, Foldkit exclusion and representative source alias targets. An expected five-entry list in the test defines the contract independently of the helper; do not export helper internals merely for testing.

   Use a small inline config with `configFile: false`, rooted at Counter, for V3a/V3b. Include an existing resolvable client include, an exclude and explicit server optimizer options. Resolve separate cases for a server-consumer environment named `client` and a client-consumer environment with another name; compare preserved options and ensure none of the five leaks to server/build. Use actual resolved environment values, not the absence of a root property. The test imports the helper from its real `.ts` extension under Node type stripping. Any needed package code is reached through built exports resolved from the example, not package TypeScript source. No loader or new dependency.

   Establish deterministic red/green evidence: write and run the real-example V3 assertion before adding the helper or config wiring, so it fails on absent dependency declarations, with existing configs loading successfully. Run V4 before planner registration so it fails on zero selected examples. Then finish all fixtures/implementation and run the complete suite green. New helper imports in fixture tests must not turn a module-not-found error into the claimed baseline. Capture the red commands and assertion output in the artifact. Configuration resolution alone does not prove pnpm optimization succeeds; V2 logs/metadata must supply that separate local evidence.

4. Add only `examples/vite.dependencies.ts` to `ALL_EXAMPLES_FILES` in `scripts/plan-examples-e2e.mjs`. Extend its neighboring tests through the existing CLI helper to check V4, including duplicate-free complete coverage and the existing bounded shard contract. Reuse current helpers and assertions. Do not add specs beneath `packages/examples-e2e/e2e/`, whose filenames define example slugs. No new planner mode or line-count machinery.

5. Read `packages/vite-plugin-foldkit/src/index.ts`, `devToolsOverlay.ts`, `examples/vite.aliases.ts`, existing E2E config/specs, planner and tests for the exclusion/source boundaries and integration points. Keep the published plugin source unchanged. No runtime, Message, Model, Query or application behavior edits are part of the fix.

### First PR boundary and size budget

The commit contains only the helper, 34 ordinary config wiring changes, the Node integration test, planner registration/test, and `.changeset/example-client-dependencies.md`. No `packages/examples-e2e/` file, workflow, browser fixture, package manifest, lockfile, tsconfig or knip change is planned. If an existing checker exposes a necessary small integration correction, document it to the parent and count it within the same cap; do not suppress checks.

| Part | Expected added plus deleted lines after Oxfmt |
|---|---|
| 34 config wiring changes | 223, measured read-only in status step 18 |
| Helper | About 25–35 |
| Resolved-config Node coverage | About 150–175 |
| Planner registration and CLI coverage | About 15–25 |
| Empty changeset | About 3 |
| Expected total | About 416–461; retain roughly 39 lines of headroom below the mandatory 500 cap |

This is a planning budget, not an executed final diff. Check the normal formatted diff/stat before commit, including new files. Use readable table-driven integration cases and existing test helpers. Do not meet the cap by omitting dependencies, any adoption, client/server/build isolation, planner coverage, local verification or formatting, and do not create tooling to enforce this budget. The split removes permanent browser infrastructure from this PR, not correctness checks.

### Required local browser and source verification

For the baseline V2 gate and subsequent fixed/negative checks, create any additional diagnostic fixture only under `reproduction/`, for example `local-diagnostic.config.ts`, `local-startup.spec.ts`, `local-source-edit.spec.ts` and a server script if needed. Retain the existing corrected reproduction unchanged as independent evidence. The fixture loads the real selected example config with no positive-control include overrides. Use API Cache Query by default; allow only `api-cache-query`, `counter`, `ui-showcase`, and `cold|warm` modes; reject invalid inputs before server startup. Honor `PLAYWRIGHT_CHROMIUM_EXECUTABLE`; use system Chromium locally.

Require three independent startup tests with exactly three workers, zero retries, `fullyParallel: true`, a 30-second test timeout and 15-second content assertions. No optimizer-completion wait or browser module warmup may precede their first navigations. HTTP `/` readiness is allowed. Use `reuseExistingServer: false`, strict port 5180, a 120-second startup timeout and a fresh output directory per invocation. Only cold mode deletes the selected example's Vite cache, before starting its server. Use the real installed Vite CLI from the example, `process.execPath` and Playwright's process-group teardown when a launcher is needed; preserve stdio/status, avoid detached descendants, and fail promptly on startup errors.

Register network, failed-request, page-error, WebSocket sent/received and navigation listeners before navigation. Assert real content and the attached overlay: API Cache Query's post button; Counter's `+` click followed by `Counter: 1`; UI Showcase's exact `Button` navigation link and successful `/button` navigation. Assert V2 separately on the same loads. Preserve per-page JSON diagnostics and final body from `finally`, including successes, alongside `DEBUG=vite:deps` server output. Use monotonic per-page elapsed times; do not compare them across pages. Do not assert a SPA hydration stamp or replace visible content with root existence.

Run three consecutive fixed API Cache Query cold invocations, clearing cache and starting/stopping a fresh server each time, for nine successful first loads with no V2 diagnostics. Then run a three-worker warm control, cold Counter, and cold UI Showcase in separate invocations. Inspect actual optimizer metadata and logs for successful nested third-party resolution, no unresolved includes/late discovery, and no optimized owning Foldkit/DevTools entry. Record alias identity separately from dependency metadata. Keep complete logs and results under fresh `implementation-fixed-*` names. A log search with no matches cannot replace positive browser assertions.

As a negative control after the fix, use an artifact-only server fixture that loads the real API Cache Query config, removes only the helper plugin from the loaded plugin list and supplies the remaining configuration to Vite with `configFile: false`. It must preserve root, aliases and every other plugin/option. Confirm the cold V2 gate fails on a real startup optimizer reload/error or V1 content failure, under the same bounded race protocol. Label this control explicitly; never use it for positive acceptance. It requires no tracked config edit. Together with the deterministic V3/V4 baseline, this prevents claiming a suite that has only ever been green. Do not introduce socket delays, fabricated 504s or higher parallelism. Report an unresolved negative control to the parent with the existing baseline evidence rather than concealing it.

For I3, use one worker in an exclusive Counter source-edit invocation, separate from startup's no-reload gate. Read original bytes of `packages/ui/src/button/index.ts`; load Counter, increment to 1, assert the `+` button's tabindex is `0`. Require exactly one `h.Tabindex(0),` occurrence before changing it to `h.Tabindex(1),`. Without rebuilding packages, observe tabindex `1`, title `Counter: 1` and attached overlay. Restore original bytes in `finally`; while the page is available, observe tabindex `0` and count 1. Check exact byte equality and `git diff --exit-code -- packages/ui/src/button/index.ts` afterward. The temporary test program and saved bytes belong in the artifact, and the library edit is restored before any other check/commit. Do not run beside another test/build or a user editing that file.

For I6, use an owned disposable HTTP server on 5180: the diagnostic invocation must refuse the occupied port instead of reusing it. Stop only that owned process. Also fail/interrupt an owned diagnostic invocation, verify its descendant teardown, and confirm a subsequent fresh invocation binds successfully. No cache deletion while the example's server is running. These are local acceptance checks for this increment; a portable committed launcher and its coverage are F2.

Run all scenarios sequentially. Cold API Cache Query baseline/negative/fixed cases and representative startup cases use exactly three browser workers; other checks use one. Preserve commands, attempt counts, content results and optimizer results separately in the artifact/Validation evidence.

### Existing checks and readiness

Run these sequentially after implementation:

```sh
node --test scripts/example-client-dependencies.test.mjs scripts/plan-examples-e2e.test.mjs
pnpm --filter @foldkit/examples-e2e typecheck
RAYON_NUM_THREADS=2 pnpm --filter @foldkit/vite-plugin exec vitest run test/resolution.test.ts test/devToolsOverlay.test.ts --maxWorkers=1
```

Run existing interaction and production-serving checks, one example at a time. SSR and SSG use their existing build/preview commands:

```sh
for example in api-cache-query counter ui-showcase ssr ssg; do
  EXAMPLE_SLUG="$example" PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium \
    RAYON_NUM_THREADS=2 pnpm --filter @foldkit/examples-e2e test:e2e --workers=1 --retries=0 || exit $?
done
RAYON_NUM_THREADS=2 pnpm -C examples/counter build
RAYON_NUM_THREADS=2 pnpm -C examples/api-cache-query build
RAYON_NUM_THREADS=2 pnpm -C examples/ui-showcase build
pnpm --filter counter-example --filter api-cache-query-example --filter ui-showcase --filter ssr-example --filter ssg-example typecheck
pnpm exec oxfmt --check examples/vite.dependencies.ts 'examples/*/vite.config.ts' scripts/example-client-dependencies.test.mjs scripts/plan-examples-e2e.mjs scripts/plan-examples-e2e.test.mjs .changeset/example-client-dependencies.md
pnpm lint:ci
pnpm check:dead-code
pnpm typecheck:scripts
pnpm check:effect-prebundle
pnpm check:ui-subpath-exports
```

Cap native work at `RAYON_NUM_THREADS=2` and recursive builds at `--workspace-concurrency=2`. Do not run checks concurrently. Use `/home/om` for large output, not RAM-backed `/tmp`. Run broader repository/stage-required readiness checks once after focused checks, with the same limits. No check is waived by the scope split. Resolve missing built imports through documented setup rather than declaring pre-existing failures. The implementation stage/commit skill/pre-push requirements apply.

## Compatibility

No public API or publishable artifact changes, version bump, deprecation or migration. The private example helper changes development browser optimization only: these five third-party dependencies join the initial graph. Existing consumer options merge normally, Foldkit and DevTools retain source identity, and server/production behavior follows the existing plugin. The first increment adds no public testing inputs or package dependency.

## Boundaries and follow-up increments

| Increment | Durable scope and acceptance | Relationship to first PR |
|---|---|---|
| F1: shared dependency declaration | Helper, all 34 adoptions, V3/V3a/V3b and V4 committed tests/registration, empty changeset. All V1–V4 and I1–I6 local acceptance evidence above. | This assignment and draft PR |
| F2: permanent cold browser regression | `packages/examples-e2e/playwright.cold-cache.config.ts`, `cold-cache/start-server.ts`, `startup.spec.ts`, `source-edit.spec.ts`, necessary package tsconfig/knip integration. Preserve the local fixture's three-worker/zero-retry V1/V2, warm control, representative slugs, diagnostics, strict resource ownership, slug/mode validation, and exclusive Counter source-edit/restoration. Keep specs outside `e2e/`. Portable commands use `EXAMPLE_SLUG`, `EXAMPLE_CACHE_MODE=cold|warm` and `EXAMPLE_VERIFY_SOURCE=1` with Counter/one worker. | Follow-up PR after F1; convert proven artifact checks to repository tests. Revalidate on its base and keep under 500 lines, splitting into coherent harness/startup and source-edit increments if necessary. |
| F3: CI cold-start execution | Within the existing sequential examples E2E loop, when API Cache Query is selected, run three independent cold invocations and one warm invocation after F2. Run even when its normal spec fails; aggregate failure status without shell errexit bypass. Keep three workers, zero retries, `RAYON_NUM_THREADS=2`, existing artifact upload, and SSR/SSG build/preview commands. No parallel job. | Follow-up PR dependent on F2; exclusive source edits need not run in CI. CI support is explicitly deferred, not claimed by F1. |

Every prior permanent requirement is allocated: original browser config/launcher/startup/source-edit and tsconfig/conditional knip work goes to F2; workflow sequencing, failure aggregation and artifact capture goes to F3. Their behavior is exercised locally in F1 wherever it protects the shipped fix (V1/V2, I1–I6); portable harness and CI implementation are future deliverables. Original helper/adoption/Node/planner requirements all stay in F1.

No general dependency crawler, published plugin dependency policy, new dependency/lockfile change or Vite upgrade. No browser warmup as fix, retry increase, weaker parallelism, runtime/Query/Model change, Cloudflare/scaffold change, historical docs edit, or production E2E replacement. Further hidden dependencies require concrete evidence and a parent decision before expanding the five-entry design.

The published claim describes the full resolution. The first PR must say it delivers the dependency declaration and config/planner regression coverage, and identify permanent cold browser automation/CI as follow-up work. Do not claim the issue's entire coverage rollout is complete or auto-close it with this first increment. No redundant issue comment is needed; no new or edited GitHub text is authorized to analysis. Future PR/Validation text must pass its own fresh publication review.

## Completion

Generate an empty changeset with `pnpm changeset add --empty`, named `.changeset/example-client-dependencies.md`. Examples/scripts need no published release entry; the empty changeset satisfies stage bookkeeping without bumping Foldkit, DevTools or the Vite plugin. The scope split does not change this decision.

Implementation follows the repository commit skill, Taras Kornichuk `<dread9ko@gmail.com>` authorship and Conventional Commits. Describe the first-load failure and complete dependency declaration in the commit body. Review the full formatted range against `upstream/main` with a fresh-context reviewer and obtain a clean pre-push result. Future pushes, PR description and Validation comment each require their existing autonomy/pause/allowance/publication gates. No AI attribution in commit, changeset or PR metadata.

Deliver only a draft PR to `foldkit/foldkit:main` through `artile/foldkit`, after all first-increment local gates. Read its title/body back, register its link, and provide the parent with URL, head SHA, final diff size, tested commands, red/green Node assertions, cold baseline/fixed/negative counts, optimizer/source/server/production evidence and pending checks. Verification details go in the first Validation comment; the PR description states consumer impact, F1 scope and F2/F3 follow-ups. Finish at `implementation: delivered round 1`. Driver owns evaluation; do not promote or start evaluation. Parent owns maintainer bookkeeping and lock release.

## Risks

Critical findings include reused servers/caches, content-only success with optimizer invalidation, discarded failed baseline samples, fabricated red results, bare pnpm includes, optimized singleton owners, lost source edits or Model state, changed server/build behavior, missing adoption, a shared helper omitted by the planner, leaked child processes or unrestored source, and claiming permanent browser/CI coverage that F1 does not contain.

The explicit list needs maintenance. Existing successful control evidence covers API Cache Query on Vite 8.3.1; it does not establish full helper adoption. First-increment Node integration and local representative/browser/source checks must establish that acceptance before draft delivery. Keep timing samples distinct from deterministic resolved-config regressions and distinguish optimizer diagnostics from proof of an empty page.
