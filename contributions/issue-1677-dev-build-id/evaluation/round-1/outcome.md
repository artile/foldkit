# Evaluation outcome — round 1

- **Maintainer score:** 85
- **Implementation score:** 60
- **Critical findings:** 1 (implementation)
- **Verdict:** fail

## Failing condition

Both scores are below 95, the implementation lens reports one critical finding, and `checks.md` records a failing CI check (`Lint, Typecheck & Test`) that the `upstream` default branch does not share.

## Must-fix

1. **Commit bodies over 80 characters** (implementation #1 critical, maintainer #1 major, CI `Lint, Typecheck & Test` failure). All five commits (93ca18bd, f1500a50, 6b3cc5b7, 35e1efbf, 8857c390) have body prose lines over 80 characters (up to 533), so the job fails at `Check commit message line length` and skips every later step: formatting, changeset status, build, lint, typecheck, the SSR and host parity gates, and the tests. Rewrap each body at 80 characters, or squash the range into one commit with a wrapped body; run `pnpm check:commit-message-line-length` locally; force-push; the next round must see the whole job run and pass, including `changeset status` and `format:check`.

## Decide

| # | Source | Severity | Location | Item |
|---|---|---|---|---|
| D1 | implementation #2 | minor | `test/build.test.ts:1139-1140`, `test/buildToken.test.ts:213-214` | The I3 assertions only search bundles for the text `development-build-id`, which an inlined, minified virtual module need not keep. Assert at the build-mode transform boundary (id literal present, no `import`), or mutation-check the current assertion by forcing the serve branch in a build. |
| D2 | implementation #3 | minor | `src/buildToken.ts:192-194` | No test checks that the source map stays valid after `prepend` (a named Risk). Decode the serve transform map and check that the `injectedBuildId` line maps to its original line. |
| D3 | implementation #4 | minor | `test/ssr.test.ts` (`serves the development build id to the browser for revalidation`) | The test checks `no-cache` but not the ETag that the NOTE relies on. Assert an `etag` header and the conditional-request behavior. |
| D4 | maintainer #2 | minor | PR description | State that the `import.meta.env.FOLDKIT_BUILD_ID` define keeps its serve value `"development"` (`CONTRIBUTING.md` asks what the change leaves alone). |
| D5 | maintainer #3 | nit | PR description, paragraph 2 | Drop the bump type from "This is a `patch` change with no new option, export, or type."; the changeset records it. |
| D6 | maintainer #4, implementation #5 | nit | `test/resolution.test.ts:206`, `:403`; `test/ssr.test.ts:110-112` | The virtual module id is spelled out in each test file, and only `ssr.test.ts` names the resolved form. Define `RESOLVED_DEVELOPMENT_BUILD_ID_MODULE_ID` in `resolution.test.ts` too, or export the id once for tests. |

## Lens disagreement

The lenses grade the commit message failure differently: the implementation lens rates it critical (no Verification row has a CI result), the maintainer lens rates it major. Both require the same fix.
