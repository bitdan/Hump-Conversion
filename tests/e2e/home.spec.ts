import {expect, test} from '@playwright/test'

test('home page exposes tool discovery', async ({page}) => {
  await page.goto('/')

  await expect(page).toHaveTitle(/Tool Hub/)
  await expect(page.getByRole('region', {name: 'Tool Hub'})).toBeVisible()
  await expect(page.getByPlaceholder('搜索菜单...')).toBeVisible()
})

test('specialized tool pages render', async ({page}) => {
  await page.goto('/tools/mcp-tester')
  await expect(page.getByRole('heading', {name: 'SSE MCP Tester'})).toBeVisible()
  await expect(page.getByRole('heading', {name: '事件日志'})).toBeVisible()

  await page.goto('/tools/epub-reader')
  await expect(page.getByRole('heading', {name: 'EPUB 阅读器'})).toBeVisible()
  await expect(page.getByText('选择或拖入 EPUB 文件', {exact: true})).toBeVisible()
})
