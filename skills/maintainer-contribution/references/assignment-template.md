# Assignment — <slug>

- **Base:** `<owner>/<repo>` `upstream/<default>` @ `<pinned commit SHA>`
- **Branch:** <per repository conventions; otherwise the slug>
- **Target branch:** <per the contribution guidelines>
- **Analysis:** <published analysis URL; revision comment URL, if any>

## Goal

<Describe the intended outcome and the scope of this contribution.>

## Verification

<Define the target behavior as given/when/then rows, each pinned by its own test that fails on the base and passes with the change. Start with the reproduction; cover each relevant edge case.>

| # | Given | When | Then |
|---|---|---|---|
| V1 | <state> | <action> | <observable outcome> |

<List behavior that must remain unchanged.>

| # | Invariant | Observed by |
|---|---|---|
| I1 | <existing behavior> | <existing or new test> |

- **Reproduction:** <path under `reproduction/` in the artifact directory>
- **Command:** <exact command that runs the reproduction>
- **Test placement:** <test files, framework, and repository conventions>

## Specification

<Identify the affected files and modules, the required changes, naming, and integration points. Specify behavior precisely enough to implement without further design. For an incremental resolution, state any prerequisites.>

## Compatibility

<State the exact changes to the public API and observable behavior (additions, modifications, and removals), or that there are none. Specify compatibility requirements, deprecation and migration provisions, and the resulting version impact per the versioning policy.>

## Boundaries

<List deliberate exclusions: later increments, adjacent improvements, and untouched files or areas.>

## Completion

<List the release bookkeeping for the version impact and any conflicts among contribution guidelines, workflows, and release instructions, noting which prevails.>

## Risks

<Beyond the shared review rubric, name contribution-specific risks and the findings that evaluation should treat as critical.>
