import {expect, test} from '@playwright/test'

test('particle lab renders and supports high-load interactions', async ({page}) => {
  test.setTimeout(90_000)

  const pageErrors: string[] = []
  page.on('pageerror', error => pageErrors.push(error.message))

  await page.goto('/games/particle-lab')

  await expect(page.getByRole('heading', {name: 'GPU 粒子实验室'})).toBeVisible()
  const stage = page.getByTestId('particle-stage')
  await expect(stage).toHaveAttribute('aria-busy', 'false', {timeout: 30_000})
  await expect(stage.locator('canvas.particle-canvas')).toBeVisible()
  await expect(page.getByText('WebGL 2', {exact: true})).toBeVisible()

  await page.getByRole('button', {name: '烟花矩阵'}).click()
  await expect(page.getByText('点击画布，在指定位置引爆烟花', {exact: true})).toBeVisible()
  await stage.click({position: {x: 520, y: 300}})

  await page.getByRole('button', {name: '引力漩涡'}).click()
  await expect(page.getByText('移动指针吸引粒子，按住切换为排斥力', {exact: true})).toBeVisible()
  await stage.hover({position: {x: 460, y: 260}})
  await page.mouse.down()
  await page.mouse.move(620, 360)
  await page.mouse.up()

  await page.getByRole('combobox', {name: 'Open'}).click()
  await page.getByText('100K · 极限', {exact: true}).click()
  await expect(stage).toHaveAttribute('aria-busy', 'false', {timeout: 45_000})
  await expect(page.getByText('100K', {exact: true})).toBeVisible()

  await page.getByRole('button', {name: '暂停'}).click()
  await expect(page.getByText('模拟已暂停', {exact: true})).toBeVisible()
  await expect(page.getByRole('button', {name: '继续'})).toBeVisible()

  await page.screenshot({path: 'test-results/particle-lab.png', fullPage: true})
  expect(pageErrors).toEqual([])
})
