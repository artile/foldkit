import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { writeFile, readFile, copyFile } from 'node:fs/promises'
import { join } from 'node:path'
import { resolveConfig } from '/home/om/TAO/Tools/foldkit-worktrees/issue-1628-cold-vite-cache/node_modules/vite/dist/node/index.js'
const repo = '/home/om/TAO/Tools/foldkit-worktrees/issue-1628-cold-vite-cache'
const artifact = import.meta.dirname
const additions = ['@effect/platform-browser', 'effect/http', 'effect/persistence', '@foldkit/devtools > clsx', 'foldkit > parse5']
const snapshot = config => ({
  aliases: config.resolve.alias,
  plugins: config.plugins.map(plugin => plugin.name).filter(name => name !== 'foldkit:example-client-dependencies'),
  server: { port: config.server.port, fs: config.server.fs },
  ssr: config.ssr,
  environments: Object.fromEntries(Object.entries(config.environments).map(([name, environment]) => [name, { consumer: environment.consumer, resolve: environment.resolve, build: environment.build, optimizeDeps: { ...environment.optimizeDeps, include: environment.optimizeDeps.include.filter(entry => !additions.includes(entry)) } }])),
})
for (const slug of ['api-cache-query', 'counter', 'ui-showcase', 'ssr', 'ssg']) {
  const root = join(repo, 'examples', slug)
  const baseSource = execFileSync('git', ['show', `upstream/main:examples/${slug}/vite.config.ts`], { cwd: repo, encoding: 'utf8' })
    .replaceAll("'../vite.aliases'", JSON.stringify(join(repo, 'examples/vite.aliases.ts')))
    .replaceAll('__dirname', JSON.stringify(root))
    .replaceAll("'@foldkit/vite-plugin'", JSON.stringify(join(repo, 'packages/vite-plugin-foldkit/dist/index.js')))
    .replaceAll("'@tailwindcss/vite'", JSON.stringify(join(root, 'node_modules/@tailwindcss/vite/dist/index.mjs')))
    .replaceAll("'vite'", JSON.stringify(join(repo, 'node_modules/vite/dist/node/index.js')))
  const baseFile = join(artifact, `implementation-base-${slug}.config.ts`)
  await writeFile(baseFile, baseSource)
  for (const command of ['serve', 'build']) {
    const base = await resolveConfig({ root, configFile: baseFile }, command)
    const fixed = await resolveConfig({ root, configFile: join(root, 'vite.config.ts') }, command)
    assert.deepEqual(JSON.parse(JSON.stringify(snapshot(fixed))), JSON.parse(JSON.stringify(snapshot(base))), `${slug} ${command} config preservation`)
    await writeFile(join(artifact, `implementation-config-${slug}-${command}.json`), JSON.stringify({ base: snapshot(base), fixed: snapshot(fixed), clientIncludes: fixed.environments.client.optimizeDeps.include }, null, 2))
  }
  console.log(`${slug}: serve/build snapshots agree except the five client declarations`)
}
for (const slug of ['api-cache-query', 'counter', 'ui-showcase']) {
  const metadataPath = join(repo, 'examples', slug, 'node_modules/.vite/deps/_metadata.json')
  try {
    const metadata = JSON.parse(await readFile(metadataPath, 'utf8'))
    for (const entry of additions) {
      const key = entry.split(' > ').at(-1)
      assert.ok(metadata.optimized[key] ?? metadata.optimized[entry], `metadata ${slug} ${entry}`)
    }
    assert.ok(!Object.keys(metadata.optimized).some(key => /^(foldkit|@foldkit\/devtools)(\/[^ >]+)*$/.test(key)))
    await copyFile(metadataPath, join(artifact, `implementation-metadata-${slug}.json`))
    console.log(`${slug}: five optimized third-party entries, no Foldkit/DevTools owner`)
  } catch (error) {
    if (error.code !== 'ENOENT') { throw error }
  }
}
