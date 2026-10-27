# First increment verification

Source worktree: `/home/om/TAO/Tools/foldkit-worktrees/issue-1628-cold-vite-cache`.
Base: `b702a5efbb74bebc056b798b414ddb923a82fbd5`.
Committed implementation: `89442de8e75961407d8463d722d51ea2c03e44ce`.

Run commands from the source worktree. All browser invocations used system Chromium, zero retries and bounded native work (`RAYON_NUM_THREADS=2`). Startup diagnostics used exactly three workers. Other browser suites/source edits used one worker. Builds and browser scenarios ran sequentially.

## Red and green evidence

- `implementation-baseline-1.log` and its results preserve the first cold content attempt: two empty pages with actual 504 Outdated Optimize Dep, no received reload and no sent Model request; one recovered page. The loop stopped at this genuine first failure.
- `implementation-node-red.log` records actual assertion failures after existing configs loaded: missing `@effect/platform-browser`; planner selected 0 rather than 33 real example specs. Neither was a missing-helper import failure.
- `implementation-node-final.log` records 16 passing Node tests.
- Fixed API cold starts 1, 2 and 3 each passed 3/3 with no V2 diagnostics. Warm API, cold Counter and cold UI Showcase each passed 3/3, with overlay attachment and real interactions. `implementation-fixed-*.log` and matching result directories preserve every successful page.
- `implementation-negative-1.log` removes only the helper from the loaded real API config. Two pages failed content and the rendered third page failed V2 on a real optimizer reload. One negative attempt was sufficient. No delayed sockets, synthetic failures or increased parallelism were used.
- `implementation-source-edit.log` records the exclusive Counter edit to the sole `h.Tabindex(0),`: observed 1, count 1 and overlay; restored 0 and count 1, exact bytes and clean source diff. Saved original bytes are in its result directory.
- `implementation-ownership-2.log` records occupied-port refusal, interrupted-run teardown and a fresh successful bind/3-page run with released port. The first ownership probe incorrectly assumed IPv4 while Vite bound IPv6; its failed probe and successful completed invocation are preserved separately.
- `implementation-config-comparison-3.log` and JSON snapshots compare five representative real base/fixed serve/build configurations. Aliases, other plugins, ports/filesystem allowances, SSR and environment options agree except the five browser dependency includes. Previous artifact-fixture resolution/normalization attempts are retained.
- `implementation-fixed-api-metadata.json`, `implementation-metadata-counter.json` and `implementation-metadata-ui-showcase.json` show successful third-party paths, including nested clsx/parse5, and no optimized owning Foldkit/DevTools entry. Aliases separately identify linked source.

## Commands

The independent baseline command and fixture are unchanged in README.md. The new artifact-only startup command is:

```sh
DEBUG=vite:deps RAYON_NUM_THREADS=2 \
REPRO_OUTPUT_DIR=<fresh-artifact-output-directory> \
pnpm --filter @foldkit/examples-e2e exec playwright test \
  --config /home/om/TAO/Tools/foldkit/.maintainer/contributions/issue-1628-cold-vite-cache/reproduction/local-diagnostic.config.ts
```

Optional inputs: `EXAMPLE_SLUG=api-cache-query|counter|ui-showcase`, `EXAMPLE_CACHE_MODE=cold|warm`, `EXAMPLE_NEGATIVE=1` (negative control only), `EXAMPLE_VERIFY_SOURCE=1 EXAMPLE_SLUG=counter` (exclusive one-worker source edit). The launcher rejects invalid slugs/modes before startup. Cold mode deletes only the selected stopped server's `.vite` cache. Playwright owns process-group teardown and strict port 5180 without reuse.

`run-readiness.py` retains every focused readiness command and runs them sequentially. `implementation-readiness-summary.log` has statuses and per-command log paths. Counter, API Cache Query and UI Showcase have no `build` script; their actual production command is `pnpm -C examples/<slug> exec vite build`, as in the repository's example builder. The failed literal assignment command is retained as `implementation-readiness-09-invalid-script.log` and `implementation-counter-build-retry.log`.

`run-broad-readiness.py` retains the broader repository commands, one workspace operation at a time and one test worker per package. It binds execution to two CPUs and sets the native two-thread cap. Logs are `implementation-broad-NN.log` and `implementation-broad-summary.log`.

Permanent portable cold-browser harness/source-edit tests and CI integration are follow-up increments F2/F3. These local fixtures are not part of the first source PR.

## Final readiness outcome

All source and browser readiness gates pass on unchanged commit `89442de8e75961407d8463d722d51ea2c03e44ce`. Broader checks passed workspace build, typecheck, package/example tests (7,185 passed, 10 skipped), and 207 script tests. Focused and cold-cache acceptance results above are unchanged.

The first website command with one worker and zero retries failed before browser launch because serial TypeDoc generation exhausted the existing 120-second webServer allowance under local two-CPU affinity. The normal retry used the exact command `pnpm --filter website exec playwright test --workers=1 --retries=0` without CPU affinity, with `RAYON_NUM_THREADS=2`, workspace concurrency 2 and system Chromium. Both TypeDoc projects completed through the normal predev lifecycle, Vite reached readiness within the existing allowance, and all 18 tests passed. Exit 0, elapsed 201.6 seconds. No separate preparation, lifecycle override, live mode, server reuse, source/config edit or timeout/assertion change was used. The separately logged lifecycle probe showed the environment flag did not suppress hooks in the installed command; that flag was not used for website testing.

The full website log is `implementation-website-unrestricted-1.log`; use its concise `implementation-website-unrestricted-summary.log` for the test results because server Model warnings have very long lines. `implementation-website-generated-audit.json` records parseable nonempty Foldkit/UI API-reference outputs, their ignored status, names, sizes and hashes. The website API-reference smoke test also passed. Source is clean and port 4173 was released.

Publication is held at the separate exact-text gate, not at readiness. Prior publication round 2 approved the title, body and Validation. Round 3 updated only Validation to report final broad/website results; title/body were CLEAN, but the reviewer could not verify Validation because its brief omitted the full artifact root and it searched the source worktree instead. The actual artifacts exist at this document's directory. This is the second unsuccessful publication round in the run (one earlier text finding plus this incomplete-evidence review); under the two-failure cap, no further review or publication was attempted. No branch push, PR, Validation comment or allowance use occurred. State stays `analysis: assignment ready` for unfinished implementation round 1. No escalation or abandonment is implied. The parent owns continuation and maintainer bookkeeping.

For a later fresh review, use the exact files `pr-title.txt`, `pr-body.md` and `validation-final.md` under `/home/om/TAO/Tools/foldkit/.maintainer/contributions/issue-1628-cold-vite-cache/reproduction/`. The original clean publication review is `publication-r2-review.json`; the unsuccessful round-3 brief and result are `publication-r3-brief.txt` and `publication-r3-result.json`. Review evidence is in this same reproduction directory, not the contribution source worktree.

## Archived website output

The complete website output is stored losslessly as `implementation-website-unrestricted-1.log.gz` because the uncompressed log exceeds GitHub's 100 MB file limit. Read it with `gzip -cd`. Its uncompressed SHA-256 is `46c44ceb7ceedcee81ec7dd9bdea1b6e42001042e3549c060fac52c10e259c0e`. Historical `.log` references in the status steps refer to this archive. The concise result summary is saved separately.

Raw process `.log` files and generated Playwright `error-context.md` captures are also stored losslessly with a `.gz` suffix. Append `.gz` to their historical paths and use `gzip -cd` to read them. This preserves exact captured whitespace while keeping raw diagnostic output out of textual diffs. Source fixtures, JSON observations and review records retain their original paths.

## Draft delivery

On 27-10-2026, the new driver continuation obtained a fresh CLEAN exact-text review for the unchanged title, body and final Validation using absolute evidence paths. Review task and result are in publication-r4-start.json and publication-r4-result.json. No source tests or code reviews were repeated. Validation failure counts are 0 this run and 2 across runs; title/body failures are 0.

Delivered draft https://github.com/foldkit/foldkit/pull/1807 at 89442de8e75961407d8463d722d51ea2c03e44ce, with first Validation comment https://github.com/foldkit/foldkit/pull/1807#issuecomment-6433454616. Exact title/body/comment readback passed, maintainer edits are enabled, and T3 linking succeeded. The single saved CI snapshot has Examples E2E Plan successful and the main CI job plus ten E2E shards in progress. No watcher or check polling was started. Full snapshot: delivery-pr-readback.json; summary: delivery-summary.json. Parent owns evaluation and pending CI.

Delivery command output is archived losslessly as `delivery-*.log.gz`; append `.gz` to the corresponding command-log path and read it with `gzip -cd`.
