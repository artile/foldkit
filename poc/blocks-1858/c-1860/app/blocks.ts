// NOTE: #1860 has no public `foldkit/blocks` entry, so this file imports its build by path.
export { Block, deliver } from '../node_modules/foldkit/dist/blocks/block.js'
export * as Program from '../node_modules/foldkit/dist/blocks/program.js'
export { scene, story } from '../node_modules/foldkit/dist/blocks/testing.js'
