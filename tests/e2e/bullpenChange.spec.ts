import { expect, test } from '@playwright/test';

test('a new pitcher takes the field and can deliver the next pitch from the diamond', async ({ page }) => {
  test.slow();
  await page.addInitScript(() => {
    const random = crypto.getRandomValues.bind(crypto);
    crypto.getRandomValues = array => array instanceof Uint32Array && array.length === 1
      ? (array.fill(1994), array) : random(array);
  });
  await page.goto('/');
  await page.getByRole('button', { name: /^Pitch with/ }).click();
  await expect(page.getByRole('region', { name: 'First at-bat' })).toBeVisible();
  await page.getByRole('button', { name: 'More controls' }).click();
  const tactics = page.getByRole('button', { name:'Tactics', exact:true });
  if (await tactics.isVisible()) await tactics.click();
  await page.getByTestId('arcade-bullpen-toggle').click();
  const bringIn = page.getByTestId('arcade-bullpen-bring-in').first();
  const name = (await bringIn.innerText()).match(/Bring In (.+?) \(/)![1];
  await bringIn.click();
  const overlay = page.getByTestId('live-canvas-overlay');
  await expect(overlay.getByRole('status')).toHaveText(`Pitching change · ${name} takes the mound.`);
  await expect(overlay.getByRole('status')).toHaveText(`${name} is ready to pitch.`, { timeout: 10000 });
  const ticker = page.getByTestId('play-by-play-ticker');
  const beforePitch = await ticker.innerText();
  await overlay.getByRole('button', { name: 'Throw next pitch' }).click();
  await expect(ticker).not.toHaveText(beforePitch);
  await expect(ticker).toContainText(/mph/i);
  await expect(overlay.getByRole('button', { name: 'Throw next pitch' })).toHaveCount(0);
});

test('supports 3-mode bullpen switching (Auto / Ask Me / Manual) and Coach Pick inside the bullpen drawer', async ({ page }) => {
  test.slow();
  await page.addInitScript(() => {
    const random = crypto.getRandomValues.bind(crypto);
    crypto.getRandomValues = array => array instanceof Uint32Array && array.length === 1
      ? (array.fill(1994), array) : random(array);
  });
  await page.goto('/');
  await page.getByRole('button', { name: /^Pitch with/ }).click();
  await expect(page.getByRole('region', { name: 'First at-bat' })).toBeVisible();
  await page.getByRole('button', { name: 'More controls' }).click();
  const tactics = page.getByRole('button', { name: 'Tactics', exact: true });
  if (await tactics.isVisible()) await tactics.click();
  await page.getByTestId('arcade-bullpen-toggle').click();

  const drawer = page.getByTestId('arcade-bullpen-drawer');
  await expect(drawer).toBeVisible();
  await expect(drawer).toContainText(/Coach’s Pick/i);

  const switcher = drawer.getByTestId('bullpen-mode-switcher');
  await expect(switcher.getByRole('button', { name: 'Ask Me' })).toHaveAttribute('aria-pressed', 'true');

  await switcher.getByRole('button', { name: 'Auto' }).click();
  await expect(switcher.getByRole('button', { name: 'Auto' })).toHaveAttribute('aria-pressed', 'true');

  await switcher.getByRole('button', { name: 'Manual' }).click();
  await expect(switcher.getByRole('button', { name: 'Manual' })).toHaveAttribute('aria-pressed', 'true');

  // Verify zero horizontal overflow on both desktop & mobile viewports
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(hasOverflow).toBe(false);
});
