# Evaluation | implementation | round 1

- **Score:** 97
- **Critical findings:** 0
- **Verdict:** ready

## Findings

| # | Severity | Location | Finding | Suggested fix |
|---|---|---|---|---|
| 1 | minor | `packages/ui/src/combobox/single.test.ts:1413` | The final `Scene.expectNoOutMessage()` observes `CompletedScrollIntoView`, rather than the preceding ArrowUp activation. Scene replaces its captured OutMessages on each update-producing step (`packages/foldkit/src/test/scene.ts:1752`), and `Scene.Command.resolve` runs update. An erroneous selection OutMessage from ArrowUp would therefore escape this assertion. The fixed `maybeSelectedValue: Option.none()` view input also means the rendered `data-selected` check cannot detect that emission. | Move this assertion immediately after `Scene.keydown(input, 'ArrowUp')`, before resolving ScrollIntoView. Retain the Command resolution and the subsequent Model and rendered-relationship checks. |

## Notes

Reviewed the complete four-file PR diff at `f4f8b0bc54945f7d68f68b715dd82f6442bbae0d` against merge base `b702a5efbb74bebc056b798b414ddb923a82fbd5`, the assignment, full status, published analysis and issue thread, PR description, repository conventions, and surrounding helper, consumer, and Scene code. The other lens report was not read.

V1–V4 have distinct named helper regressions whose expected results differ from the base calculation. V5 reaches the factory view/update pair through input focus, verifies an open Combobox without an active item, acknowledges AnchorCombobox and PortalComboboxBackdrop, presses ArrowUp, resolves ScrollIntoView, and verifies both `Some(3)` and Date's active marker and `aria-activedescendant`. Status records all five regressions failing with the original calculation and passing with the correction. The finding above concerns the additional deferred-selection assertion; it does not invalidate V5's index or rendered-relationship checks.

The production conditional changes only the search start for the configured previous key at exactly `focusedIndex === -1`. The existing backward scan skips disabled candidates and retains the original focused index as its all-disabled fallback. Added and existing tests cover I1–I6; the new Scene and existing single/multi suites cover the consumer lifecycle and selection policies in I7, subject to the assertion-placement finding; the complete UI run covers the other consumers in I8. No public types, signatures, exports, or consumer implementations change, and the patch changeset matches the assigned release scope.

`checks.md` records all 13 CI checks as successful on the reviewed head. Status records the complete UI suite, typecheck, build, rebuilt reproductions, release-plan verification, and repository pre-push checks passing. No tests or checks were rerun during this review. The new consumer regression simulates handlers, Model transitions, and rendered attributes; it does not execute DOM effects or establish browser or assistive-technology behavior.
