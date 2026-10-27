import { defineConfig } from "/home/om/TAO/Tools/foldkit-worktrees/issue-1628-cold-vite-cache/node_modules/vite/dist/node/index.js"

import { foldkit } from "/home/om/TAO/Tools/foldkit-worktrees/issue-1628-cold-vite-cache/packages/vite-plugin-foldkit/dist/index.js"
import tailwindcss from "/home/om/TAO/Tools/foldkit-worktrees/issue-1628-cold-vite-cache/examples/ssr/node_modules/@tailwindcss/vite/dist/index.mjs"

import { foldkitAliases } from "/home/om/TAO/Tools/foldkit-worktrees/issue-1628-cold-vite-cache/examples/vite.aliases.ts"

export default defineConfig({
  plugins: [
    tailwindcss(),
    foldkit({
      devToolsMcpPort: 9992,
      ssr: {
        serverEntry: '/src/entry.server.ts',
        clientEntry: '/src/entry.ts',
        build: true,
      },
    }),
  ],
  resolve: {
    alias: foldkitAliases("/home/om/TAO/Tools/foldkit-worktrees/issue-1628-cold-vite-cache/examples/ssr"),
  },
  server: {
    fs: {
      allow: ['../../'],
    },
  },
})
