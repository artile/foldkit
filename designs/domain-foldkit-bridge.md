# Design: Domain and Foldkit as one model

Status: draft, not published. Target: `packages/domain/docs/foldkit-design.md` in `alchemy-run/alchemy`, as one PR with the adapter it describes.

## The problem

`@alchemy.run/domain` and Foldkit have the same shape. Both are pure, typed state machines on Effect and Schema:

| Domain (server) | Foldkit (client) |
| --- | --- |
| Command | Message that asks for a change |
| `decide(state, command)` gives events or a Rejection | `update(model, message)` gives a Model and Commands |
| `evolve(state, event)` | the fold that applies a fact to the Model |
| View `events` with a cursor | Subscription that feeds a Submodel |
| Story (given / when / then) | Story and Scene |

Today the two halves meet only at the Api client. Each app writes the bridge by hand. The two Domain guides that show Foldkit, `domain/foldkit.mdx` and `domain/optimistic-updates.mdx`, show how much:

- A Command per Domain command, each with its own `Effect.catch` that turns a typed Rejection into a string (`error._tag`). The Rejection's fields are lost.
- A Subscription per View that restarts `events` from the start on every dependency change and drops `Read.CaughtUp` with `Read.isEvent`. The cursor that the server sends is never kept, so a reconnect replays the whole history, and the page cannot show "live" versus "catching up".
- A pending-line table keyed by `commandId`, written by hand: `ask`, `confirm`, `shownBalance`.
- `commandId` built from a session string and a counter in the Model, written by hand.
- A first paint with no data, because nothing carries `View.snapshot`'s `{ state, cursor }` into Flags.

The guides also teach patterns that Foldkit's own conventions reject: `null` for absence instead of `Option`, `Succeeded` and `Failed` with no Command name, `GotBalance` for a Subscription fact (`Got*` is for child Submodel results), and `{ ...model }` instead of `modifyFields`. A reader who copies them gets an app that the Foldkit lint rules and skills flag.

A throwaway proof of concept with real production aggregates (Foldkit canary of foldkit/foldkit#1655, Domain beta.84, `Domain.InMemory` in the browser, 51 tests, 175 kB gzip) showed that this glue can move into a library: about 25 lines per command down to 1, and about 130 lines per live feed down to 5.

## What Domain already gives

Most of the server side merged on 2026-10-27, in the maintainer's reshaped form:

| Need | API on `main` | PR |
| --- | --- | --- |
| The commands and Rejections of an Api, as values | `MyApi.commands`, `MyApi.rejections` (one Schema union), `Domain.Api.Any`, `CommandsOf`, `RejectionsOf`, `ClientOf` | alchemy#2566 |
| State and cursor from one read | client `snapshot(key, { atLeast? })` gives `Read.Snapshot<S>` = `{ state, cursor: number }`; `list` takes `atLeast`; typed `ConsistencyTimeout` | alchemy#2567 |
| Live reads that carry cursors and mark the end of history | `watch` gives `Read.Snapshot`; `events(key, { after? })` gives entries and `Read.CaughtUp { cursor }`; `Read.isCaughtUp`, `Read.isEvent` | alchemy#2579 (replaced our #2569) |
| Correlation that survives the wire | `Aggregate.Envelope` is a Schema with `commandId` and `correlationId` | alchemy#2565 |
| The aggregate's own rules on the client | `Aggregate.predict(state, command, { id, now, version?, commandId?, context? })` gives `Accepted { events, envelopes, state }`, `Rejected { rejection }`, or `Unpredictable { cause }`; `View.evolve(state, input)` | alchemy#2568 |
| A command call with its own id | `client.DepositMoney(target, input?, { commandId?, headers? })` gives `{ reply, stream, version }` | alchemy#2561 |

The server side needs no new primitive for the first three steps below. Only the trace fixture (step 5) needs Domain work, tracked in alchemy#2570.

## Goals

1. **One line per command.** The app gets a Foldkit Command and its result Messages from the Api, with the Rejection kept as a typed, Schema-encoded value.
2. **One line per live View.** A keyed live feed that resumes from its last cursor after a restart or a reconnect, tells "catching up" from "live", and counts duplicates and gaps.
3. **No spinner on the first paint.** The server's `snapshot` reaches the client through Flags, and the feed resumes from that cursor.
4. **Optimistic UI from the server's rules.** The client predicts with `Aggregate.predict` and `View.evolve`, and confirms by `commandId` from the feed. No second copy of the rules.
5. **Server stories as client fixtures.** A Domain Story run becomes the input of a Foldkit Story.
6. **Foldkit conventions by default.** Generated Messages follow Foldkit naming, absence is `Option`, and the guides pass Foldkit's lint rules.

## Non-goals

- Foldkit never imports Domain. Everything in Foldkit stays a general primitive that any cursor-based backend can use.
- No new wire protocol. The adapter uses the Api client that `Domain.protocolHttp` and `Domain.protocolWebSocket` already give.
- No client-to-server sync engine, no server-side Messages, no capability catalog for agents. Those belong to foldkit-plus (doeixd/foldkit-plus#190) and to alchemy#2589.
- No `Domain.Query` support in the first version. It waits for alchemy#2583.

## Where each piece lives

```
                   Foldkit (general)              Domain adapter                   Domain (server)
                   ─────────────────              ──────────────                   ───────────────
Command result     Command + Messages      ◀──    commands(Api)              ◀──   Api.commands, Api.rejections
Live View          LiveQuery Block         ◀──    liveView(Api, View)        ◀──   events(key, { after }), Read.CaughtUp
First paint        Flags, LiveQuery seed   ◀──    snapshotFlags(View)        ◀──   snapshot(key) → { state, cursor }
Optimistic         Model + update          ◀──    Pending (pure helpers)     ◀──   Aggregate.predict, View.evolve
Tests              Story.messageWith,      ◀──    fromTrace(trace)           ◀──   Story.record (alchemy#2570)
                   Story.Subscription.from
```

Three layers, three owners:

| Layer | Owner | Knows about |
| --- | --- | --- |
| General client primitives | Foldkit | cursors, feeds, pending Commands; not Domain |
| Adapter | `@alchemy.run/domain/foldkit`, with `foldkit` as an optional peer | both |
| Server model | `@alchemy.run/domain` | not Foldkit |

The adapter lives in Alchemy, not in Foldkit, for three reasons:

- Alchemy already couples to Foldkit: it ships `Cloudflare.Website.Foldkit`, a Foldkit guide, and a Foldkit bank example.
- The Domain client surface moves faster than Foldkit's. Six client-facing Domain PRs merged in three days.
- The adapter is small. It maps one library's values onto the other's, and owns no state machine of its own.

## The adapter

The names below are a sketch for review. They follow Foldkit naming rules: Commands are verb-first imperatives, result Messages are `Succeeded*` / `Failed*` because a Rejection is a meaningful failure.

### 1. Commands from the Api

```ts
// packages/web/src/bank.ts
import * as DomainFoldkit from "@alchemy.run/domain/foldkit"
import { CustomerApi } from "@bank/domain/CustomerApi.api"

export const Bank = DomainFoldkit.commands(CustomerApi)
```

For each command in `CustomerApi.commands`, `Bank` has:

| Member | What it is |
| --- | --- |
| `Bank.DepositMoney` | A Foldkit Command definition. Args: `{ target, input, commandId }`. It calls `client.DepositMoney(target, input, { commandId })`. |
| `Bank.Message.SucceededDepositMoney` | `{ commandId, receipt: { stream, version } }`. |
| `Bank.Message.FailedDepositMoney` | `{ commandId, failure: Rejected { rejection } \| Unreachable { message } }`. `rejection` uses `CustomerApi.rejections`, so the Message encodes and decodes, and DevTools and Stories show it with its fields. |
| `Bank.Message` | One `defineMessageUnion` with every result Message, so the app wraps it once in its own Message. |

A transport failure (`RpcClientError`) is `Unreachable`, not a defect, so a lost connection never crashes the app.

`receipt` is the value that `atLeast` takes, so the next read can wait for this write.

`commandId` must be unique and `update` must stay pure. The adapter gives a small Schema value for it:

```ts
const CommandIds = DomainFoldkit.CommandIds // Schema.Struct({ session, sent })
const [commandId, nextCommandIds] = CommandIds.next(model.commandIds)
```

`session` comes from Flags, once per page load.

### 2. Live Views

Foldkit's `LiveQuery` (foldkit/foldkit#1785) is a viewless Block that keeps one feed per Schema key. Each feed has `AsyncData` for the state, a cursor, and a `Connection` (`Connecting`, `Live`, `Offline`, `Failed`). It resumes from its cursor, and counts applied entries, duplicates, and gaps. It knows nothing about Domain. Its source contract is a function from a key and an optional cursor to a stream of entries and catch-up marks.

The adapter gives that source for a View:

```ts
export const Statement = DomainFoldkit.liveView(CustomerApi, "Statement")
```

| Domain gives | LiveQuery gets |
| --- | --- |
| `events(key, { after: cursor })` | the feed's source, called with the feed's own cursor |
| `View.Entry` with `envelope.seq` | an entry with cursor `seq` |
| `Read.CaughtUp { cursor }` | the switch from `Connecting` to `Live` |
| `View.evolve` | the fold from entry to state |

The cursor lives in the Model, not in the socket. When the Subscription restarts (offline, or a dependency change), the feed calls `events` with `after` set to the last cursor it applied. `protocolWebSocket` already resumes inside one live read; this covers the restart between two reads.

### 3. First paint

The server reads `snapshot(key)` and puts `{ state, cursor }` into Flags. `init` seeds the feed with `Ok(state)` and the cursor, and the feed resumes with `after: cursor`. State and cursor come from one read, so no event is lost or applied twice between them.

```ts
export const Flags = Schema.Struct({
  session: Schema.String,
  statement: DomainFoldkit.SnapshotFlags(StatementView),
})
```

The seed uses the same Query seeding as foldkit/foldkit#1745 (`seed` / `setData`), so Query and LiveQuery seed one way.

### 4. Optimistic updates

The app keeps pending commands by `commandId`. The adapter gives pure helpers, not a Submodel:

```ts
const prediction = Account.predict(account, command, { id, now, commandId, context })
const nextPending = DomainFoldkit.Pending.add(model.pending, commandId, prediction)
const shown = DomainFoldkit.Pending.fold(confirmedState, nextPending, AccountSummary)
```

| Event | Effect on `pending` |
| --- | --- |
| `Accepted` prediction | add the predicted envelopes; `fold` applies them with `View.evolve` |
| `Rejected` prediction | show the Rejection, send nothing |
| `Unpredictable` | add with no events; show "waiting" |
| Feed entry with this `commandId` | remove; the confirmed state now has it |
| `FailedDepositMoney` | remove; mark the Rejection |

Confirm from the feed, not from `SucceededDepositMoney`: the event can arrive before the reply. Nothing commits early, so a Rejection needs no rollback.

`predict` needs what the command's middleware provides. The app gives it from a client-side Layer.

Helpers, not a Submodel, because the Optimistic Submodel is the maintainer's own plan (foldkit/foldkit#1474). When it lands, `Pending` becomes its Domain source.

### 5. Server stories as client fixtures

`Story.record` (alchemy#2570) runs a Domain Story and keeps a trace: each command, its outcome, and each View entry with its envelope. `DomainFoldkit.fromTrace(trace)` turns the trace into Foldkit Story steps: `Story.Command.resolve` for each Command result, and `Story.Subscription.from(subscriptions).emit` for each feed entry. Both Foldkit steps ship in the Blocks branch (foldkit/foldkit#1801).

The client test then checks the client against what the server really did, not against a hand-written guess.

## Requirements

1. The adapter imports `foldkit`, `effect`, and `@alchemy.run/domain` only. `foldkit` is an optional peer.
2. Every generated Message is a Schema value, so it survives DevTools, Stories, and hydration.
3. A typed Rejection reaches `update` with its fields. Nothing becomes a string.
4. A transport failure becomes a Message, never a defect.
5. A live feed resumes from its last applied cursor and never applies an entry twice.
6. A first paint from Flags applies no event twice and misses none.
7. The guides compile under Foldkit's lint rules.
8. Each piece has a Story test against `Domain.InMemory` in the browser.

## Changes to the existing guides

`domain/foldkit.mdx` and `domain/optimistic-updates.mdx` get rewritten on the adapter:

| Today | After |
| --- | --- |
| `balance: Schema.NullOr(Schema.Number)` | `Schema.Option(Schema.Number)` |
| `Succeeded`, `Failed { reason: string }` | `SucceededDepositMoney`, `FailedDepositMoney { failure }` |
| `GotBalance` from a Subscription | a fact named for what happened, for example `ReceivedSummary` |
| `{ ...model, error }` | `modifyFields(model, { error: () => ... })` |
| `events` from the start, `Read.isEvent` filter | `liveView`, resumes from the cursor, shows `Live` |
| hand-written `ask` / `confirm` / `shownBalance` | `Pending.add` / `Pending.fold` |

## Foldkit work

| Item | Action |
| --- | --- |
| foldkit/foldkit#1780 `keepPending` | Close. foldkit/foldkit#1801 ships it in `Scene`, and Story's `message` runs while Commands are pending. |
| foldkit/foldkit#1783 `messageWith`, `Subscription.from` | Close. foldkit/foldkit#1801 ships both. |
| foldkit/foldkit#1785 `LiveQuery` | Keep. Retarget to `codex/layers-and-submodels`, rebuild on the #1801 Block API, and split by size: `encodeKey` move (XS), LiveQuery core and tests, guide. Align seeding with #1745. |
| foldkit/foldkit#1800 `AgentContext` | Not part of this bridge. Keep on its own track and answer the review on it. |
| foldkit/foldkit#1776, #1777, #1778, #1779 | Keep open. #1777 is why the adapter generates plain Commands, not Blocks. |
| discussion foldkit/foldkit#1781 | Rewrite the index to point at this design. |

The Foldkit PRs stay separate, not one PR. After the two closures, LiveQuery and AgentContext are unrelated, and one PR would be `size/XL`.

## Alchemy work

One PR from `artile/alchemy` (a personal fork, so the maintainer can push to it):

1. This design as `packages/domain/docs/foldkit-design.md`.
2. `@alchemy.run/domain/foldkit`: steps 1 to 4.
3. The two guides, rewritten on the adapter.
4. The bank web example, moved to the adapter.

Step 5 follows alchemy#2570 in its own PR.

## Alternatives considered

- **The adapter in Foldkit.** Foldkit would depend on Domain. Every Domain client change would need a Foldkit release.
- **The adapter in foldkit-plus (Phase 6 of doeixd/foldkit-plus#190).** It waits on a contract layer that does not exist yet, and it ties Domain users to foldkit-plus. Better: foldkit-plus Remote uses this adapter as its Domain source, so there is one adapter, not two.
- **Generated Blocks, not Commands.** A generic Block factory cannot yield a Service of a type parameter in a Command handler (foldkit/foldkit#1777). Plain Commands and Messages have no such limit.
- **`CompletedDepositMoney` with an outcome field.** It hides the Rejection inside a payload. Foldkit's rule says `Succeeded*` / `Failed*` when failure is meaningful, and a Rejection is.
- **An Optimistic Submodel in the adapter.** It would pre-empt foldkit/foldkit#1474, which is the Foldkit maintainer's plan.

## Open questions

1. Subpath `@alchemy.run/domain/foldkit`, or a separate package `@alchemy.run/domain-foldkit`? A subpath needs no new release train; a package keeps `foldkit` out of Domain's peer list.
2. Generated Message names: `SucceededDepositMoney` / `FailedDepositMoney`, or a prefix the app chooses?
3. Bundle budget for `predict`: the client imports aggregates. The PoC was 175 kB gzip in all. Is a per-aggregate import enough, or does Domain need a client-only entry?
4. Live reads authenticate by cookie only, and push only on Cloudflare (other platforms poll through `protocolHttp`). Does the guide say so, or does the adapter pick the protocol?
5. `commandId` as a DevTools row label needs foldkit/foldkit#1778. Until then, the adapter puts it first in every payload.
