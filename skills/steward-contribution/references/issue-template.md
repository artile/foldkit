**TL;DR:** <One sentence stating the shortcoming and the recommended direction.>

<Short paragraph on the practical impact and, where needed, why the shortcoming belongs in the project, without repeating the TL;DR. Close with “Related work in the repository includes:” or “No related work has been identified in the repository.”>

<Bulleted list of related work from Discovery, each item linked with a brief note on its relevance; omit if none.>

## Evidence

<State current and expected behavior, citing the source of the expectation where one exists. Provide a minimal, self-contained example inline, with the observed result and any command maintainers can run in the repository as is. Briefly explain the root cause, linking to the relevant code at the pinned commit.>

| Package | Version | Commit |
|---|---|---|
| <affected package> | <published version, where relevant> | <pinned commit SHA> |
| <another relevant project package, if any; add rows as needed> | <published version, where relevant> | <pinned commit SHA> |

## Direction

<Summarize the target-state resolution: its rationale; its effect on the public API, behavior, and compatibility; and any validation. Cite the standards and specifications it follows. For an incremental resolution, outline the increments and mark the first as the scope of this contribution. State that a pull request will follow or what must be settled first.>

| Approach | Benefits | Trade-offs |
|---|---|---|
| <recommended approach> | <benefits> | <trade-offs> |
| <viable alternative, if any; add rows as needed> | <benefits> | <trade-offs> |
| Retain current behavior | <benefits> | <trade-offs> |

## Environment

<Include only for a possibly environment-dependent defect.>

```console
$ uname -s -r -m
<terminal output>

$ <command reporting the version of each runtime and toolchain the project uses>
<terminal output>

$ <command reporting the version of any browser or host application involved>
<terminal output>
```
