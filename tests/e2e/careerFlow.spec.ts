import { expect, test } from '@playwright/test';

test('Full career flow: Club Creation -> Live 3D Game Day HUD -> Ballpark HQ Derby & Sharing', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto('/');

  // Design Lab mounts the full 28-cue Ballpark Soundboard
  await expect(page.getByTestId('ballpark-soundboard')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Stomp-Stomp-Clap!' })).toBeVisible();

  // Navigate to Play Ball and found a new Rookie Sandlot club
  await page.getByRole('button', { name: /play ball/i }).locator('visible=true').first().click();
  const startBtn = page.getByRole('button', { name: /start sandlot dynasty/i });
  await expect(startBtn).toBeVisible();
  await startBtn.click();

  // Start a Live 3D Game and verify Broadcast HUD (Win Probability + Defensive Shifts)
  await page.getByRole('button', { name: /start live 3d game/i }).click();
  await expect(page.getByTestId('broadcast-hud')).toBeVisible();
  await page.getByRole('button', { name: /next pitch/i }).click();
  await expect(page.getByTestId('play-by-play-ticker')).toBeVisible();

  // Visit Ballpark HQ -> Stadium Progression + Home Run Derby + Serverless Club Code
  await page.getByRole('button', { name: /^ballpark$/i }).locator('visible=true').first().click();
  await expect(page.getByText(/neighborhood sandlot/i)).toBeVisible();
  await page.getByRole('button', { name: /derby & sharing/i }).click();
  await page.getByRole('button', { name: /run home run derby/i }).click();
  await expect(page.getByText(/derby champ:/i)).toBeVisible();
  await page.getByRole('button', { name: /generate club export code/i }).click();
  await expect(page.locator('#club-export-code')).toHaveValue(/^MBM1:/);
});
