import { expect, test } from '@playwright/test';

test('Design Lab renders 3D ballpark, retro baseball cards, and responds to interactions', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('region', { name: /live baseball scoreboard/i })).toBeVisible();
  await expect(page.getByTestId('ballpark-3d-canvas')).toBeVisible();
  await expect(page.getByRole('button', { name: /blazing comet/i })).toBeVisible();

  await page.getByRole('button', { name: /batter ots 3d/i }).click();
  await page.getByRole('button', { name: /bomb-swing hr/i }).click();
  await page.getByRole('button', { name: /roll random player/i }).click();
});
