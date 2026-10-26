# Previous-key navigation reproduction

Base: `b702a5efbb74bebc056b798b414ddb923a82fbd5` (`upstream/main`, independently confirmed through GitHub's commits/main endpoint in the run evidence directory below). The prepared worktree is detached and clean. Its setup already built the packages. These scripts import built JavaScript; they do not edit the worktree or load TypeScript source through a custom loader. Node is v22.22.3.

Run the helper assertion:

```sh
node /home/om/TAO/Tools/foldkit/.maintainer/contributions/issue-1723-keyboard-previous/reproduction/keyboard.mjs /home/om/TAO/Tools/foldkit-worktrees/issue-1723-keyboard-previous
```

Observed: exit 1. Four of fifteen cases fail: previous from no active item returns 2 instead of 3; disabling index 2 returns 1 instead of 3; the horizontal previous key returns 2 instead of 3; two enabled items return 0 instead of 1. Eleven controls pass, including a disabled suffix, only the last item enabled, next-key navigation, navigation from valid indices, all items disabled, one item, Home, End, and an unrecognized key. Full output: `keyboard-result.txt`.

Run the consumer assertion:

```sh
node /home/om/TAO/Tools/foldkit/.maintainer/contributions/issue-1723-keyboard-previous/reproduction/combobox.mjs /home/om/TAO/Tools/foldkit-worktrees/issue-1723-keyboard-previous
```

Observed: exit 1. A Scene built with the public Combobox factory, init, Message, and Mount exports focuses an input with `openOnFocus: true`. The Model becomes open with no active item. ArrowUp activates Cherry (index 2) and renders `aria-activedescendant="test-item-2"`; the assertion expects Date (index 3). Full output: `combobox-result.txt`. This is a synchronous Scene simulation of handlers, Model transitions, and rendered attributes, without a browser or execution of DOM effects.

Run the existing relevant source suites from the worktree:

```sh
pnpm --filter @foldkit/ui test src/tabs/index.test.ts src/combobox/single.test.ts src/combobox/multi.test.ts
```

Observed: exit 0, 3 files and 184 tests pass. Full output: `existing-tests.txt`.

Raw supporting evidence is stored outside the tracked contribution at `/home/om/maintainer-runs/issue-claim-20261026T195939Z/issue-1723-keyboard-previous-analysis/`. It contains the upstream-main confirmation, focused issue and PR snapshots, all 98 open PR metadata and changed-path snapshots, relevant PR diffs, direct source reads at broad PR heads, and the informative WAI-ARIA APG Combobox guidance. The findings and evidence limits are summarized durably in `../status.md`.

The reproduction is intentionally failing against the base. No fix was implemented or validated.
