# Evaluation outcome | round 1

- **Pull request:** https://github.com/foldkit/foldkit/pull/1814
- **Reviewed head:** `b3652ed9079de2d9c96c17a5d13f41d4e694ebaf`
- **Merge base:** `b702a5efbb74bebc056b798b414ddb923a82fbd5`
- **Maintainer score:** 99/100; ready; zero critical findings
- **Implementation score:** 60/100; not ready; one critical finding
- **CI:** all 14 checks COMPLETED / SUCCESS at setup; no baseline-shared failures or CI Must-fix items
- **Verdict:** FAIL. The implementation score is below 95 and a critical finding is unresolved.
- **State:** `evaluation: failed round 1`
- **Must-fix count:** 1

## Must-fix

| # | Severity | Location | Finding | Required correction |
|---|---|---|---|---|
| 1 | critical | `packages/vite-plugin-foldkit/src/preview.ts:75–80`; original/candidate guards at `18–19` | `isProxied` matches every configured proxy key without checking its value. Vite skips falsy proxy options. With the Home/About fixture and `preview: { proxy: { '/about': '' } }`, GET `/about` is excluded from rewriting even though Vite installs no matching proxy, so SPA fallback serves Home HTML. An empty-string context matching only the candidate URL, such as `'/about/index': ''`, also suppresses the rewrite. This reaches the assignment's critical wrong-initial-document condition. | Mirror Vite's enabled-entry semantics before matching contexts. Add real-HTTP regressions for empty-string entries matching the original and candidate URLs, retaining active prefix/regex proxy coverage. Refresh affected verification and review gates before the next delivery. |

This is an implementation defect within the existing assignment, requiring no assignment or contributor policy decision. The finding comes from a source trace, not a newly executed HTTP reproduction: the implementation lens ran no tests, and evaluation independently confirmed the trace only after both reports existed. Installed Vite 8.3.1 `dist/node/chunks/node.js:19734–19738` skips entries with `if (!opts) return`; `resolvePreviewOptions` retains the proxy map and preview installs proxy middleware after plugin pre-hooks. The permanent proxy cases currently configure active bypass objects only.

The full current PR conversation at setup has one author Validation comment, zero reviews and zero review threads, with every pagination page exhausted. There are no OWNER/MEMBER/COLLABORATOR Must-fix items.

## Decide

| # | Severity | Location | Finding | Disposition |
|---|---|---|---|---|
| 1 | nit | `packages/vite-plugin-foldkit/src/preview.ts:14–15`, `27–28`, `37–38`, `42–43`, `50–51`, `61–62`, `69–70` | Seven value reads directly adjoin their consuming guards, contrary to the repository's phase-spacing convention. | Implementation has not dispositioned this new finding. Recommend inserting the blank lines during the required fix. Preserve ordinary spacing and coverage under the assignment's 500-line limit; do not compress code or remove tests to recover space. |

## Lens disagreement

The maintainer lens judges the change ready with one spacing nit. The implementation lens identifies an additional disabled-proxy configuration case and judges it not ready. The ready verdict cannot override the independent implementation finding. Scores and original reports are preserved without revision.

## Attention hunks

1. `src/preview.ts:75–80` and `18–19`: enabled proxy-entry matching determines whether the original or candidate URL can suppress the route correction. This is the blocking hunk.
2. `test/preview.test.ts:178–197`: active prefix/regex proxy cases protect forwarding and candidate collisions; extend this matrix with disabled entries and prove correct initial About HTML.
3. `src/preview.ts:42–63` and `test/preview.test.ts:343–375`: preserve decoding parity and canonical containment while revising the proxy logic. Earlier reserved-character and symlink findings have recorded corrections and coverage.

## Recorded scope and evidence

F1 delivers the private preview correction, permanent real-HTTP regressions, real-build side-effect fixture and plugin/generator patch changeset. Status records the final plugin suite (356 passed, four existing skips), typecheck, three-package rebuild, copied reproduction, script checks, packed generated-consumer initial-response/HEAD/browser proof and negative control, and complete pre-push including all 18 website Chromium cases. CI is green, but does not exercise the disabled-proxy defect. No tests were run during evaluation beyond its artifact handoff checker.

Permanent packed-scaffold assertions are the explicitly accepted F2 increment after F1 merges, with enrollment owned by the parent. That scope choice incurs no deduction and needs no new issue claim. Deployed hosts and non-Chromium browsers were not tested. The source worktree is clean at the reviewed head; no source edit, commit, push, GitHub publication, metadata change, promotion or watcher was performed.

## Review task accounting

Both fresh-context tasks used provider `codex`, model `gpt-6.1-sol`, and structural `reasoningEffort=high`. The implementation lens started only after the maintainer task completed with no pending child runs. Neither received the other report. Evaluation inspected the source diff only after both reports existed and both tasks completed.

- Maintainer: `node:delegated-task:command%3Amcp%3Ae291330d-aa07-4dbe-8818-086b5bf5d908%3Adelegate-task%3Aissue-1811-evaluation-r1-maintainer-20261027`
- Implementation: `node:delegated-task:command%3Amcp%3Ae291330d-aa07-4dbe-8818-086b5bf5d908%3Adelegate-task%3Aissue-1811-evaluation-r1-implementation-20261027`

Both tasks are `completed`, `workState=result_available`, `hasPendingChildRuns=false`. All commands have finished; no pending child work exists. Parent retains its lock and all claim/digest/autonomy, maintainer commit/push, cleanup and settlement responsibilities. Promotion is blocked; return to implementation, awaiting none.
