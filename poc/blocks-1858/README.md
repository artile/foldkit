# Blocks PoC: #1858 proposal and #1655 preview, one app on an alchemy Domain

One small app, built twice:

- `a-preview/`: the #1655 preview, `foldkit@0.169.0-canary.90746b32d2ca`.
- `b-sam/`: the API proposed in #1858, on a thin runtime in `b-sam/blocks/` (951 lines). It is not Foldkit. It has no Mounts, no SSR, no DevTools and a full re-render on each change.
- `domain/`: one alchemy Domain, shared by both. It has one `WorkOrder` aggregate, four commands (Open, Approve, AttachPhoto, Close), one `WorkOrderSummary` View, on `Domain.InMemory` from `@alchemy.run/domain@2.0.0-beta.84`.

The app is a "Work orders" screen. A parent `WorkOrdersPage` holds `WorkOrderList`, `Conversation`, `ApprovalPanel` and one viewless `LiveTicker` per open work order. Each `LiveTicker` follows the Domain View with `watch`.

## Run

```sh
bun install
./node_modules/.bin/tsc -p tsconfig.json
npx vitest run
```

There are 13 tests: 1 Domain test, and in each variant 5 story tests plus 1 end-to-end test. The end-to-end test runs the app in happy-dom on the InMemory Domain. It opens a work order, selects it, approves it and waits for the live View update.

## The Domain adapter is a typed stand-in

`@alchemy.run/domain/Foldkit` is on alchemy `main`, but the npm build `2.0.0-beta.84` does not ship it. That build also has no `layerClientInProcess` and no View cursor. `domain/domainCommands.ts` keeps the adapter's shapes: args `{ target, input, commandId }`, results `Succeeded<Name>` with a receipt or `Failed<Name>` with `Rejected | Unknown`. It calls the real Api `testClient` on `InMemory`.

## Numbers

| | (a) #1655 preview | (b) #1858 proposal |
| --- | --- | --- |
| Glue lines, app code without views, imports, blanks | 279 | 270 |
| Distinct framework names in app code, from the list in `scripts/measure.py` | 31 | 16 |
| Story test, code lines (5 scenarios) | 69 | 71 |
| Type instantiations (`tsc --extendedDiagnostics`) | 1.90 M | 0.28 M |
| Domain alone | 0.11 M | same |

`scripts/measure.py` counts the lines and names. The name count depends on its hand-made list. Check time changed by more than 3x between runs on one machine (Apple M1 Max), so this table gives instantiations only. The type cost of (b) is low partly because its runtime checks less, so that row does not compare two complete implementations.

## A missing child, service or handler

| Mistake | (a) | (b) |
| --- | --- | --- |
| Child not wired | Binding left out of `bindings`: 7 errors in 3 files. One is `Argument of type '{ block: AssemblyWithView<...> }' is not assignable to parameter of type 'never'`. No error points at `bindings`. | `LiveTickerLive` not provided: `Type 'Layer<WorkOrdersPage, never, LiveTicker>' is not assignable to type 'Layer<WorkOrdersPage, never, never>'`. |
| Service not provided | `TS2739` at `Runtime.embed`, with `ClientKey<"WorkOrdersApi">` inside a `Pending<...>` type. | `Type 'ClientKey<"WorkOrdersApi"> \| LiveTicker' is not assignable to type 'never'`. |
| Command handler missing | `TS2769` at `prepareBlock` and at `Runtime.embed`, with `Handler<"ApprovalPanel/ApproveWorkOrder", ...>` in the requirements. | `Property 'commands' is missing` at `ApprovalPanel.make`. |

Run `./probes/run.sh` to see each error. The (a) probes are patches in `probes/a-*.patch`, the (b) probe is `probes/b-missing.ts`, and `probes/b-spread-on.ts` and `probes/b-parent-on.ts` show the `on` typing below.

## Domain command to Block Command

Both variants map a Domain command to a Block Command in the same way. The Block declares the Command with the adapter's args, and the handler maps the adapter's result to the Block's own Messages. The adapter stand-in reads the Api client from context, so in both variants each handler re-provides it with `Effect.provideService(Client, client)`.

## Fresh-agent check

Two new subagents with no context got the same task in each variant: "add a PhotosBeforeAfter Block that saves through a Domain command and blocks Close until both rows have a photo". Their diffs are in `agent-check/`. They apply to commit `50488ed11`, before the approval panel fix.

| | (a) | (b) |
| --- | --- | --- |
| Tool calls, from the agent's report | 16 | 18 |
| `tsc` runs / with errors | 5 / 1 | 4 / 1 |
| Type errors | TS4104 (`Array.isArrayNonEmpty` on a readonly array) | the same TS4104 |
| Story tests pass on first run | yes (8 tests) | yes (6 tests, other coverage) |
| New Block: lines / glue lines / framework names | 214 / 173 / 14 | 181 / 150 / 6 |
| Hardest part, as the agent reported it | `EffectsLayer` is `unknown` for two Commands, Binding declaration order, `toParentMessage` is in `foldkit/test` | `given` merges only at instance boundaries (a limit of this runtime), wiring in 4 places |

One run per variant does not support a claim about agents in general.

## Changes from the #1858 text

- `Counter('home', args)` is `Counter.instance('home', args)`. JavaScript cannot call an ES class without `new`.
- A Model field is `Counter.Ref`, not `Counter`. In this runtime the class is not a Schema.
- `...child.on({ ... })` is `...Parent.on(child, { ... })`. In TypeScript 7.0.2 the handler's `model` is `unknown` in the spread form, because the parent's Model type does not flow into a generic call inside a spread. When the parent class owns `on`, the handlers are typed and a misspelled tag is an excess-property error.
- `Runtime.run(Block, { container, layer, args })` takes the root args.
- `update` and `view` get their types through `Effect.fn` with no wrapper (open question 1). A misspelled field inside a handler is a type error.
