import { createRequire } from 'node:module'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const worktree = resolve(process.env.FOLDKIT_WORKTREE)
const require = createRequire(`${worktree}/packages/foldkit/package.json`)
export default {
  root: dirname(fileURLToPath(import.meta.url)),
  resolve: {
    alias: {
      effect: require.resolve('effect'),
      vitest: require.resolve('vitest').replace(/index\.cjs$/, 'dist/index.js'),
      '@foldkit-source': `${worktree}/packages/foldkit/src`,
    },
  },
  test: { environment: 'happy-dom', maxWorkers: 2 },
}
