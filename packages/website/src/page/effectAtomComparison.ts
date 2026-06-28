import { Html, html } from 'foldkit/html'

import type { TableOfContentsEntry } from '../main'
import type { Message } from '../message'
import {
  infoCallout,
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../prose'
import {
  aiOverviewRouter,
  coreCommandsRouter,
  coreDevToolsRouter,
  coreMessagesRouter,
  coreModelRouter,
  coreSubmodelRouter,
  coreSubscriptionsRouter,
  coreUpdateRouter,
  reactComparisonRouter,
  whyNoJsxRouter,
} from '../route'
import * as Snippet from '../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../view/codeBlock'
import { comparisonTable } from '../view/table'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const sharedFoundationHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'shared-foundation',
  text: 'The Shared Foundation',
}

const atomsVsModelHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'atoms-vs-one-model',
  text: 'Atoms vs One Model',
}

const howStateChangesHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'how-state-changes',
  text: 'How State Changes',
}

const atomStateHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'atom-state',
  text: 'Effect Atom: setters scattered across components',
}

const foldkitStateHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'foldkit-state',
  text: 'Foldkit: one Message union, one update',
}

const asyncStateHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'async-state',
  text: 'Async State',
}

const atomAsyncHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'atom-async',
  text: 'Effect Atom: the Result type',
}

const foldkitAsyncHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'foldkit-async',
  text: 'Foldkit: remote state in the Model',
}

const sideEffectsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'side-effects-and-lifecycle',
  text: 'Side Effects and Lifecycle',
}

const atomEffectHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'atom-effect',
  text: 'Effect Atom: effects live inside atoms',
}

const foldkitEffectHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'foldkit-effect',
  text: 'Foldkit: Commands and Subscriptions',
}

const viewLayerHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'the-view-layer',
  text: 'The View Layer Is Still React',
}

const atomViewHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'atom-view',
  text: 'Effect Atom plus React',
}

const foldkitViewHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'foldkit-view',
  text: 'Foldkit',
}

const timelineHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'one-timeline-vs-many-cells',
  text: 'One Timeline vs Many Cells',
}

const scalingHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'scaling-complexity',
  text: 'Scaling Complexity',
}

const aiHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'ai-assisted-development',
  text: 'AI-Assisted Development',
}

const whereAtomWinsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'where-effect-atom-wins',
  text: 'Where React + Effect Atom Wins',
}

const conclusionHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'conclusion',
  text: 'Conclusion',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  sharedFoundationHeader,
  atomsVsModelHeader,
  howStateChangesHeader,
  atomStateHeader,
  foldkitStateHeader,
  asyncStateHeader,
  atomAsyncHeader,
  foldkitAsyncHeader,
  sideEffectsHeader,
  atomEffectHeader,
  foldkitEffectHeader,
  viewLayerHeader,
  atomViewHeader,
  foldkitViewHeader,
  timelineHeader,
  scalingHeader,
  aiHeader,
  whereAtomWinsHeader,
  conclusionHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      pageTitle(
        'foldkit-vs-react-effect-atom',
        'Foldkit vs React + Effect Atom',
      ),

      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'If you reach for ',
        link('https://github.com/tim-smart/effect-atom', 'Effect Atom'),
        ' with React, you have already made the decision most of the web has not: side effects are values, errors are typed, and your state layer speaks Effect. This page is not an argument for that decision. You have made it, and it is a good one. It is an argument about the layer above it: where state lives, how it changes, and what your tools can see.',
      ),
      para(
        'Foldkit and React + Effect Atom share a foundation and diverge on architecture. Effect Atom is a reactive, atomic state system: many small cells, each its own source of truth, wired into the React component tree by reference. Foldkit is the Elm Architecture in TypeScript: one Model, one Message union, one update function, side effects returned as data. Both are Effect all the way down. They disagree about how many places state should live.',
      ),
      para(
        'Foldkit does not beat React + Effect Atom across the board, and this page will not pretend it does. Each has advantages. Foldkit pulls ahead when correctness, DX, scaling complexity, and AI-assisted development are the priorities. React + Effect Atom pulls ahead on ecosystem, incremental adoption, and a batteries-included data layer. The page makes the first case concretely, then spends a full section making the second, so you can decide by your own priorities rather than a sales pitch.',
      ),
      infoCallout(
        'Two related pages',
        'This page assumes you are sold on Effect. If you are coming from plain React, the ',
        link(reactComparisonRouter(), 'Foldkit vs React'),
        ' comparison makes the broader case for this style of architecture. And since the readability of Foldkit’s view DSL is the usual first objection, ',
        link(whyNoJsxRouter(), 'Why no JSX?'),
        ' answers it directly.',
      ),

      tableOfContentsEntryToHeader(sharedFoundationHeader),
      para(
        'It is worth being precise about how much these two approaches agree, because the disagreement is narrower and sharper than it first looks. Both model side effects as Effect values rather than imperative calls. Both get typed errors in the type signature, not thrown exceptions. Both lean on Schema for validation at the boundary. Both inherit structured concurrency, interruption, and the Effect runtime. If you like Effect, you will find a lot to like in either.',
      ),
      para(
        'So this is not Foldkit versus untyped, effectful-by-accident React state. It is two Effect-native designs that answer one question differently: should state be a field of cells you subscribe to, or a single value you transform? Everything below follows from that one fork.',
      ),

      tableOfContentsEntryToHeader(atomsVsModelHeader),
      para(
        'An atom is a reactive container for one value. You create it with ',
        inlineCode('Atom.make'),
        ', read it with ',
        inlineCode('useAtomValue'),
        ', write it with ',
        inlineCode('useAtomSet'),
        ', and derive new atoms from old ones with ',
        inlineCode('get'),
        '. The registry tracks dependencies between atoms and re-renders exactly the components that read a changed atom. It is a genuinely elegant model, and the fine-grained reactivity is a real strength we will come back to.',
      ),
      para(
        'The consequence is that state is distributed by design. Ten features mean a spread of atoms, each its own source of truth, each writable from any component that imports it. There is no single value that is “the state of the app,” and no single place that enumerates how it can change. That is not a flaw in Effect Atom; it is the atomic model working as intended, the same way ',
        link('https://jotai.org', 'Jotai'),
        ' and Recoil work.',
      ),
      para(
        'Foldkit makes the opposite choice. The ',
        link(coreModelRouter(), 'Model'),
        ' is one value. The ',
        link(coreMessagesRouter(), 'Message'),
        ' union is the only way to change it. The ',
        link(coreUpdateRouter(), 'update'),
        ' function is the only place it changes. Those three facts are framework constraints, not conventions you maintain by discipline. Everything Foldkit claims downstream (a complete index of state transitions, a single replayable timeline, tests with nothing to mock) falls out of that one constraint. The rest of this page is that constraint, viewed from different angles.',
      ),

      tableOfContentsEntryToHeader(howStateChangesHeader),
      para(
        'Start with the most common operation in any app: changing state. The difference shows up immediately, and it is the difference everything else rests on.',
      ),
      tableOfContentsEntryToHeader(atomStateHeader),
      para(
        'With Effect Atom, a write is a setter from ',
        inlineCode('useAtomSet'),
        ', usually called with an inline updater function. The transition is whatever closure you pass, defined wherever the button lives.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.atomCompareAtomStateHighlighted),
          ],
          [],
        ),
        Snippet.atomCompareAtomStateRaw,
        'Copy Effect Atom state',
        copiedSnippets,
        'mb-4',
      ),
      para(
        'Each transition is an anonymous function: ',
        inlineCode('(todos) => [...todos, emptyTodo()]'),
        ' in one component, ',
        inlineCode('(todos) => todos.filter(...)'),
        ' in another. They are correct and readable in isolation. But there is no name for “add a todo,” no value that represents it, and no one place that lists every way ',
        inlineCode('todosAtom'),
        ' can change. To answer that, you grep for ',
        inlineCode('useAtomSet(todosAtom)'),
        ' and read the closures at each call site.',
      ),
      tableOfContentsEntryToHeader(foldkitStateHeader),
      para(
        'In Foldkit the same three transitions are three Messages, handled in one update function. The Message union is the complete catalog; ',
        inlineCode('M.tagsExhaustive'),
        ' makes a forgotten case a compile error.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.atomCompareFoldkitStateHighlighted),
          ],
          [],
        ),
        Snippet.atomCompareFoldkitStateRaw,
        'Copy Foldkit state',
        copiedSnippets,
        'mb-6',
      ),
      para(
        inlineCode('AddedTodo'),
        ', ',
        inlineCode('ClearedDoneTodos'),
        ', and ',
        inlineCode('SelectedFilter'),
        ' are facts with names. They flow through one function, show up in DevTools, and replay in tests. The cost is real: more ceremony than an inline setter for a three-line app. The payoff is that “how can the todo list change?” has a single, total answer, and it scales: the hundredth Message is found the same way as the first.',
      ),

      tableOfContentsEntryToHeader(asyncStateHeader),
      para(
        'Async state is where Effect Atom is at its best, so this is the section where Foldkit gives ground.',
      ),
      tableOfContentsEntryToHeader(atomAsyncHeader),
      para(
        'Hand ',
        inlineCode('Atom.make'),
        ' an Effect and you get back an atom whose value is a ',
        inlineCode('Result'),
        ': ',
        inlineCode('Initial'),
        ', ',
        inlineCode('Success'),
        ', or ',
        inlineCode('Failure'),
        ', each carrying a ',
        inlineCode('waiting'),
        ' flag for in-flight refreshes. The runtime runs the Effect, caches the Result, tracks dependencies, and re-runs on refresh. ',
        inlineCode('Result.builder'),
        ' renders each state.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.atomCompareAtomAsyncHighlighted),
          ],
          [],
        ),
        Snippet.atomCompareAtomAsyncRaw,
        'Copy Effect Atom async',
        copiedSnippets,
        'mb-4',
      ),
      para(
        'This is excellent, and it is fair to say Foldkit ships nothing as turnkey. Loading, error, stale-while-revalidate, retries, and Suspense integration are handled for you. With ',
        inlineCode('Atom.family'),
        ', ',
        inlineCode('Atom.runtime'),
        ' for Layer-provided services, and helpers like ',
        inlineCode('AtomHttpApi'),
        ' and ',
        inlineCode('AtomRpc'),
        ', Effect Atom is a serious data-fetching layer, not just a state primitive.',
      ),
      tableOfContentsEntryToHeader(foldkitAsyncHeader),
      para(
        'Foldkit has no built-in async atom. You model the remote state as a value in the Model, fire a ',
        link(coreCommandsRouter(), 'Command'),
        ', and fold its result back through update as a Message.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.atomCompareFoldkitAsyncHighlighted),
          ],
          [],
        ),
        Snippet.atomCompareFoldkitAsyncRaw,
        'Copy Foldkit async',
        copiedSnippets,
        'mb-6',
      ),
      para(
        'This is more code, and the comparison should not pretend otherwise. What you buy for it is that the loading state is an ordinary field of the one Model, the fetch is a named Command you can assert on, and the transitions (',
        inlineCode('ClickedLoadUser'),
        ', ',
        inlineCode('SucceededLoadUser'),
        ', ',
        inlineCode('FailedLoadUser'),
        ') are the same kind of fact as every other change in the app. Effect Atom’s Result lives in the registry, reactive but off to the side. Foldkit’s lives in the Model, so it time-travels, serializes, and tests like anything else. Convenience versus uniformity. For a dashboard of independent queries, Effect Atom’s convenience usually wins. For state that interacts with the rest of the app, the uniformity compounds.',
      ),

      tableOfContentsEntryToHeader(sideEffectsHeader),
      para(
        'Both libraries keep effects inside Effect, which already puts them far ahead of ',
        inlineCode('useEffect'),
        ' soup. The difference is where an effect is declared and how you find all of them.',
      ),
      tableOfContentsEntryToHeader(atomEffectHeader),
      para(
        'In Effect Atom, an effect lives inside the atom that produces it. A mutation is a function atom from ',
        inlineCode('runtime.fn'),
        ', often tagged with ',
        inlineCode('reactivityKeys'),
        ' so that finishing it invalidates the atoms that depend on those keys. A subscription to the outside world is an atom that wires a listener in its body and tears it down with ',
        inlineCode('addFinalizer'),
        ', kept alive by ',
        inlineCode('useAtomMount'),
        '.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.atomCompareAtomEffectHighlighted),
          ],
          [],
        ),
        Snippet.atomCompareAtomEffectRaw,
        'Copy Effect Atom effects',
        copiedSnippets,
        'mb-4',
      ),
      para(
        'Each piece is well-built. But the inventory is distributed: to list every effect the app can perform, you read every atom, because any atom may run one. And the connection between “this changed” and “that refreshed” is the ',
        inlineCode('reactivityKeys'),
        ' string array, matched by value, which the compiler does not check. It is a far better version of a dependency array, but it is still a dependency array.',
      ),
      tableOfContentsEntryToHeader(foldkitEffectHeader),
      para(
        'Foldkit splits effects by what causes them. A ',
        link(coreCommandsRouter(), 'Command'),
        ' is an effect caused by a Message, returned from update as data. A ',
        link(coreSubscriptionsRouter(), 'Subscription'),
        ' is an external event stream whose lifecycle is derived from the Model, so the runtime subscribes and unsubscribes for you with no cleanup function to forget.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.atomCompareFoldkitEffectHighlighted),
          ],
          [],
        ),
        Snippet.atomCompareFoldkitEffectRaw,
        'Copy Foldkit effects',
        copiedSnippets,
        'mb-6',
      ),
      para(
        'The win is locational. Every Command is declared in one place and returned from update; every Subscription is declared in one place and gated on the Model. “What can this app do to the outside world?” is two files, not a sweep of every atom. And the ',
        inlineCode('mouseRelease'),
        ' Subscription never goes stale, because the runtime calls it with the current Model on every change. There is no closure captured at mount waiting to read an old value.',
      ),

      tableOfContentsEntryToHeader(viewLayerHeader),
      para(
        'Here is the part Effect Atom does not change: your views are React components. Effect Atom moves state and effects into Effect, which is most of the battle. The view layer it leaves exactly where it found it, with the hooks rules, the render model, and the closure traps intact.',
      ),
      tableOfContentsEntryToHeader(atomViewHeader),
      para(
        'A list item that toggles a todo still needs ',
        inlineCode('memo'),
        ' to avoid re-rendering, ',
        inlineCode('useCallback'),
        ' to keep its handler reference stable, and a dependency array you have to get right.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.atomCompareAtomViewHighlighted),
          ],
          [],
        ),
        Snippet.atomCompareAtomViewRaw,
        'Copy Effect Atom view',
        copiedSnippets,
        'mb-4',
      ),
      para(
        'Atom-level subscriptions mean Effect Atom often needs less of this than a ',
        inlineCode('useReducer'),
        ' app, which is a genuine advantage. But the machinery is still there: the stale-closure class of bug, the rules of hooks, the memoization you maintain by hand. Forget the dependency and the handler captures an old ',
        inlineCode('todo.id'),
        '; no type error flags it.',
      ),
      tableOfContentsEntryToHeader(foldkitViewHeader),
      para(
        'The same item in Foldkit is a plain function returning data. The event is a Message value, not a closure, so there is nothing to stabilize and nothing to memoize at the boundary.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.atomCompareFoldkitViewHighlighted),
          ],
          [],
        ),
        Snippet.atomCompareFoldkitViewRaw,
        'Copy Foldkit view',
        copiedSnippets,
        'mb-6',
      ),
      para(
        'No ',
        inlineCode('memo'),
        ', no ',
        inlineCode('useCallback'),
        ', no dependency array, no hooks rules. The runtime handles memoization from the data at the boundary, and because the view always receives the current Model, there is no closure to go stale. This is the cost of admission you weigh against React’s ecosystem: you trade JSX and the component library universe for a view model with an entire class of bugs designed out. Whether that trade is worth it is exactly what ',
        link(whyNoJsxRouter(), 'Why no JSX?'),
        ' is about.',
      ),

      tableOfContentsEntryToHeader(timelineHeader),
      para(
        'Because every Foldkit state change is one Message through one function, the app has a single timeline: an ordered sequence of Messages, the Model snapshot after each, and the Commands each produced. ',
        link(coreDevToolsRouter(), 'Foldkit DevTools'),
        ' replays that timeline. You scrub backward and watch the exact Model the app passed through, including the internals of shipped UI components, because ',
        link(coreSubmodelRouter(), 'Submodels'),
        ' live in the Model too.',
      ),
      para(
        'Effect Atom’s state is many cells in a registry. Each cell has a current value and can be inspected, and there are good devtools for doing so. What there is not is a single ordered log of named events for the whole app, because there are no named events and no single owner of order. You can see what every atom holds now. You cannot replay the app as one sequence of facts, because the facts were anonymous closures distributed across components. This is the same property from the state section, viewed through the debugger.',
      ),

      tableOfContentsEntryToHeader(scalingHeader),
      para(
        'Both models scale; they accumulate different things. An Effect Atom app grows a dependency graph of atoms plus a set of ',
        inlineCode('reactivityKeys'),
        ' that wire mutations to refreshes. Each atom is simple, and adding one is cheap. What grows is the implicit graph: which atoms depend on which, which keys invalidate which, which writers touch a shared atom. It is a real coordination surface, and like any dependency-array mechanism, the compiler cannot verify the keys line up.',
      ),
      para(
        'A Foldkit app grows by adding Messages, Commands, and Subscriptions to structures that already exist. The hundredth Message is handled in the same update function as the first, found by the same exhaustive match, replayed in the same DevTools. The ceiling on a single update function is real and you split it with ',
        link(coreSubmodelRouter(), 'Submodels'),
        ', each its own little Model, Message union, and update. The point is not that Foldkit has no growth cost. It is that the cost is uniform: more of structures you already understand, indexed by types that fail the build when you miss a case.',
      ),

      tableOfContentsEntryToHeader(aiHeader),
      para(
        'This one is newly load-bearing, and it favors Foldkit for a structural reason. A coding agent is at its best when the code has one shape and the types narrow the search. Foldkit is almost aggressively uniform: state changes are Messages, the input domain is the Message union, side effects are Commands, the transitions are one exhaustive function. An agent asked to add a feature reads the Message union to learn every event that exists, adds a variant, and ',
        inlineCode('M.tagsExhaustive'),
        ' turns every place that now must handle it into a compile error. The type system hands the agent its to-do list.',
      ),
      para(
        'An Effect Atom app gives an agent a harder map. State lives in atoms across many files; transitions are inline closures at call sites; effects are inside atoms; the dependency graph and the ',
        inlineCode('reactivityKeys'),
        ' are implicit. To change behavior safely, the agent has to reconstruct that graph from reads scattered across the codebase, and nothing fails the build when it misses a writer or a key. The same property that makes the architecture legible to a new human teammate (one place state changes, exhaustiveness as a checklist) is what makes it legible to a model. Foldkit ships ',
        link(aiOverviewRouter(), 'skills and an MCP server'),
        ' that lean directly on this uniformity.',
      ),

      tableOfContentsEntryToHeader(whereAtomWinsHeader),
      para(
        'A comparison that only lists the author’s wins is marketing. Here, plainly, is where React + Effect Atom is the better choice, and these are not small.',
      ),
      comparisonTable(
        ['', 'React + Effect Atom', 'Foldkit'],
        [
          [
            ['Ecosystem'],
            ['The entire React component and tooling universe'],
            ['Young; you build or wrap what you need'],
          ],
          [
            ['Incremental adoption'],
            ['Add one atom to an existing React app'],
            ['All-in: it owns the whole app'],
          ],
          [
            ['Data fetching'],
            ['Batteries included: Result, SWR, Suspense, HTTP/RPC'],
            ['Model it yourself with Commands and a Model field'],
          ],
          [
            ['Fine-grained reactivity'],
            ['Only the components reading a changed atom re-render'],
            ['Top-down render with runtime memoization'],
          ],
          [
            ['View familiarity'],
            ['JSX and the patterns every React dev knows'],
            ['A typed function-call DSL to learn'],
          ],
          [
            ['Reach'],
            ['Also targets Vue and Solid'],
            ['Its own runtime, web only'],
          ],
        ],
      ),
      para(
        'If you have an existing React codebase, a team fluent in JSX, or a data-heavy app that lives or dies on query ergonomics, React + Effect Atom is very likely the right tool, and you should use it without apology. Incremental adoption alone is decisive for most real migrations: you cannot sprinkle Foldkit into a React app, but you can add a single atom this afternoon.',
      ),

      tableOfContentsEntryToHeader(conclusionHeader),
      para(
        'Both designs are Effect-native and both are good. They differ on one axis: Effect Atom distributes state across reactive cells wired into React, optimizing for incremental adoption, fine-grained updates, and turnkey data fetching. Foldkit centralizes state into one Model changed by one update function, optimizing for a complete index of state transitions, a single replayable timeline, tests with nothing to mock, and a shape that humans and coding agents can hold in their heads.',
      ),
      para(
        'So choose by priority, not by tribe. If correctness guarantees, debugging by replay, uniform scaling, and AI-assisted development are what keep you up at night, Foldkit is built for exactly those. If ecosystem reach, dropping into an existing React app, and best-in-class data fetching matter more, React + Effect Atom is the better fit, and you keep the Effect foundation either way. The real answer to “which is better?” is “for what?”, and now you have the axes to answer it for yourself.',
      ),
    ],
  )
}
