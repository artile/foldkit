# Evaluation — maintainer — round 1

- **Score:** 85
- **Critical findings:** 0
- **Verdict:** not ready

## Findings

| # | Severity | Location | Finding | Suggested fix |
|---|---|---|---|---|
| 1 | major | Commits 93ca18bd, f1500a50, 6b3cc5b7, 35e1efbf, 8857c390 (CI `Lint, Typecheck & Test`, step `Check commit message line length`) | Every commit body has prose lines over 80 characters, which `CONTRIBUTING.md` (`check:commit-message-line-length`) forbids. The job stops at that step, so formatting, changeset checks, build, lint, typecheck, the SSR and host parity gates, and the whole test suite have no CI result on this head. `upstream/main` passes, so the failure is caused by this branch. A maintainer cannot accept a red required check, and the CI run gives no evidence for the tests that pin V3, V4, V5 and I1 to I6. | Rewrite the five commit bodies (or squash to one commit, which suits a squash-merged PR) with prose wrapped at 80 characters, force-push, and confirm that every later step of the job runs and passes. |
| 2 | minor | PR #1752 description | `CONTRIBUTING.md` "Pull Requests" asks the description to state what the change deliberately leaves alone. The description does not say that the `import.meta.env.FOLDKIT_BUILD_ID` define keeps its serve value `"development"`, which now differs from the id that the virtual module serves. A reviewer who knows both paths will ask why only one moved. | Add one sentence: the `import.meta.env.FOLDKIT_BUILD_ID` define does not change in this PR. |
| 3 | nit | PR #1752 description, paragraph 2, last sentence | "This is a `patch` change with no new option, export, or type." is release bookkeeping. On squash merge it becomes part of the commit body on `main`, where the bump type is noise (the changeset already records it). | Write "The plugin has no new option, export, or type." and drop the bump type. |
| 4 | nit | `packages/vite-plugin-foldkit/test/resolution.test.ts:206`, `:403`; `packages/vite-plugin-foldkit/test/ssr.test.ts:110-112` | The two suites name the same module differently: `ssr.test.ts` defines `RESOLVED_DEVELOPMENT_BUILD_ID_MODULE_ID`, and `resolution.test.ts` builds `` `\0${DEVELOPMENT_BUILD_ID_MODULE_ID}` `` inline at the call site. | Define `RESOLVED_DEVELOPMENT_BUILD_ID_MODULE_ID` in `resolution.test.ts` too, matching `ssr.test.ts` and `src/buildToken.ts`. |

## Notes

- Fit: the fix belongs in `@foldkit/vite-plugin`, it is in the module that owns the build id (`src/buildToken.ts`), and it reuses the existing `buildIdForConfig` / `developmentBuildIds` state, so every environment of one dev server reads one id. The virtual module naming (`DEVELOPMENT_BUILD_ID_MODULE_ID`, `RESOLVED_…`, `virtual:foldkit/…`) and the `resolveId` if/else shape match `build.ts` and `devToolsOverlay.ts`. No public API change; Compatibility is accurate. The changeset is `patch`, release-note shaped, unwrapped, with no em dashes, and the reporter thanks has precedent (`c9b3dd3e2`, `7014ef6d9`).
- The serve and build branches of `transformBuildIdentity` each repeat the `replaceAll` call and its `undefined` guard. Computing the replacement first and prepending the import only in serve mode would remove that duplication. `status.md` step 8 records this layout as a choice made in pre-push review, so it is not deducted here.
- `resolveId` and `load` for the virtual module are also active in `vite build`. Nothing imports the module in build output (the new I3 assertions pin this), so this has no effect. A maintainer might still prefer a serve-only guard to make that clear in the code.
- The docs statements in `packages/vite-plugin-foldkit/README.md:192` and `serverRendering.md` "Development build ids" are still accurate; leaving them unchanged follows Specification step 6.
