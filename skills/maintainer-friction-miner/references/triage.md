# Triage

Run the three checks in order for each new signal. Stop at the first one that gives an outcome. Keep every command and its output under `/home/om/maintainer-runs/friction-miner-<UTC stamp>/<entry id>/`; the digest and the issue cite them.

## 1. Owner layer

The owner is the lowest library in the stack that shows the failure on its own. A library's own dependencies are below it: `effect` is below `foldkit`, `alchemy`, `effect-orm`, and `maple`. Read each repo's `package.json` when the order between two of them is not clear.

1. Read the app code around the signal and state the failure in one sentence: the call, the input, the observed result, the expected result.
2. Write the smallest reproduction that imports only the suspect library and its own dependencies. No app code, no other registry library.
3. Start with the lowest suspect. When the failure shows with `effect` alone, the owner is Effect, even when the app met it through Foldkit. When it shows only with `foldkit` on top, the owner is Foldkit.
4. When the failure needs two registry libraries together, the owner is the library that imports the other, for example the Foldkit adapter in `alchemy`.
5. When no single-library reproduction shows the failure, the cause is the app. Outcome `dropped`, reason "app code".

A type-level signal (`cast`, `@ts-expect-error`) reproduces as a `.ts` file that fails `tsc --noEmit` with the library's own `tsconfig` settings, plus the version of TypeScript the app uses.

## 2. Dedup

Search the owner repo for the same root cause. Use two or three key terms: the API name and the symptom.

- `gh issue list -R <upstream> --state all --search "<terms>" --json number,title,state,url,author`
- `gh pr list -R <upstream> --state all --search "<terms>" --json number,title,state,url,mergedAt`
- The changelog between the app's installed version and `upstream/<default_branch>`: the package `CHANGELOG.md` and `git log --oneline <installed tag>..upstream/<default_branch> -i --grep=<term>` in the clone.
- `contributions/*/status.md` and `state/workarounds.toml`, for an item already in flight here.

An open issue or PR with the same root cause gives outcome `duplicate`. A merged fix moves on to step 3, which confirms it.

## 3. Reproduce on HEAD

In the clone at the repo's `path`, run `git fetch upstream <default_branch>`. Add a detached worktree at `upstream/<default_branch>` under `/home/om/TAO/Tools/<name>-worktrees/friction-<topic>` (Foldkit: `foldkit-worktrees`). Run the reproduction against that build and against the app's installed version.

| Installed version | HEAD | Outcome |
|---|---|---|
| Fails | Fails | `candidate`. Record the pinned commit |
| Fails | Passes | `fixed`. Find the fixing commit with `git log` on the touched files or `git bisect run`; record it as `fixed_by` |
| Passes | Passes | `dropped`, reason "does not reproduce" |

Remove the worktree when the outcome is recorded, unless a contribution will use it.

## Priority

Use the scale in "Maintainer priorities" in `AGENTS.md`. For a repo other than Foldkit, use that repo's priority labels when the dedup step finds a labeled related issue; otherwise estimate and record `priority_source = "estimate"`. A bug that blocks a feature in the app is at least `P2`. A cast that only costs type safety is `P3` unless several apps repeat it.
