# awesome-foldkit rubric

The list must get better as it gets longer. Each candidate gets a score from 0 to 10. The bar for a section goes up with the number of entries in it, so a long section admits only projects that are better than its weaker entries.

## Score

| Part | Points | How to give them |
|---|---|---|
| Foldkit depth | 0 to 3 | 3: Foldkit is the main UI of the project. 2: one app or package of a monorepo is Foldkit, such as a dashboard, client, or webview. 1: only a docs site, landing page, or demo uses Foldkit. 0: only tooling, such as `@foldkit/oxlint-plugin` or `@foldkit/devtools-mcp`. |
| Substance | 0 to 3 | 1 for each: it solves a real problem for real users (a product, a live site, a published package, an organization uses it); the code is not trivial (more than a counter, a todo list, or a generated starter); it does something no listed entry does, or it does it in a clearly different way. |
| Health | 0 to 2 | 1: pushed in the last 180 days. 1: the README says what it is and how to run it, or a live site or docs work. |
| Signal | 0 to 2 | 1: 10 or more stars, or the author has other listed projects that scored 7 or more. 2: 100 or more stars, or an organization known in the Effect or Foldkit community owns it. |

Write the score as the sum and its parts in the reason, for example `7 = depth 3, substance 2, health 2, signal 0`.

## Bar

`bar = 5 + floor(entries in the section / 20)`, never above 8.

| Section entries | Bar |
|---|---|
| 0 to 19 | 5 |
| 20 to 39 | 6 |
| 40 to 59 | 7 |
| 60 or more | 8 |

Sections with `sort = "manual"` (`start`, `core`, `examples`, `community`) are not scored. Add to them only official Foldkit resources and guides from known sources, such as the Cloudflare guide.

## Fast decisions

- Add without a full score: depth 2 or more, and 100 or more stars, and pushed in the last 180 days.
- Reject without a full score: a fork or mirror; a copy of docs, skills, or a vendored folder; a bug reproduction or test repository; a repository that matches the word "foldkit" only; depth 0.

## Duplicates

The list keeps one entry per idea unless the second one teaches something new. Keep both when they differ in one of these:

- Design system or visual language. Several shadcn-style UI kits stay when each follows a different design system or copy-in model.
- Stack around Foldkit, such as another backend, host, database, or sync engine. A starter on Cloudflare with Alchemy and a starter on Fly with Postgres are both useful.
- Architecture, such as SSR against SPA, or a monorepo against a single app.
- Audience, such as a teaching example against a production app.

When two entries do the same thing the same way, the one with the lower score goes to `reject` (a candidate) or is removed (a listed entry).

## Sections

| Section | Put here |
|---|---|
| `apps` | Applications and sites that people use |
| `ai` | Agents, agent tools, and apps for coding agents |
| `interop` | Bridges to other libraries or editors, developer tools with a Foldkit UI |
| `ui` | Component kits, styling, icons |
| `fullstack` | Starters, templates, backends, deploy targets around Foldkit |
| `compare` | Side-by-side builds against other frameworks and migration guides |
