# External parent-owned scrolling on upstream/main

Baseline: `foldkit/foldkit` upstream/main at `b702a5efbb74bebc056b798b414ddb923a82fbd5`. No PR preview code is used. Node `v22.22.3`; dependencies were installed by the parent setup.

Run from the contribution worktree:

```sh
pnpm --filter foldkit --filter @foldkit/ui build
node --test /home/om/TAO/Tools/foldkit/.maintainer/contributions/issue-1722-external-scroll/reproduction/external-scroll.mjs
```

Set `FOLDKIT_WORKTREE` to run against a different prepared checkout. The script imports built package code and the checkout's installed Effect and happy-dom. It does not edit the worktree.

Observed: exit 1, three expected capability failures and one passing self-contained control. Recorded output is in `observed.tap`, with whitespace on blank lines normalized; TAP values and outcomes are preserved.

The fixture has a parent `main` with a 300px viewport, 240px of preceding content, and 1,000 rows estimated at 30px. The natural-height list is 30,000px tall. The expected external viewport at parent `scrollTop = 840` starts 600px into the list.

- The mounted list emits its own 30,000px measurement. Scrolling the parent emits no VirtualList scroll Message.
- Measuring the natural-height list causes all 1,000 rows to render for a parent viewport that holds 10 rows. The assertion allows up to 30 mounted rows, including overscan.
- `scrollToOffset(model, 600)` completes as Applied against the list. Its live maximum offset is zero, so the parent stays at zero instead of the expected 840px.
- Scrolling the constrained list element itself emits the expected scroll Message and 300px measurement, validating the observation harness.

These are capability probes of the available CSS-only composition, not regression tests for a promised external-scroll API. The baseline has no external-scroller selection input. A future opt-in implementation must wire its agreed selection API into the fixture before the first three assertions become acceptance tests. They must not pass by changing self-contained defaults. The row-window probe uses Foldkit's internal render frame solely to inspect the existing view; the observation and Command probes execute the existing Mount and Command.

Dimensions are explicit happy-dom fixtures, not browser-computed layout. This establishes the listener target, measurement source, rendered row count, and Command target. It does not establish responsive geometry, no-gap rendering, touch momentum, dynamic-height convergence, anchoring, or mobile behavior. Those require a real browser regression once an API and implementation are available.

The required expectation comes from the maintainer acceptance comment on issue #1722, not from current docs. Current docs explicitly require a constrained list-owned scroll container, so this is a missing capability rather than a regression in the documented default.
