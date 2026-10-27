# Assignment — issue-1723-keyboard-previous

- **Base:** `foldkit/foldkit` `upstream/main` @ `b702a5efbb74bebc056b798b414ddb923a82fbd5`
- **Branch:** `issue-1723-keyboard-previous`
- **Target branch:** `main`
- **Analysis:** https://github.com/foldkit/foldkit/issues/1723#issuecomment-6430308902

## Goal

Previous-key navigation with no highlighted item must choose the last enabled item in a nonempty list. Correct the starting index in the shared keyboard helper and protect the supported Combobox focus-opening path with a Scene regression. This contribution addresses only the previous-key defect in #1723.

## Verification

Each row requires a distinct named test or named parameterized case, observed failing on the pinned base and passing after the correction. V1–V4 are the four failing helper cases in the recorded reproduction; V5 is its failing consumer Scene. Eleven other helper cases pass on the base and belong to the invariants below.

| # | Given | When | Then |
|---|---|---|---|
| V1 | Four enabled items, focused index -1, next/previous keys ArrowDown/ArrowUp | Resolve ArrowUp through keyToIndex | Return 3, rather than the base result 2 |
| V2 | Four items, only index 2 disabled, focused index -1, vertical keys | Resolve ArrowUp | Return 3, rather than the base result 1 |
| V3 | Four enabled items, focused index -1, next/previous keys ArrowRight/ArrowLeft | Resolve ArrowLeft | Return 3, rather than the base result 2 |
| V4 | Two enabled items, focused index -1, vertical keys | Resolve ArrowUp | Return 1, rather than the base result 0 |
| V5 | Single Combobox initialized with id test, Apple/Banana/Cherry/Date enabled, openOnFocus true, no selection, default deferred selection | Focus #test-input, confirm open state with no active item, acknowledge its Mounts, then press ArrowUp | The active Model index is Some(3), Date has the active marker, and the input aria-activedescendant is test-item-3; the base instead activates index 2 and test-item-2 |

These invariants apply to nonempty lists within the helper's existing input domain. Confirm each through existing or focused additional tests without changing the helper interface.

| # | Invariant | Observed by |
|---|---|---|
| I1 | Backward scanning skips a disabled suffix: four items, indices 2 and 3 disabled, absent focus resolves to 1; when only index 3 is enabled, it resolves to 3 | Helper tests matching the disabled-suffix and only-last-enabled reproduction controls |
| I2 | One enabled item with absent focus resolves to 0 | Helper test matching the single-item reproduction control |
| I3 | All-disabled lists preserve the original focusedIndex, including -1 for absence and a valid existing index | Helper tests for absent and existing focus; do not replace the fallback with the search start |
| I4 | Previous from index 0 wraps to the last enabled item; previous from a valid middle index scans backward, including disabled candidates | Existing keyToIndex tests in tabs/index.test.ts plus focused coverage if needed |
| I5 | Next from -1 starts at 0 and skips a disabled prefix; next navigation from valid indices and wrapping retain their behavior | Existing helper tests and the reproduction next-key controls |
| I6 | Home/PageUp choose the first enabled item; End/PageDown choose the last enabled item; an unrecognized key returns the supplied focusedIndex | Existing helper tests plus controls for aliases or fallback not covered there |
| I7 | Combobox opening, selected value, OutMessage policy, and ScrollIntoView Command lifecycle follow the existing deferred-selection behavior; navigation changes the active item | V5 Scene using the factory view/update pair, existing single/multi suites, and explicit acknowledgement of ScrollIntoView |
| I8 | Other helper consumers retain valid-focus behavior without local compensating changes | Existing Tabs, RadioGroup, Menu, and Listbox suites in the @foldkit/ui test run |

- **Reproduction:** [reproduction/keyboard.mjs](reproduction/keyboard.mjs) and [reproduction/combobox.mjs](reproduction/combobox.mjs); commands and captured results are described in [reproduction/README.md](reproduction/README.md).
- **Command:** Run `node /home/om/TAO/Tools/foldkit/.maintainer/contributions/issue-1723-keyboard-previous/reproduction/keyboard.mjs /home/om/TAO/Tools/foldkit-worktrees/issue-1723-keyboard-previous` and `node /home/om/TAO/Tools/foldkit/.maintainer/contributions/issue-1723-keyboard-previous/reproduction/combobox.mjs /home/om/TAO/Tools/foldkit-worktrees/issue-1723-keyboard-previous`. Both exit 1 on the base. They import dist JavaScript, so rebuild @foldkit/ui after editing before using them to validate the fix.
- **Test placement:** Extend the existing keyToIndex group in `packages/ui/src/tabs/index.test.ts` for V1–V4 and helper invariants. Add V5 in `packages/ui/src/combobox/single.test.ts`. Use the established @effect/vitest and Vitest assertions, and the Scene namespace used throughout packages/ui. Keep complete fixtures in source files. No new public export is needed to test the internal helper.

## Specification

The production change belongs only in `packages/ui/src/keyboard.ts`, in the configured previous-key branch of `keyToIndex`. The helper currently passes focusedIndex - 1 as the backward search start. At absent focus (-1), that becomes -2, which wraps to itemCount - 2 and skips an enabled final item on the first search step.

When focusedIndex equals -1 and the configured previous key is pressed, pass itemCount - 1 as the start of the existing backward enabled-item search. For every other focusedIndex, pass focusedIndex - 1. Continue searching in direction -1. Keep findFirstEnabledIndex bound to the original focusedIndex so its all-disabled fallback returns the caller's original value. A conditional expression for this single start-index choice fits the existing Match branch; do not introduce a second navigation algorithm.

Keep wrapIndex, findFirstEnabledIndex, other key branches, and their signatures unchanged. Do not normalize every negative number or alter the sentinel contract. The correction must respect the supplied previousKey, including ArrowLeft, rather than hard-coding ArrowUp.

`packages/ui/src/combobox/shared.ts` is an integration point to read, not a file to change: focus with openOnFocus emits Opened with Option.none(), the open view supplies -1 to keyToIndex, and ArrowUp uses the result to activate and scroll to an item. Single and Multi Combobox share that view. Test this existing route through the Single factory view/update pair. Resolve the AnchorCombobox and PortalComboboxBackdrop Mounts and ScrollIntoView Command with their existing completion Messages so the Scene checks the active item without executing DOM effects. Use existing Scene fixture helpers where appropriate. Assert the absent active item after focus before pressing ArrowUp, and assert both Model index and rendered active relationship after it.

The files to change are `packages/ui/src/keyboard.ts`, `packages/ui/src/tabs/index.test.ts`, `packages/ui/src/combobox/single.test.ts`, and one descriptive patch changeset under `.changeset/`. Existing helper consumers and public barrels require no edits. Read `packages/ui/src/combobox/shared.ts`, the consumer test fixtures, and the neighboring helper tests before implementation. Follow repository AGENTS.md and CONTRIBUTING.md; preserve Model ownership and route all consumer interaction through Messages.

## Compatibility

No public exports, parameter types, Model or Message Schemas, configuration fields, or Command contracts change. For a nonempty list, previous-key navigation from focusedIndex -1 starts with the final item and searches backward to the last enabled item. Combobox users can observe the corrected highlight, aria-activedescendant, and corresponding scroll target after opening without an active item. Shared immediate-selection paths use that corrected index under their existing selection policy; no policy is added.

Valid-index navigation and the listed invariants retain their behavior. No migration or deprecation is required. This is a user-facing bug fix with unchanged public surface, so @foldkit/ui receives a patch changeset under CONTRIBUTING.md. The configured fixed version group also contains foldkit and @foldkit/devtools; Changesets coordinates their release versions.

## Boundaries

- Exclude the public keyboard/typeahead subpath request and every other #1723 request, including Button, Checkbox/Switch, Meter/Progress, Toggle/ToggleGroup, and HoverCard work.
- Exclude empty-list behavior, modulo-zero handling, general negative-index validation, and replacing numeric absence with Option. The empty-helper observation in status.md is a separate candidate, with unverified consumer impact.
- Exclude consumer-specific navigation patches, helper/export reorganization, moving existing test groups, broad formatting, and architecture refactors.
- Exclude website or historical blog updates and application-specific workarounds. The existing issue covers several independent requests; a pull request for this correction must use Refs #1723 rather than close the whole issue.

## Completion

- Add one descriptively named changeset such as `.changeset/keyboard-previous-from-absence.md` with @foldkit/ui: patch. Explain that previous-key navigation from no highlighted item selects the last enabled item and identify the Combobox focus-opening trigger. Write release prose as paragraphs on single source lines. No API addition, minor/major bump, empty changeset, or consumer migration is warranted.
- Preserve `.changeset/config.json` and its fixed group of foldkit, @foldkit/ui, and @foldkit/devtools. Let Changesets calculate companion package releases. Do not hand-edit package versions, peer floors, lockfile, or generated changelogs, and do not run a version-release operation as part of this fix. Verify the release plan with `pnpm changeset status --since=upstream/main`.
- Observe each V-row test fail before editing production code. Confirm every invariant, then run `pnpm --filter @foldkit/ui test` and `pnpm --filter @foldkit/ui typecheck`. Rebuild with `pnpm --filter @foldkit/ui build` before rerunning both artifact reproductions; they must then exit 0. The previous analysis ran 184 relevant tests successfully, but did not validate a fix or the complete UI suite.
- Complete repository-required formatting, lint, and readiness checks appropriate to the final diff. Commit, pre-push review, push, draft pull request, exact-text publication gates, accounting, and persistence belong to the parent-led implementation stage, not this analysis handoff. Apply the maintainer autonomy gates for future writes; this claim's approval covers only its published body.
- Repository AGENTS.md overrides conflicting stage/template instructions. Put verification in the first Validation comment rather than the pull request description. Follow its exact-committed-diff review requirement before a push. Keep the description scoped to this fix with Refs #1723. Do not apply the full issue-template publication path because the existing issue already hosts the approved claim.

## Risks

Treat as critical any failure of V1–V5, selection of a disabled item when an enabled item exists, loss of the original all-disabled fallback, changed navigation from valid indices, or a correction applied only in Combobox while keyToIndex retains the defect. A test that bypasses focus-opening absence, supplies an active item initially, checks only an index without the rendered relationship, or leaves Commands/Mounts unresolved does not establish the consumer regression.

Treat public export additions, empty-list or sentinel redesign, unrelated #1723 features, and manual fixed-group version changes as scope violations. PRs #1539 and #1618 touch keyboard.ts for modifier handling, while #1655 carries broader architecture work; their inspected heads do not fix this starting-index defect. Refresh upstream and overlap evidence before implementation and follow the stage's base-change rules if a specification file changed.

The recorded consumer evidence is a synchronous Scene simulation of handlers, Model transitions, and attributes. It does not execute DOM effects or establish browser or assistive-technology behavior. WAI-ARIA APG Combobox Up Arrow guidance is informative and optional; the assignment does not claim a WCAG violation or extend another component's keyboard policy.
