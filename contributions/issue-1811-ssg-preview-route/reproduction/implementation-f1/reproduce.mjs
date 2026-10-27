import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { createServer } from 'node:net'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { setTimeout } from 'node:timers/promises'

const artifactDirectory = dirname(fileURLToPath(import.meta.url))
const worktree = resolve(process.argv.at(2) ?? '/home/om/TAO/Tools/foldkit-worktrees/issue-1811-ssg-preview-route')
const cliDirectory = join(worktree, 'packages/create-foldkit-app')
const cliRequire = createRequire(join(cliDirectory, 'package.json'))
const { Effect } = await import(pathToFileURL(cliRequire.resolve('effect')))
const { NodeServices } = await import(pathToFileURL(cliRequire.resolve('@effect/platform-node')))
const { createProject } = await import(pathToFileURL(join(cliDirectory, 'dist/utils/files.js')))
const { Scaffold } = await import(pathToFileURL(join(cliDirectory, 'dist/rendering.js')))
const runDirectory = await mkdtemp(join(artifactDirectory, 'run-'))
const projectDirectory = join(runDirectory, 'ssg-preview')

const run = async (command, args, logName) => {
  const child = spawn(command, args, { cwd: projectDirectory, stdio: ['ignore', 'pipe', 'pipe'] })
  const chunks = []
  child.stdout.on('data', chunk => chunks.push(chunk))
  child.stderr.on('data', chunk => chunks.push(chunk))
  const [code, signal] = await once(child, 'close')
  await writeFile(join(artifactDirectory, logName), Buffer.concat(chunks))
  assert.equal(code, 0, `${command} ${args.join(' ')} failed (${code}, ${signal}); see ${logName}`)
}

let preview
let previewClosed
const previewOutput = []
try {
  await Effect.runPromise(createProject('ssg-preview', projectDirectory, Scaffold.Ssg(), 'pnpm').pipe(Effect.provide(NodeServices.layer)))
  await symlink(join(worktree, 'examples/ssg/node_modules'), join(projectDirectory, 'node_modules'), 'dir')
  await writeFile(join(artifactDirectory, 'generated-package.json'), await readFile(join(projectDirectory, 'package.json')))
  const versions = Object.fromEntries(await Promise.all(['vite', 'effect', 'foldkit', '@foldkit/vite-plugin'].map(async name => {
    const manifest = await realpath(join(worktree, 'examples/ssg/node_modules', name, 'package.json'))
    const { version } = JSON.parse(await readFile(manifest, 'utf8'))
    return [name, { version, manifest }]
  })))
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: worktree, encoding: 'utf8' }).trim()
  await writeFile(join(artifactDirectory, 'environment.json'), JSON.stringify({ commit, node: process.version, platform: process.platform, architecture: process.arch, worktree, dependencies: versions }, null, 2) + '\n')
  await run('pnpm', ['build'], 'scaffold-build.log')
  await mkdir(join(artifactDirectory, 'generated-html'), { recursive: true })
  await writeFile(join(artifactDirectory, 'generated-html/home.html'), await readFile(join(projectDirectory, 'dist/client/index.html')))
  await writeFile(join(artifactDirectory, 'generated-html/about.html'), await readFile(join(projectDirectory, 'dist/client/about/index.html')))

  const listener = createServer()
  listener.listen(0, '127.0.0.1')
  await once(listener, 'listening')
  const { port } = listener.address()
  await new Promise((resolveClose, reject) => listener.close(error => error ? reject(error) : resolveClose()))
  const origin = `http://127.0.0.1:${port}`
  preview = spawn('pnpm', ['preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: projectDirectory, detached: true, stdio: ['ignore', 'pipe', 'pipe'] })
  previewClosed = once(preview, 'close')
  preview.stdout.on('data', chunk => previewOutput.push(chunk))
  preview.stderr.on('data', chunk => previewOutput.push(chunk))

  let isReady = false
  for (const attempt of Array.from({ length: 150 }, (_, index) => index)) {
    try {
      await fetch(origin, { signal: AbortSignal.timeout(500) })
      isReady = true
      break
    } catch {
      assert.equal(preview.exitCode, null, 'preview exited before becoming ready')
      await setTimeout(200)
    }
  }
  assert.ok(isReady, 'preview did not become ready within 30 seconds')

  const results = []
  for (const path of ['/', '/about', '/about/', '/about/index.html', '/about?source=probe', '/about/?source=probe', '/missing', '/about.html']) {
    const response = await fetch(origin + path, { redirect: 'manual' })
    const html = await response.text()
    const title = html.match(/<title>(.*?)<\/title>/s)?.at(1)
    const heading = html.match(/<h1\b[^>]*>(.*?)<\/h1>/s)?.at(1)
    const entry = { method: 'GET', path, status: response.status, location: response.headers.get('location'), title, heading, isAbout: html.includes('Statically generated about page'), isHome: html.includes('Statically generated home') }
    results.push(entry)
    console.log(JSON.stringify(entry))
    const fileName = path === '/' ? 'home' : path.replaceAll(/[^a-zA-Z0-9]/g, '_')
    await writeFile(join(artifactDirectory, `${fileName}.html`), html)
  }
  const head = await fetch(origin + '/about', { method: 'HEAD', redirect: 'manual' })
  results.push({ method: 'HEAD', path: '/about', status: head.status, location: head.headers.get('location'), contentLength: head.headers.get('content-length'), body: await head.text() })
  await writeFile(join(artifactDirectory, 'observed.json'), JSON.stringify(results, null, 2) + '\n')
  const home = results.find(result => result.path === '/')
  const about = results.find(result => result.path === '/about')
  const aboutSlash = results.find(result => result.path === '/about/')
  const aboutIndex = results.find(result => result.path === '/about/index.html')
  assert.ok(home.isHome, 'Home control must serve Home HTML')
  assert.ok(aboutSlash.isAbout, 'Trailing-slash control must serve About HTML')
  assert.ok(aboutIndex.isAbout, 'Explicit-index control must serve About HTML')
  if (about.status >= 300 && about.status < 400 && about.location) {
    const target = new URL(about.location, origin)
    assert.equal(target.origin, origin)
    assert.equal(target.pathname, '/about/')
    const redirected = await fetch(target)
    assert.ok((await redirected.text()).includes('Statically generated about page'), 'Redirect must lead to About HTML')
  } else {
    assert.ok(about.isAbout, 'GET /about must serve About HTML or redirect to /about/; received Home HTML')
  }
} finally {
  if (preview && preview.exitCode === null) {
    process.kill(-preview.pid, 'SIGTERM')
    await previewClosed
  }
  await writeFile(join(artifactDirectory, 'preview.log'), Buffer.concat(previewOutput))
  await rm(runDirectory, { recursive: true, force: true })
}
