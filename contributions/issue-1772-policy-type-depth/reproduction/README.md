# Issue 1772 baseline reproduction

The reported policy-depth defect cannot be exercised on the required upstream/main baseline. Blocks and `Update.combineSteps` are absent there. Missing-API diagnostics are not a reproduction of TS2589/TS5114/TS5115.

Baseline: `foldkit/foldkit` upstream/main at `b702a5efbb74bebc056b798b414ddb923a82fbd5`. Foldkit 0.169.0, Effect 4.0.0, native TypeScript 7.0.2, Node v22.22.3, pnpm 11.8.0, Linux aarch64.

Run from any directory:

```sh
node /home/om/TAO/Tools/foldkit/.maintainer/contributions/issue-1772-policy-type-depth/reproduction/run-upstream.mjs /home/om/TAO/Tools/foldkit-worktrees/issue-1772-policy-type-depth
```

The runner checks the pinned clean worktree, uses its built package through the existing node_modules, and invokes its native compiler. A temporary consumer directory contains the fixtures and a node_modules symlink. It is removed in `finally`. No install, preview checkout, runtime execution or worktree edit occurs. Each compiler invocation has a 30-second timeout.

Exit 2 means the baseline lacks the API and the original defect was not reproduced. Exit 1 or an exception means an unexpected result requiring inspection. Compiler exit statuses appear separately in the JSON output.

Observed results are in `upstream-result.json`:

- `supported-api.ts` checks Schema, Message and update imports and a small supported update. Compiler exit 0.
- `preview-api.ts` is the minimal API-availability probe. Compiler exit 1 with TS2305 for the missing `Block` export and TS2339 for the missing `Update.combineSteps`.
- The original nine-binding control fails with the same missing APIs. Compiler exit 1.
- The original twelve-binding case fails with the same missing APIs. Compiler exit 1.
- Neither reported fixture reaches TS2589, TS5114 or TS5115 on this baseline. Runtime behavior is unverified here because the required API is unavailable.

The missing APIs are confirmed independently in the pinned package exports, root barrel, and source tree. A successful supported consumer rules out a general inability to resolve the built Foldkit package.

## Reported preview evidence

Issue: https://github.com/foldkit/foldkit/issues/1772

Pinned reproduction: https://github.com/kattsushi/foldkit-blocks-policy-repro/tree/9e08ee58f38e5bc2becab8dc8c546fa5b732287c

Preview source: `1f6776fa7ececa766188df5201eefec6ba781b5d`, the head of open draft PR https://github.com/foldkit/foldkit/pull/1655 at analysis time.

`reported/` contains source, configuration, dependency metadata and captured outputs retrieved from that reproduction commit through gh, with its MIT license. They are evidence inputs. Their package.json was not installed, and their runtime code was not executed. The baseline runner uses the worktree's dependencies instead of those preview pins. Do not interpret the captured outputs in `reported/evidence/` as measurements from this analysis.

The reporter pins Foldkit `0.169.0-canary.1f6776fa7ece`, Effect 4.0.0, native TypeScript 7.1.0-beta and Bun 1.3.14 on Linux x64. Its committed outputs report that nine bindings compile, twelve produce TS2589/TS5114/TS5115 at `Composition.makeUpdate`, and both runtime assertions stop after incrementing exactly three sibling counters with zero Commands. These preview results were not independently rerun in this main-only analysis.

The expected preview behavior comes from the commit-pinned reciprocal-policy guidance:
https://github.com/foldkit/foldkit/blob/1f6776fa7ececa766188df5201eefec6ba781b5d/skills/foldkit/references/composition.md#outmessages-and-sibling-policy

That guidance stages original Bindings, captures them in policy callbacks, registers the selected Bindings in the same Composition, and requires a finite synchronous chain. The report follows that pattern. No nine- or twelve-binding limit is documented in the cited section. The expected acceptance contract and a fix on upstream/main cannot be tested until that API is available on the authorized baseline.
