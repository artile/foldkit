# Cold Vite dependency-cache reproduction

Base: `foldkit/foldkit` upstream/main `b702a5efbb74bebc056b798b414ddb923a82fbd5`.
Date: 2026-10-27 UTC. Node 22.22.3, pnpm 11.8.0, Vite 8.3.1, Playwright 1.63.0, system Chromium at `/usr/bin/chromium`, Linux ARM64.

The contribution worktree is `/home/om/TAO/Tools/foldkit-worktrees/issue-1628-cold-vite-cache`. No tracked source was changed. The reproduction uses its original Vite config, aliases, plugin distribution built by setup, and API Cache Query application. All diagnostic source, output and research snapshots live here. A server readiness HTTP request is the same readiness mechanism the repository Playwright config uses; it is not an application warmup.

## Assertion and commands

`cold-cache.spec.ts` declares three independent parallel tests. Each navigates to `/` and asserts that the existing post button named `The Model Is the Cache` becomes visible within 15 seconds, matching the existing example's E2E expectation. Page events record HTTP errors, HMR frames, navigation and final body. No network mocks, socket delays, dependency failures, Model changes, or source instrumentation are injected.

Run from the contribution worktree. Before a cold scenario, delete only that example's disposable Vite cache:

```sh
python - <<'RESET'
from pathlib import Path
import shutil
cache = Path('examples/api-cache-query/node_modules/.vite')
if cache.exists():
    shutil.rmtree(cache)
RESET
```

Then run the minimal reproduction:

```sh
DEBUG=vite:deps RAYON_NUM_THREADS=2 \
REPRO_OUTPUT_DIR=/home/om/TAO/Tools/foldkit/.maintainer/contributions/issue-1628-cold-vite-cache/reproduction/rerun-cold-results \
pnpm --filter @foldkit/examples-e2e exec playwright test \
  --config /home/om/TAO/Tools/foldkit/.maintainer/contributions/issue-1628-cold-vite-cache/reproduction/playwright.config.ts
```

The config defaults to exactly 3 Playwright workers, as authorized for this timing reproduction. `RAYON_NUM_THREADS=2` bounds Vite/Tailwind's native work. No build runs alongside these tests. To test serial loading, add `--workers=1`. To test a warm cache, rerun without deleting the cache. Use a new `REPRO_OUTPUT_DIR` for each run to preserve existing evidence.

The stock upstream command was also tested, with an empty cache and no retries:

```sh
EXAMPLE_SLUG=api-cache-query PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium \
RAYON_NUM_THREADS=2 pnpm --filter @foldkit/examples-e2e test:e2e --retries=0 --workers=3
```

That one timing sample passed 3/3 (`official-cold.log`). It does not establish a fix. The instrumented minimal test failed 2/3 on the same pinned tree.

## Observed results

| Scenario | Output | Result |
| --- | --- | --- |
| Original E2E, cold, 3 workers, retries 0 | `official-cold.log` | 3 passed in 6.5 s |
| Corrected minimal assertion, cold, 3 workers, retries 0 | `instrumented-cold-2.log`, `cold-results/` | 2 failed, 1 passed in 18.1 s; failed pages have empty `#root`, 504s, and no sent `foldkit:request-model` |
| Same assertion, warm, 3 workers | `instrumented-warm.log`, `warm-results/` | 3 passed in 3.7 s; no 504 or optimizer reload |
| Same assertion, cold, 1 worker, 3 sequential tests | `instrumented-single.log`, `single-results/` | 3 passed in 6.5 s; first page received optimizer reload |
| Cold, 3 workers, plain includes | `instrumented-include.log`, `include-results/` | 1 failed, 2 passed; `clsx` and `parse5` failed initial resolution, then were discovered late |
| Cold, 3 workers, nested includes | `instrumented-nested-include.log`, `nested-include-results/` | 3 passed in 3.7 s; no dependency resolution warnings, optimizer reload, or HTTP errors |
| Cold, 1 worker, remove client `foldkit` exclusion | `instrumented-scan.log`, `scan-results/` | 3 passed in 6.5 s; initial scan found platform-browser, effect/http, and parse5, but late clsx and effect/persistence still caused a reload |

`summary.json` extracts the per-page network and socket evidence. `diagnostic-initial-results/` and `instrumented-cold-1.log` preserve an early diagnostic run with two erroneous assertions: an exact accessible name that excluded the excerpt, and a hydration stamp not present in this SPA. It captured one actual empty page, but its reported test failure count is not used as the corrected reproduction result.

The corrected cold run's healthy page received `full-reload` about 177 ms after its test started, navigated again, sent a Model request, received an empty restore response and rendered fetched posts. The failed pages connected their HMR sockets at about 480 and 508 ms, had 504 Outdated Optimize Dep responses, and received no full-reload. Neither sent a Model request. The plugin's broadcast empty restore response from the healthy page reached them, but their entry had not executed and they could not boot. Individual event timestamps are relative to each test start, not a shared wall clock; frame presence/absence and HTTP statuses are the direct evidence.

## Configuration controls

`control-server.mjs` loads the original example config through Vite and applies diagnostic runtime overrides. Nothing is written to application source. The default reproduction does not use this server.

Set `REPRO_MODE=include`, clear the cache and run the same test for the successful control. It preserves source aliases and the plugin's `foldkit` exclusion, and adds these client dependencies:

```text
@effect/platform-browser
@foldkit/devtools > clsx
effect/http
effect/persistence
foldkit > parse5
```

`REPRO_MODE=include-plain` reproduces the unsuccessful control using bare `clsx` and `parse5` instead. Those are owned by the linked DevTools and Foldkit packages, so they cannot resolve as direct example dependencies under pnpm. Vite's documented nested dependency include syntax resolves them without prebundling the owning source packages.

Set `REPRO_MODE=scan` and `--workers=1` for the scanner control. It removes only `foldkit` from the client optimizer exclusion in a post hook. This tests why part of the scan misses dependencies; it is not a proposed fix. Overlay imports are created by the plugin's virtual module and remain invisible to the static scan.

The successful include control validates the configuration direction for API Cache Query. It is not a completed patch or evidence that every example has been tested. During implementation, verify the shared helper's adoption, additional example dependency graphs, source edits/HMR, and the client/server boundary.

## References and overlap

- Issue and corrected comment: `issue.json`, `comments.json`; https://github.com/foldkit/foldkit/issues/1628 and https://github.com/foldkit/foldkit/issues/1628#issuecomment-6060654246.
- 98 fresh open PR records are in `open-prs.json`. No PR implements this example dependency include correction. #1630 references the issue in a comment describing its cold-cache flake and adds the same example configuration pattern.
- #1655 broad Block preview, head `f3be22cfeefed437164ad614d08b16d9000e0703`: `pr-1655.json`, `pr-1655-overlap.jsonl`, `pr-1655-plugin.ts`. Adds `effect/Tuple` to the existing forced Effect namespaces and a source-check; keeps Foldkit exclusion and does not add these missing nested deps or a cold-cache startup fix.
- #1799: `pr-1799.json`, `pr-1799-overlap.jsonl`; changes routing E2E to production preview for lazy-chunk verification. Other dev-server examples are unaffected.
- #1752: `pr-1752-overlap.jsonl`; build-id revalidation after server restart, not optimizer startup.
- #1796: `pr-1796-overlap.jsonl`; Vitest Model restoration handshake, not browser module loading.
- #1581: `pr-1581-overlap.jsonl`; fresh production bundle/DevTools host separation, not shared example dependency declarations.
- #1468: `pr-1468-overlap.jsonl`; build-time Schema compilation, not dev-cache discovery.
- Merged #1246 declared registry overlay imports and explicitly avoided prebundling linked source packages. #1593 corrected source ownership for devtools-host. #1566 and #1591 account for the Effect include list already on this base. Those existing fixes do not eliminate this reproduction.
- Vite documents explicit includes for imports hidden by plugin transforms: https://vite.dev/guide/dep-pre-bundling.html#customizing-the-behavior. Nested dependency syntax and exclusion rules: https://vite.dev/config/dep-optimization-options.html#optimizedeps-exclude.

Relevant pinned source: `packages/examples-e2e/playwright.config.ts` (parallelism, retries and dev-server startup); `packages/examples-e2e/e2e/api-cache-query.spec.ts` (expected content); `examples/vite.aliases.ts` (source aliases); `packages/vite-plugin-foldkit/src/index.ts` (forced Effect entries and Foldkit exclusion); `packages/vite-plugin-foldkit/src/devToolsOverlay.ts` (virtual overlay injection and registry-only includes). Vite 8.3.1's installed `dist/node/chunks/node.js` invalidates its module graph and broadcasts a full reload when optimized dependency hashes change. Its WebSocket server buffers full-reload only when there are no clients, not for each future client when another page was already connected.
