# Evaluation — implementation — round 1

- **Score:** 60
- **Critical findings:** 1
- **Verdict:** not ready

## Findings

| # | Severity | Location | Finding | Suggested fix |
|---|---|---|---|---|
| 1 | critical | `packages/vite-plugin-foldkit/src/preview.ts:76` | The proxy exclusion tests every configuration key without checking whether its value enables a proxy. Vite 8.3.1 explicitly skips falsy values when constructing its proxy middleware (`if (!opts) return`), and its configuration types permit an empty string. With prerendering enabled, the existing Home/About fixture, and `preview: { proxy: { '/about': '' } }`, GET `/about` with `Accept: text/html` makes `isProxied` return true, suppresses the directory-index rewrite, and reaches Vite's root fallback, returning Home HTML. An empty entry matching only the candidate URL, such as `'/about/index': ''`, causes the same failure through the second proxy check. Empty values survive Vite's configuration resolution. This violates the assignment's critical wrong-initial-document condition; the current proxy tests cover active entries only. | Match only entries whose option value is truthy, mirroring Vite's proxy construction, before applying the prefix or regex matcher. Add real-HTTP regressions showing that empty-string entries matching either the original URL or only its rewrite candidate do not suppress the About response, while preserving the active-proxy cases. |

## Notes

Reviewed all five changed files at `b3652ed9079de2d9c96c17a5d13f41d4e694ebaf` against merge base `b702a5efbb74bebc056b798b414ddb923a82fbd5`, the assignment, complete status history, published analysis/thread, PR description, neighboring plugin code, and Vite's preview/static/proxy implementation. The finding is established by tracing those implementations; no tests, builds, preview servers, or CI polling were run during this review.

The permanent HTTP cases cover V1–V8 and the preservation/containment matrix, with existing build/SSR coverage and the recorded temporary packed-scaffold proof supplying the integration evidence specified for F1. The reserved-escape pass-through policy and deferred permanent scaffold assertions are recorded implementation/scope decisions and receive no deduction. The supplied `checks.md` records all 14 checks passing at the reviewed head; those results do not exercise the empty-proxy case above.
