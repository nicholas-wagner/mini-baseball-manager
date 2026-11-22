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

  // Visit Ballpark HQ -> Stadium Progression + Economy & District + Gazette & Front Office + Derby/Global Cup/Challenges
  await page.getByRole('button', { name: /^ballpark$/i }).locator('visible=true').first().click();
  await expect(page.getByText(/neighborhood sandlot/i)).toBeVisible();

  await page.getByRole('button', { name: /economy & district/i }).click();
  await expect(page.getByTestId('ballpark-economy-panel')).toBeVisible();
  await page.getByRole('button', { name: /sign turbo fizz soda/i }).click();

  await page.getByRole('button', { name: /gazette & front office/i }).click();
  await expect(page.getByTestId('front-office-gazette-panel')).toBeVisible();
  await page.getByRole('button', { name: /draw 90s surprise card/i }).click();
  await page.getByTestId('surprise-choice-0').click();
  await expect(page.getByTestId('surprise-outcome-banner')).toBeVisible();

  await page.getByRole('button', { name: /derby & sharing/i }).click();
  await page.getByRole('button', { name: /run home run derby/i }).click();
  await expect(page.getByText(/derby champ:/i)).toBeVisible();
  await page.getByRole('button', { name: /run global chibi cup/i }).click();
  await expect(page.getByTestId('global-cup-result')).toBeVisible();
  await page.getByRole('button', { name: /generate club export code/i }).click();
  await expect(page.locator('#club-export-code')).toHaveValue(/^MBM1:/);

  // Open Coach Pops' Guide, Story & Origins CYOA, and 4 Auto-Save Slots
  await page.getByRole('button', { name: /open dugout guide/i }).locator('visible=true').first().click();
  await expect(page.getByText(/COACH POPS’ DUGOUT HANDBOOK/i)).toBeVisible();
  await page.getByRole('button', { name: /close dugout handbook/i }).click();

  await page.getByRole('button', { name: /open dynasty story/i }).locator('visible=true').first().click();
  await expect(page.getByTestId('active-story-chapter')).toBeVisible();
  await page.getByRole('button', { name: /close story modal/i }).click();

  await page.getByRole('button', { name: /open 4 career save slots/i }).locator('visible=true').first().click();
  await expect(page.getByTestId('career-slot-1')).toBeVisible();
  await expect(page.getByTestId('career-slot-4')).toBeVisible();
});
