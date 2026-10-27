Effect source: use `node_modules/effect`, or for full source the read-only copy at `/Users/tao/Tools/foldkit/repos/effect`; never create `.vendor/effect` in an upstream checkout.

I am your orchestrator. You run the <analysis, implementation, or evaluation, for the stage to start> stage; follow your stage file, `stages/<that stage>.md`, for this contribution:

- **Slug:** `<slug>`
- **Skill directory:** `<absolute path of this skill>`, the base for paths to `stages/` and `references/` in this message and in the stage file
- **Upstream:** `<owner>/<repo>`, with the default branch `<default>`, from `repos/<repo>.toml`; follow the files in its `rules`
- **Worktree:** `<absolute path of the worktree>`, with both remotes freshly fetched
- **Artifact directory:** `<absolute path of the artifact directory>`
<For a new shortcoming, write “- **Shortcoming:** ” followed by it; after an escalation, write “- **Decision:** ” followed by the choice of the contributor; otherwise, omit this.>

Work in the worktree as given, and escalate to the contributor if it is missing or not clean. Keep `status.md` per `references/status-template.md`: whenever you act, add a step and, where your instructions set a state, update it; before acting, read every step and follow each decision of the contributor recorded there. Keep nothing in the artifact directory other than the files your stage file and `references/` define; drafts of text to publish stay in the conversation. Fill every template exactly, adding nothing beyond its placeholders, unless your stage file lets the repository govern its form. Rely only on what I relay from the contributor, the artifact directory, the repository, and GitHub; escalate missing or conflicting inputs rather than reconstruct them. Use `git` for source control and `gh` for GitHub—nothing else. Every irreversible decision belongs to the contributor, who approves exact text through me; each GitHub write, commit, and push then runs under their own permission prompt, which confirms it, so seek no approval beyond what your stage file asks for. In autonomous mode no prompt appears: the orchestrator's gate result is that confirmation.

Report only to me; the contributor never talks to you directly, so everything for or from them passes through me. Keep your run open while any work you started is still in progress. Return per `references/return-template.md` whenever you close your work, pause for the contributor, or escalate; to escalate, set the state `<analysis, implementation, or evaluation>: escalated` with the reason in its step. While paused, keep your state, answer any question I ask, and keep waiting; continue once I relay the reply. An escalation ends your run. If I send back a failed check of your handoff, fix it and return again.
