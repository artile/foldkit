# Blocks PoC: #1655 preview, #1858 proposal and #1860, one app on an alchemy Domain

One small app, built three times:

- `a-preview/`: the #1655 preview, `foldkit@0.169.0-canary.90746b32d2ca`.
- `b-sam/`: the API proposed in #1858, on our own thin runtime in `b-sam/blocks/` (951 lines). We wrote it before #1860 existed. It is not Foldkit: it has no Mounts, no SSR, no DevTools and a full re-render on each change.
- `c-1860/`: the same app on #1860 (`foldkit` built from commit `893ddd46d`). This is a separate package, so that one Effect copy loads. It has its own copy of `domain/`.
- `domain/`: one alchemy Domain. It has one `WorkOrder` aggregate, four commands (Open, Approve, AttachPhoto, Close), one `WorkOrderSummary` View, on `Domain.InMemory` from `@alchemy.run/domain@2.0.0-beta.84`.

The app is a "Work orders" screen. A parent `WorkOrdersPage` holds `WorkOrderList`, `Conversation`, `ApprovalPanel` and one viewless `LiveTicker` per open work order. Each `LiveTicker` follows the Domain View with `watch`.

## Run

```sh
bun install
./node_modules/.bin/tsc -p tsconfig.json
npx vitest run

cd c-1860
./pack-1860.sh   # builds foldkit from #1860 into vendor/foldkit-1860.tgz
bun install
./node_modules/.bin/tsc -p tsconfig.json
npx vitest run
```

Each variant has 6 story tests and 1 end-to-end test, and each package has 1 Domain test. The end-to-end test runs the app in happy-dom on the InMemory Domain. It opens a work order, selects it, approves it and waits for the live View update.

#1860 has no public `foldkit/blocks` entry. `c-1860/app/blocks.ts` imports `foldkit/dist/blocks/*` by path. #1860's `Program.make` takes no root args, so the page reads its session from a `Session` service.

## The Domain adapter is a typed stand-in

`@alchemy.run/domain/Foldkit` is on alchemy `main`, but the npm build `2.0.0-beta.84` does not ship it. That build also has no `layerClientInProcess` and no View cursor. `domain/domainCommands.ts` keeps the adapter's shapes: args `{ target, input, commandId }`, results `Succeeded<Name>` with a receipt or `Failed<Name>` with `Rejected | Unknown`. It calls the real Api `testClient` on `InMemory`.

## Numbers

| | (a) #1655 preview | (b) our runtime | (c) #1860 |
| --- | --- | --- | --- |
| Glue lines, app code without views, imports, blanks | 279 | 270 | 264 |
| Distinct framework names in app code, from the list in `scripts/measure.py` | 31 | 14 | 12 |
| Story test, code lines (6 scenarios) | 77 | 80 | 78 |
| Type instantiations (`tsc --extendedDiagnostics`) | 1.90 M | 0.28 M | 0.34 M |
| Domain alone | 0.11 M | 0.11 M | 0.11 M |

`scripts/measure.py` counts the lines and names. The name count depends on its hand-made list. Check time changed by more than 3x between runs on one machine (Apple M1 Max), so this table gives instantiations only. (a) and (c) are both real Foldkit builds; (b) checks less.

## A missing child, service or handler

| Mistake | (a) | (b) | (c) |
| --- | --- | --- | --- |
| Child not wired | Binding left out of `bindings`: 7 errors in 3 files. One is `Argument of type '{ block: AssemblyWithView<...> }' is not assignable to parameter of type 'never'`. No error is at the `bindings` array; the `prepareBlock` error says `Block operations may use only registered child bindings` deep in its detail. | `Type 'Layer<WorkOrdersPage, never, LiveTicker>' is not assignable to type 'Layer<WorkOrdersPage, never, never>'` | `Type 'Layer<WorkOrdersPage, never, LiveTicker>' is not assignable to type 'Layer<WorkOrdersPage, unknown, never>'` |
| Service not provided | `TS2739` at `Runtime.embed`, with `ClientKey<"WorkOrdersApi">` inside a `Pending<...>` type | `Type 'Layer<WorkOrdersPage, never, ClientKey<"WorkOrdersApi">>' is not assignable to ...` | the same message as (b) |
| Command handler missing | `TS2769` at `prepareBlock` and at `Runtime.embed`, with `Handler<"ApprovalPanel/ApproveWorkOrder", ...>` in the requirements | `Property 'commands' is missing` at `ApprovalPanel.make` | `TS2345` at `ApprovalPanel.make`, with `commands` missing deep in its detail |
| Misspelled tag in a spread `on` handler | — | `Parent.on` form: `TS2561`, did you mean `ApprovedWorkOrder` | `...approval.on({ ... })`: `TS2561`, did you mean `ApprovedWorkOrder` |
| Misspelled Model field | — | `TS2561` for `tickrs` in `modifyFields` | `TS2551` inside a spread `on` handler: `Property 'aproval' does not exist`, did you mean `approval` |

Run `./probes/run.sh` and `c-1860/probes/run.sh` to see each error. Each patch in `probes/` and `c-1860/probes/` changes one thing in a copy of the app. `probes/b-missing.ts` leaves out a child Layer and the service. `probes/b-spread-on.ts`, `probes/b-parent-on.ts` and `probes/b-symbol-on.ts` are small standalone type models of the `on` typing; they do not import `b-sam/blocks`.

## Domain command to Block Command

All three variants map a Domain command to a Block Command in the same way. The Block declares the Command with the adapter's args, and the handler maps the adapter's result to the Block's own Messages. The adapter stand-in reads the Api client from context, so in every variant each handler re-provides it with `Effect.provideService(Client, client)`.

## Fresh-agent check

A new subagent with no context got the same task in each variant: "add a PhotosBeforeAfter Block that saves through a Domain command and blocks Close until both rows have a photo". Their diffs are in `agent-check/`. The (a) and (b) diffs apply to commit `50488ed11`, before the approval panel fix.

| | (a) | (b) | (c) |
| --- | --- | --- | --- |
| Tool calls, from the agent's report | 16 | 18 | 24 |
| `tsc` runs / with errors | 5 / 1 | 4 / 1 | 6 / 2 |
| Type errors | TS4104 (`Array.isArrayNonEmpty` on a readonly array) | the same TS4104 | TS4104; TS2375, the page story Layer had no `PhotosBeforeAfterLive`; TS2339, `Message` is on the class, not on the instance type |
| Story tests pass on first run | yes (8 tests) | yes (6 tests) | no: 6 of 7; a page story left an `AttachPhoto` Command unresolved |
| New Block: lines / glue lines / framework names | 214 / 173 / 13 | 181 / 150 / 4 | 161 / 130 / 4 |
| Hardest part, as the agent reported it | `EffectsLayer` is `unknown` for two Commands, Binding declaration order, `toParentMessage` is in `foldkit/test` | `given` merges only at instance boundaries (a limit of our runtime), wiring in 4 places | the missing-Layer error in a story reads as "not assignable to `Scope`"; instance ids (root id in a story, key for `each`); `Program.make` renders nothing without `container.id` |

The coverage of the agents' stories differs. One run per variant does not support a claim about agents in general.

## Notes on (b)

- `Counter('home', args)` is `Counter.instance('home', args)`. JavaScript cannot call an ES class without `new`. #1860 uses `yield* new Counter('home', args)`.
- A Model field is `Counter.Ref`, not `Counter`. In our runtime the class is not a Schema. In #1860 it is a `Schema.declare`.
- `...child.on({ ... })` is `...Parent.on(child, { ... })`. Our runtime keys spread handlers by strings such as `@primary/ReachedMax`, and with that shape TypeScript 7.0.2 types `model` as `unknown` in the spread form. #1860 keys the spread by one symbol (`OnEntry<Model>`), and there the spread form is typed (see the (c) probes).
- `Runtime.run(Block, { container, layer, args })` takes the root args.
- `update` and `view` get their types through `Effect.fn` with no wrapper, in (b) and (c).
- #1858 section 5 (`Output`) is in (b) only; #1860 has no `Output`. (c) reads `model.list.model` in the view instead.
