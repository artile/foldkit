# friction.toml

`friction.toml` sits at the root of a web app. Agents and Taras append one entry each time a registry library gets in the way while they work: a missing API, a type that needs a cast, a behavior that needs a workaround, a confusing error. The friction miner reads it every week. It never edits the file.

## Format

One `[[entry]]` table per item. Append only; do not reorder or delete entries.

```toml
[[entry]]
date = "2026-10-27"                       # UTC date, YYYY-MM-DD
package = "foldkit"                       # npm package name, as in package.json
what = "Mount args are captured at mount, so a changed anchor id did not move the popover."
where = "src/page/home/view.ts:120"       # file:line in the app, or the command that failed
by = "agent"                              # agent | taras
expected = "The popover follows the new anchor."   # optional
workaround = "Keyed the popover by anchor id."     # optional: what the app does instead
```

- `what` states the observed behavior in one or two sentences. Name the API.
- `where` points at the line that carries the workaround, or at the call that hit the problem.
- Write one entry per problem. Two problems in one entry become one signal and lose one of them.

## Line for an app's AGENTS.md

Add this to each web app's `AGENTS.md` so agents there write entries:

```markdown
When a library (foldkit, effect, alchemy, effect-orm, maple) forces a workaround, a cast, or a copy of its code, append one `[[entry]]` table to `friction.toml` at the app root: `date` (UTC, YYYY-MM-DD), `package` (npm name), `what` (the observed behavior, naming the API), `where` (file:line of the workaround), `by = "agent"`, and optionally `expected` and `workaround`. Append only.
```

Agents in the app do not read the Maintainer worktree, so the line carries the whole format instead of a path.

## How the miner uses an entry

The miner keys each entry by app, `date`, `package`, and `what`, and stores its outcome in `state/workarounds.toml` with `signal = "friction"`. An entry with an outcome is not triaged again.
