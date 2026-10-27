<Title: the Conventional Commit subject, with `!` after the scope for a breaking change.>

<Description: written as the squash commit body. One source line per paragraph, no hard wrapping.>

<Paragraph: what was wrong or missing before, led by its impact on people building with the project (for `foldkit`, see "Maintainer priorities" in `/Users/tao/Tools/foldkit/.maintainer/AGENTS.md`), as a reader of `git log` on `<default>` needs it.>

<Paragraph: what changed, by area, naming the affected modules, the version impact, and any public API or behavior change.>

<Paragraph, only when it applies: what stays the same, deliberate exclusions, and the later increments.>

<Fixes #N, or Refs #N for an incremental resolution.>

<First pull request comment, posted after the draft opens, not part of the description:>

**Validation:** <the added or updated tests and what they pin, in a sentence or two; then what could not be verified, or "Nothing left unverified.">
