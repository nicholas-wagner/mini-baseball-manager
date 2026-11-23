import { expect, test } from '@playwright/test';

test('Design Lab is hidden by default in production, toggles on 5x "d", and responds to all interactions', async ({
  page,
}) => {
  await page.goto('/');

  // Hidden by default in production; users land directly in Play Ball (Club Creator)
  await expect(page.getByRole('button', { name: /design lab/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /play opening day/i })).toBeVisible();

  // Secret 5x "d" shortcut reveals and opens Design Lab
  for (let i = 0; i < 5; i += 1) {
    await page.keyboard.press('d');
  }

  await expect(page.getByRole('region', { name: /live baseball scoreboard/i })).toBeVisible();
  await expect(page.getByTestId('ballpark-3d-canvas')).toBeVisible();
  await expect(page.getByRole('button', { name: /blazing comet/i })).toBeVisible();

  await page.getByRole('button', { name: /batter ots 3d/i }).click();
  await page.getByRole('button', { name: /bomb-swing hr/i }).click();
  await page.getByRole('button', { name: /roll weighted player/i }).click();
  await page.getByRole('button', { name: /aus.*3%/i }).click();

  // Pressing "d" 5 times again hides Design Lab cleanly
  for (let i = 0; i < 5; i += 1) {
    await page.keyboard.press('d');
  }
  await expect(page.getByRole('button', { name: /design lab/i })).toHaveCount(0);
});
