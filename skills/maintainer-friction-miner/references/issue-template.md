# Issue template (`issue` mode)

Use this for repos with `mode = "issue"`. When the repo has `.github/ISSUE_TEMPLATE/` in the clone, use its bug report form: put the sections below into the form's fields, in the form's order. Do not pass `--label`; the form applies its own labels. Follow every file in the repo's `rules` list.

Title: the API and the symptom, under 70 characters, for example `Schema.TaggedClass: encode drops optional key with exactOptionalPropertyTypes`. No prefix such as "Bug:".

Body:

```markdown
<One or two sentences: what the API does, and what it should do instead.>

## Reproduction

<Minimal, self-contained code. It imports only this library and its own dependencies.>

<The command that runs it, and its output.>

## Expected

<The expected result, and its source when one exists: docs, a type signature, or a test.>

## Versions

| Package | Version | Commit |
|---|---|---|
| <package> | <latest release> | <pinned upstream commit SHA> |
| typescript | <version>, only for a type-level issue | |

<Optional: one sentence on the root cause with a link to the line at the pinned commit, only when you traced it.>
```

Rules for the text:

- Facts only, with links at the pinned commit. No greeting, no sign-off, no thanks.
- Do not name Taras's app or paste app code. The reproduction stands alone.
- No AI mention.
- No claim of priority or urgency.
