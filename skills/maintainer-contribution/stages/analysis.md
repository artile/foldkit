# Analysis

## Objective

Establish the shortcoming the contributor reports (a defect, limitation, or missing capability) against current upstream, determine the target-state resolution, and return the case for and against it for a decision of the contributor. On a decision to contribute, publish the agreed analysis and, once the resolution is ready for implementation, issue an assignment that implementation can execute without further design.

## Inputs

Analysis starts from one of two inputs:

- **A new shortcoming:** one the orchestrator passes on from the contributor under a new slug.
- **A resumption:** a contribution the orchestrator names by slug, in one of three states:
  - `analysis: in progress`, resuming an interrupted analysis;
  - `analysis: published`, with maintainer responses to act on;
  - `<stage>: escalated`, for a reason implicating the analysis or assignment.

On a resumption, first read the artifact directory and, through `gh`, the published thread. Then revise only what the new information invalidates: rerun the affected parts of Phase 1 against the current `upstream/<default>`, publish the approved revision in place while no one else has replied in the thread, or otherwise as a revision comment, and update any existing `assignment.md` in place. If the revision leaves the change no longer ready for implementation, move the contribution to the Proposal path, set `analysis: published`, and remove `assignment.md`; a new one follows once the change is ready.

## Phase 1 — Analysis

Phase 1 informs the decision of the contributor without external effect: nothing is published or pushed. It holds `analysis: in progress` from its start and ends at Decision, where the contributor selects the contribution path.

### Discovery

Restate the reported shortcoming, having the contributor resolve any ambiguity; where the report spans independent shortcomings, have the contributor choose one to pursue. Review related open and closed issues, pull requests, and discussions for prior findings and decisions. Pin the analysis to the current `upstream/<default>` commit, the base cited by the published analysis and any assignment. Examine the relevant implementation and tests for current behavior and coverage, and the contribution guidelines for project conventions.

### Reproduction

Demonstrate the shortcoming on the pinned commit with a minimal example that asserts the expected behavior, so it fails there and passes once resolved, reusing existing tests where suitable. Keep any new test or script, with its run command and observed result, in `reproduction/` in the artifact directory rather than the worktree. Distinguish current from expected behavior, citing the documentation or specification that defines the expectation where one exists, and note relevant edge cases. Where the shortcoming cannot be demonstrated, record what remains unverified.

### Resolution

Trace the shortcoming from the reproduction to its root cause and determine the target-state resolution that eliminates the root cause, scoped by correctness rather than effort, up to and including redesign of the affected areas. Ground it in current industry standards, ratified specifications, and compatible project conventions; flag any conflict. State its effect on the existing implementation, public API, behavior, and compatibility. Compare viable alternatives that materially affect the decision and recommend the strongest. Where implementation readiness is in question, validate the resolution in a disposable worktree against the reproduction, the tests it touches, and, where it touches a performance-sensitive path, a benchmark against the base; carry any bound it sets into Verification as an invariant, then remove the worktree; its code stays out of every handoff artifact.

### Recommendation

Weigh the merit of the change against reasons to retain current behavior; effort shapes only the contribution path and any increments. Where the resolution warrants incremental delivery, identify a coherent first increment. Assess whether the shortcoming belongs in the project or the consuming application, and recommend the path from the first matching row:

| Assessment | Contribution path |
|---|---|
| Already resolved upstream or addressed by an open pull request | No contribution |
| Clear and belongs in the project; resolution (or its first increment) ready for implementation | Implementation |
| Clear and belongs in the project; resolution awaits a decision reserved for the maintainers | Proposal |
| Needs clarification and merits discussion | Exploration |
| Belongs in the application, or the case for change lacks merit | Application-level resolution |

### Decision

Return the findings, target-state resolution, case for and against it, open questions, and recommended contribution path for a decision of the contributor, settling through further returns every open question they can decide; only questions reserved for the maintainers, such as project policy, API direction, or release decisions, remain open. Report any independent shortcoming that surfaced during analysis as a candidate for its own contribution, never in published text; parts sharing the root cause remain increments of this resolution. Until publication, the analysis stays in your returns, and the artifact directory holds only the reproduction and `status.md`. On a decision to contribute, proceed to Phase 2; otherwise, conclude the analysis here with `analysis: concluded` and close with a return reporting the conclusion.

## Phase 2 — Rollout

Phase 2 publishes the agreed analysis upstream and, for Implementation, hands off to implementation via an assignment. Contributing paths compose their output from these references:

| Contribution path | References | Output |
|---|---|---|
| Implementation | `references/issue-template.md`, `references/assignment-template.md` | GitHub issue; `assignment.md` in the artifact directory |
| Proposal | `references/issue-template.md` | GitHub issue |
| Exploration | `references/discussion-template.md` | GitHub discussion |

### Publication

Issue and discussion templates and conventions of the repository govern form, including the title; the references supply content. Published text stands on its own: examples are inline and generic, free of local paths, application internals of the contributor, and workflow terms. If Discovery found an open thread on the shortcoming, contribute there instead of opening a new one. For an existing issue on the Implementation path, publish a short claim comment instead of the full issue template: the pinned commit, the minimal reproduction inline, the observed and expected result, and one line saying a pull request follows. For an incremental resolution, cover the full target state and mark the first increment as the scope of this contribution. Publish only once the contributor approves the exact text; place a discussion in the designated category of the project. Record the published URLs in `status.md` and, for Implementation, proceed to the assignment.

### Assignment

For Implementation, create `assignment.md` in the artifact directory from `references/assignment-template.md`, based on the pinned commit and scoped to the resolution or its first increment. As a specification, not a suggestion, it contains:

- links to the published analysis and the reproduction in the artifact directory;
- a Verification table authored by analysis, which traced the root cause: given/when/then rows that fail on the base and pass with the change, starting with the reproduction and covering each edge case, plus the invariants that must hold;
- the affected files, required changes, and integration points, leaving no design to rederive;
- the exact public API and behavior changes, with their version impact;
- scope boundaries, including later increments and adjacent improvements;
- the release bookkeeping for the version impact, resolving any conflicts among the contribution, workflow, and release requirements of the repository;
- the risks and findings evaluation should treat as critical for this change.

### Handoff

Record the outcome in `status.md` as `analysis: assignment ready` (Implementation) or `analysis: published` (Proposal or Exploration). Close with a return reporting the slug, decision, and published URLs and, for Implementation, the assignment path.

## Out of scope

Edits to tracked files in the contribution worktree, commits, pushes, pull requests, and GitHub writes beyond the approved publication.
