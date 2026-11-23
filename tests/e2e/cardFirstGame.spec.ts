import { expect, test } from '@playwright/test';

test('Opening Day print, live matchup and final rematch work on the first screen', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /start sandlot dynasty/i }).click();
  const opening = page.getByRole('region', { name: 'Opening Day feature' });
  const name = await opening.getByRole('heading').innerText();
  const start = opening.getByRole('button', { name: /^(Bat|Pitch) with / });
  await expect(start).toBeInViewport({ ratio: 1 });
  await opening.getByRole('button', { name: 'Inspect ' + name + ' card' }).click();
  await page.getByRole('button', { name: 'Enlarge ' + name + ' illustration' }).click();
  const print = page.getByRole('dialog', { name: name + ' illustration', exact: true });
  await expect(print.getByRole('img', { name: name + ' full illustration' })).toBeVisible();
  await print.getByRole('button', { name: 'Close illustration' }).click();
  await page.getByRole('button', { name: /close player card/i }).click();
  await start.click();
  const matchup = page.getByRole('group', { name: 'Matchup cards' });
  await expect(matchup.getByRole('button', { name: 'Inspect ' + name + ' card' })).toBeVisible();
  const pitch = page.getByRole('button', { name: /next pitch|throw pitch/i }).first();
  await expect(pitch).toBeInViewport();
  await pitch.click();
  await expect(
    page.locator('.plate-verdict, [data-testid="comic-callout-banner"]').first(),
  ).toBeVisible();
  await page.getByTestId('fast-sim-toggle').click();
  await page.getByRole('button', { name: /sim to end/i }).click();
  const recap = page.getByRole('dialog', { name: /post-game box score/i });
  const again = recap.getByRole('button', { name: /rematch/i });
  await expect(again).toBeInViewport({ ratio: 1 });
  await again.click();
  await expect(recap).toHaveCount(0);
  await expect(page.getByTestId('live-game-3d-canvas')).toBeVisible();
  await page.getByRole('button', { name: /^roster$/i }).locator('visible=true').first().click();
  await page.getByTestId('roster-view-cards-btn').click();
  await page.getByRole('button', { name: 'Print gallery' }).click();
  const gallery = page.getByRole('region', { name: 'Roster print gallery' });
  await gallery.getByRole('button').first().click();
  const enlarged = page.locator('dialog:modal');
  await expect(enlarged.locator('img')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(enlarged).toHaveCount(0);
});
