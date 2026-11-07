// Writes per-use cost fixtures (N Commands) into the given directory.
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
const [dir, nArg] = process.argv.slice(2)
const n = Number(nArg ?? 20)
const ids = Array.from({ length: n }, (_, i) => i)
const common = `import { Context, Effect, Layer, Schema } from 'effect'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'

class Api extends Context.Service<Api, Readonly<{ call: (id: string) => Effect.Effect<boolean> }>>()('PerUse/Api') {}
const Message = defineMessageUnion({
${ids.map(i => `  Clicked${i}: { id: Schema.String },\n  Succeeded${i}: {},\n  Failed${i}: { error: Schema.String },`).join('\n')}
})
const Key = Symbol('PerUse')
const PerUse = Block.make('PerUse', {
  key: Key,
  Model: Schema.Struct({ count: Schema.Number }),
  Message,
  InitArgs: Schema.Tuple([]),
  effects: { services: [Api] },
})
${ids.map(i => `const Do${i} = PerUse.makeCommand('Do${i}', { args: { id: Schema.String }, messages: [Message.Succeeded${i}, Message.Failed${i}] })`).join('\n')}
const Composition = PerUse.makeComposition()
const init = Composition.makeInit(() => ({ model: { count: 0 } }))
const update = Composition.makeUpdate({
${ids.map(i => `  Clicked${i}: (model, { id }) => ({ model, commands: [Do${i}({ id })] }),\n  Succeeded${i}: model => ({ model }),\n  Failed${i}: model => ({ model }),`).join('\n')}
})
export const used = [Layer.empty, init, update] as const
`
const body = i => `const api = yield* Api
      return ({ id }) => api.call(id).pipe(Effect.map(ok => (ok ? Message.Succeeded${i}() : Message.Failed${i}({ error: id }))))`
const toLayer = `
export const layer = PerUse.makeLayer({
  init,
  update,
  EffectsLayer: Layer.mergeAll(
${ids.map(i => `    Do${i}.toLayer(Effect.gen(function* () {\n      ${body(i)}\n    })),`).join('\n')}
  ),
})
`
const handlers = `
export const layer = PerUse.makeLayer({
  init,
  update,
  handlers: {
${ids.map(i => `    Do${i}: function* () {\n      ${body(i)}\n    },`).join('\n')}
  },
})
`
writeFileSync(join(dir, 'none.ts'), common)
writeFileSync(join(dir, 'tolayer.ts'), common + toLayer)
writeFileSync(join(dir, 'handlers.ts'), common + handlers)
for (const name of ['none', 'tolayer', 'handlers']) {
  writeFileSync(join(dir, `tsconfig.${name}.json`), JSON.stringify({
    extends: './tsconfig.json', files: [`${name}.ts`], include: [],
  }, null, 2))
}
