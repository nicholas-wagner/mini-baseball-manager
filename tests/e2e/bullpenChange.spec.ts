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
