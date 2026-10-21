import type { Plugin } from 'vite'

export const recordModuleIds = (moduleIds: Array<string>): Plugin => ({
  name: 'test:record-module-ids',
  buildEnd() {
    moduleIds.push(...this.getModuleIds())
  },
})

export const isFoldkitBuildTokenModuleId = (id: string): boolean =>
  id.endsWith('/foldkit/dist/buildToken.js')
