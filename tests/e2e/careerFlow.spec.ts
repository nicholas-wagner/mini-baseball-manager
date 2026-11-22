import { expect, test } from '@playwright/test';

test('Full career flow: Club Creation -> Live 3D Game Day HUD -> Ballpark HQ Derby & Sharing', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto('/');

  // Production launch lands straight on Play Ball / Club Creator with Design Lab hidden
  await expect(page.getByRole('button', { name: /design lab/i })).toHaveCount(0);
  const startBtn = page.getByRole('button', { name: /start sandlot dynasty/i });
  await expect(startBtn).toBeVisible();
  await startBtn.click();

  // Start a Live 3D Game and verify Broadcast HUD + 40-cue Soundboard & 10-track Per-Stadium Jukebox
  await expect(page.getByTestId('ballpark-soundboard')).toBeVisible();
  await expect(page.getByTestId('arcade-bgm-jukebox')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Stomp-Stomp-Clap!' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Stadium Airhorn!' })).toBeVisible();
  await page.getByRole('button', { name: /start live 3d game/i }).click();
  await expect(page.getByTestId('broadcast-hud')).toBeVisible();
  await expect(page.getByTestId('game-weather-banner')).toBeVisible();
  await expect(page.getByTestId('rivalry-showdown-banner')).toBeVisible();
  await page.getByRole('button', { name: /live box score/i }).click();
  await expect(page.getByTestId('live-box-score-modal')).toBeVisible();
  await page.getByRole('button', { name: /close live box score/i }).click();
  await page.getByRole('button', { name: /next pitch/i }).click();
  await expect(page.getByTestId('play-by-play-ticker')).toBeVisible();

  // Visit Roster -> verify Trainer's Table & 1-tap PNG Baseball Card export
  await page.getByRole('button', { name: /^roster$/i }).locator('visible=true').first().click();
  await expect(page.getByTestId('trainers-table-panel')).toBeVisible();
  await page.getByRole('button', { name: /download 90s card/i }).click();
  await expect(page.getByTestId('cross-train-feedback')).toContainText(/exported 90s baseball card/i);

  // Visit Ballpark HQ -> Stadium Progression + Economy & District + Gazette & Front Office + Derby/Global Cup/Challenges
  await page.getByRole('button', { name: /^ballpark$/i }).locator('visible=true').first().click();
  await expect(page.getByText(/neighborhood sandlot/i)).toBeVisible();

  await page.getByRole('button', { name: /economy & district/i }).click();
  await expect(page.getByTestId('ballpark-economy-panel')).toBeVisible();
  await page.getByRole('button', { name: /sign turbo fizz soda/i }).click();

  await page.getByRole('button', { name: /uniform studio/i }).click();
  await expect(page.getByTestId('uniform-designer-panel')).toBeVisible();
  await page.getByRole('button', { name: /vintage pinstripes/i }).click();
  await page.getByRole('button', { name: /apply custom uniform/i }).click();

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
  await page.getByRole('button', { name: /load 1994 cyber sluggers code/i }).click();
  await page.getByRole('button', { name: /play boss exhibition duel/i }).click();
  await expect(page.getByTestId('exhibition-duel-result')).toBeVisible();
  await page.getByRole('button', { name: /generate club export code/i }).click();
  await expect(page.locator('#club-export-code')).toHaveValue(/^MBM1:/);

  // Visit League tab and confirm Season Awards & Club Hall of Fame Ballot render
  await page.getByRole('button', { name: /^league$/i }).locator('visible=true').first().click();
  await expect(page.getByTestId('awards-and-hof-panel')).toBeVisible();

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
  await page.getByRole('button', { name: /close career slots/i }).click();

  await page.getByRole('button', { name: /open 90s music jukebox/i }).locator('visible=true').first().click();
  await expect(page.getByTestId('music-jukebox-modal')).toBeVisible();
  await page.getByRole('button', { name: /close music jukebox/i }).click();

  await page.getByRole('button', { name: /open settings and accessibility/i }).locator('visible=true').first().click();
  await expect(page.getByTestId('settings-modal')).toBeVisible();
  await page.getByRole('button', { name: /close settings/i }).click();
});
