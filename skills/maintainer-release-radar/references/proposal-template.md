# Proposals

## Entry in `state/proposals.toml`

The id is `<app>/<tag>/<topic>`, with `<topic>` in kebab-case. A bridge uses `bridge/<tag or foldkit-1655>/alchemy-2700`.

```toml
[proposals."citata-frontend/foldkit@0.82.0/remove-mount-key"]
class = "unblock"                  # unblock | break | adopt | bridge
target = "app:citata-frontend"     # app:<name> | contribution:<slug>
repo = "foldkit"                   # registry repo that released
release = "foldkit@0.82.0"
installed = "0.79.1"               # app's version at classification; empty for a bridge
location = "src/page/home/view.ts:120"   # every file:line, comma-separated
summary = "foldkit#1801 makes Mount args refresh on render, so the key on the popover can go."
workaround = ""                    # state/workarounds.toml id, for unblock
priority = "P2"
state = "open"                     # open | pr-opened | done | dropped
created = "2026-10-27"
pull_request_url = ""
```

The `summary` is one or two sentences: what the release changed, and what to do at `location`. A bridge summary names the release or merge and what the contribution must re-check, such as the adapter's `foldkit` peer range.

## App pull requests

Only for an app with `allow_pr = true`, and only for `open` proposals.

1. The apps live on macmax; branch from a clone on macair. Read the remote with `ssh macmax git -C <app path> remote get-url origin`. Clone it to `/home/om/TAO/Tools/apps/<app>` when missing, else `git fetch origin`.
2. Branch `radar/<topic>` from `origin/<default branch>`. Make the change the proposal names, nothing more. Update the dependency to the release when the change needs it.
3. Run the app's typecheck and tests. Commit with `--author="Taras Kornichuk <dread9ko@gmail.com>"`, no co-author trailer.
4. Push gate from "Autonomy" in `AGENTS.md`: one fresh-context subagent on the run's own model reviews `git diff origin/<default branch>...HEAD` against the app's `AGENTS.md`, when it has one. Push only after a clean review; at most 3 rounds, per "Reviews".
5. Check `paused`, `pushes`, and `pull_requests_opened`. Push to `origin`, then `gh pr create --draft` with the body below. Never merge it.
6. Set `state = "pr-opened"` and `pull_request_url`.

Pull request body:

```markdown
<What the release changed and what this pull request does in the app, in two sentences.>

- Release: <tag, linked to its notes or changelog>
- Class: <unblock | break | adopt>
- Locations: <file:line list>
- Checks: <commands run and their result>
```
