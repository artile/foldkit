# Implementation F1 verification

Base: upstream/main b702a5efbb74bebc056b798b414ddb923a82fbd5. Current local source: 2f21134aab09aea336baba57b4acdd3fd6f288b8. final-source-sha256.json identifies the exact five source files; the unpublished diff is 496 additions plus 3 deletions, 499 changed lines. Publication is held after the third failed code review; this source has an unresolved path-decoding correctness and containment finding.

Final source checks:

- plugin-test-verified.log: pnpm --filter @foldkit/vite-plugin test, exit 0, 356 passed and 4 skipped, including all 26 preview cases.
- plugin-typecheck-verified.log: plugin typecheck, exit 0.
- package-build-verified.log: required Foldkit/plugin/generator rebuild, exit 0.
- fixed-reproduction-verified.log and verified-reproduction/: copied original reproduction, exit 0. Responses preserve requested routes and queries and select generated About HTML before hydration.
- packed-proof-verified.log: pnpm check:scaffold-server-rendering, exit 0, freshly rebuilt and packed packages/generator, installed through packed CLI, unchanged scaffold build/preview scripts, raw About/query/root/trailing-slash/explicit-index/HEAD assertions before existing SSR/SSG Chromium checks.
- scripts-typecheck.log and scripts-test.log: exit 0 with temporary archived scaffold assertions. Their source is unchanged across subsequent production fixes. The complete final pre-push suite also checks the restored baseline script.
- generator-test.log: 18 generator tests passed. Generator rebuild is included in package-build-verified.log and packed proof.
- format-verified.log: five-file Oxfmt check, exit 0. Required full lint is part of pre-push.
- pre-push-verified.log: completed with exit 1. Checks preceding website browser tests passed, including prescribed lint. At line 2355 the website dev server reported "FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory". Initial browser assertions observed an unexpected data-foldkit-build attribute; subsequent retries encountered connection refusal after the server died. All 18 website browser cases failed. This is not a passing pre-push gate, and no baseline comparison or heap remediation has been performed.

Packed and pre-push commands use TMPDIR=/home/om/foldkit-1811-tmp and PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium. The packed proof runs with the 44 archived scaffold assertion lines temporarily restored; the script is then restored byte-for-byte to pinned baseline before staging/commits/pre-push. The permanent scaffold wiring is F2 after F1 merges and requires separate parent enrollment.

Mutation and regression evidence:

- packed-mutation.log: exit 1 specifically at the generated About document comparison for /about, with the rewrite disabled in a disposable validation checkout. mutation.patch records the one-line mutation. The rewrite was restored and checkout removed; packed-proof.log passed afterward. The assertion source is identical in packed-proof-verified.log.
- review-regressions-red.log: prefix and anchored-regex original proxy contexts plus extensionless-index collision failed before corrections.
- proxy-collision-red.log: both rewritten-only proxy contexts failed before corrections. Collision requests now pass unchanged to Vite, retaining its baseline SPA fallback rather than activating proxy forwarding.
- Original base/red evidence stays in sibling implementation-round-1 and the contribution reproduction root without modification.

Review hold:

- Code reviews used 3/3 rounds, all failed. Rounds 1 and 2 findings were fixed and tested. Round 3 found that lookup decodes with decodeURIComponent while Vite serves using decodeURI, so encoded reserved-character routes can validate one file and serve another. The mismatch also permits validation of a different path from an encoded-name symlink served downstream. The reviewer confirmed the document collision through real Vite 8.3.1 HTTP with an in-memory filesystem probe. No correction or new regression for this finding has been implemented. The next driver run must align validation and downstream resolution, add reserved-character collision and symlink containment regressions, preserve all required coverage within 500 changed lines, refresh necessary checks, and obtain a clean review before publication.
- Exact PR title/body review round 1 was CLEAN, with zero failures this run or total. Validation text review has not started. No push, PR, Validation comment, or daily allowance reservation occurred.

Superseded attempts are retained: pre-push-before-review-fixes.log and pre-push-before-proxy-collision-fix.log were stopped and awaited after code-review findings and are not completed gates. plugin-test-final-proxy.log failed because a concurrent package clean removed core imports during the tests; the final checks were rerun sequentially and passed. plugin-typecheck-final.log preserves the optional proxy response fixture typing error, corrected before final verification. final-proxy-lint.log reports no files because the repository excludes plugin source/tests from that targeted configuration; the full prescribed lint suite is the applicable gate. commands.log records every completed command and exit code.
