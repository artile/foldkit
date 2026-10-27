import { test, expect } from '/home/om/TAO/Tools/foldkit-worktrees/issue-1628-cold-vite-cache/node_modules/.pnpm/@playwright+test@1.63.0/node_modules/@playwright/test/index.mjs'
import { readFile, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'

const root = '/home/om/TAO/Tools/foldkit-worktrees/issue-1628-cold-vite-cache'
const source = `${root}/packages/ui/src/button/index.ts`
test('linked button source reload preserves the Counter Model and restores exact bytes', async ({ page }, testInfo) => {
  expect(process.env.EXAMPLE_SLUG).toBe('counter')
  expect(execFileSync('git', ['status', '--porcelain=v1', '--', 'packages/ui/src/button/index.ts'], { cwd: root, encoding: 'utf8' })).toBe('')
  const original = await readFile(source)
  await writeFile(testInfo.outputPath('original-button.ts'), original)
  const text = original.toString('utf8')
  expect(text.split('h.Tabindex(0),').length - 1).toBe(1)
  await page.goto('/')
  const button = page.getByRole('button', { name: '+', exact: true })
  await button.click()
  await expect(page).toHaveTitle(/Counter: 1/)
  await expect(button).toHaveAttribute('tabindex', '0')
  try {
    await writeFile(source, text.replace('h.Tabindex(0),', 'h.Tabindex(1),'))
    await expect(button).toHaveAttribute('tabindex', '1')
    await expect(page).toHaveTitle(/Counter: 1/)
    await expect(page.locator('#foldkit-devtools')).toBeAttached()
  } finally {
    await writeFile(source, original)
    expect(await readFile(source)).toEqual(original)
    await expect(button).toHaveAttribute('tabindex', '0')
    await expect(page).toHaveTitle(/Counter: 1/)
    execFileSync('git', ['diff', '--exit-code', '--', 'packages/ui/src/button/index.ts'], { cwd: root })
  }
})
