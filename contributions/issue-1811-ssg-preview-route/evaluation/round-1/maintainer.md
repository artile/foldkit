# Evaluation | maintainer | round 1

- **Score:** 99
- **Critical findings:** 0
- **Verdict:** ready

## Findings

| # | Severity | Location | Finding | Suggested fix |
|---|---|---|---|---|
| 1 | nit | `packages/vite-plugin-foldkit/src/preview.ts:14–15`, `27–28`, `37–38`, `42–43`, `50–51`, `61–62`, `69–70` | The request, pathname, route, segments, file, index, and client reads run directly into their guards. Repository `AGENTS.md` explicitly separates a value read from the guard that consumes it with a blank line. The repeated omission makes the validation phases denser than the surrounding build code. | Insert a blank line between each read and its following guard. Preserve the validation order and behavior. |

## Notes

- Reviewed PR #1814 at `b3652ed9079de2d9c96c17a5d13f41d4e694ebaf` against merge base `b702a5efbb74bebc056b798b414ddb923a82fbd5`, including every line of the five-file diff, surrounding build/composition code, fixture conventions, and Vite's preview, proxy, static-file, and HTML-fallback implementation. Applied the required read-only contribution, full-change, and prose sections of `.agents/skills/review-contributor-pr/SKILL.md`.
- The correction belongs in the plugin: Foldkit generates directory indexes and its generated scaffold links to the corresponding routes. The private preview pre-hook resolves those documents through Vite without adding public configuration or exports, changing build output, or executing the server entry. Disabled prerendering omits the hook. The direct host-lifecycle implementation fits this subsystem.
- Real-HTTP coverage pins document selection, query and original request identity, HEAD, resolved output/base handling, file and proxy precedence, disabled behavior, malformed targets, containment, and independence from the server output. The recorded decision to pass through paths whose decoding differs from Vite avoids validating one file and serving another; it is accepted without deduction.
- The descriptively named changeset supplies the required plugin and generator patch bumps. The generator builds its package snapshot from repository package versions; generated manifests do not need a source edit. The PR title, description, changeset, internal TSDoc, test names, and fixture text describe the delivered behavior without attribution or review-only material in the squash description.
- The assignment explicitly defers permanent packed-scaffold response assertions to F2 after merge. Status records passing packed-consumer proof and its negative control for F1. That scope decision incurs no deduction; the parent owns the follow-up enrollment.
- `checks.md` records all 14 checks as completed successfully for the reviewed head. This review ran no tests, started no servers or CI monitoring, and changed only this report.
