# Size and fixture validation

Base: upstream/main b702a5efbb74bebc056b798b414ddb923a82fbd5. Analysis used a disposable detached worktree at /home/om/TAO/Tools/foldkit-worktrees/analysis-issue-1811-retry. The contribution worktree was never edited.

All six archived file hashes matched implementation-round-1/preserved-source/sha256.json before and after validation. Only the five F1 files were restored to the disposable checkout; the scaffold script was excluded. The only additional validation edit was build: { emptyOutDir: true } on the existing test createBuilder configuration. No production fix was authored or revised in analysis.

Commands and observations:

- pnpm install --frozen-lockfile, bash scripts/cloud-session-setup.sh, and the maintainer link-skills.sh completed successfully. analysis-retry-setup.log records setup. This setup build is not final implementation verification.
- pnpm --filter @foldkit/vite-plugin exec vitest run test/preview.test.ts exited 0: 22 passed. See analysis-retry-preview.log.
- Removing only the emptyOutDir test setting and running pnpm --filter @foldkit/vite-plugin exec vitest run test/preview.test.ts -t 'previews built documents' exited 1 at the existing stale-root-document guard, before preview. See analysis-retry-fixture-red.log. The correction was restored byte-for-byte after this control run.
- pnpm --filter @foldkit/vite-plugin typecheck exited 0 with the correction restored. See analysis-retry-typecheck.log.
- pnpm exec oxfmt --check on the five F1 files exited 0. git diff --check exited 0.

Measured final candidate size, including all untracked files:

| Path | Added | Deleted |
|---|---:|---:|
| packages/vite-plugin-foldkit/src/build.ts | 13 | 3 |
| packages/vite-plugin-foldkit/src/preview.ts | 86 | 0 |
| packages/vite-plugin-foldkit/test/preview.test.ts | 345 | 0 |
| packages/vite-plugin-foldkit/test/fixtures/preview/entry.server.ts | 9 | 0 |
| .changeset/ssg-preview-directory-index.md | 8 | 0 |
| Total | 461 | 3 |

F1 totals 464 changed lines. The permanent packed-scaffold assertion addition is 44 lines, deferred to F2 with an empty changeset after F1 merges. F1 requires the packed-scaffold HTTP proof locally before delivery. No full plugin-suite, packed-scaffold, browser, generator, lint, or pre-push result is claimed by this analysis validation.
