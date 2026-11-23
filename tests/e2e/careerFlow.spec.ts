import { expect, test } from '@playwright/test';

test('Full career flow: Club Creation -> Live 3D Game Day HUD -> Ballpark HQ Derby & Sharing', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto('/');

  // Production launch lands straight on Play Ball / Club Creator with cute quick-pick clubs & Design Lab hidden
  await expect(page.getByRole('button', { name: /design lab/i })).toHaveCount(0);
  await expect(page.getByTestId('quick-club-presets')).toBeVisible();
  const startBtn = page.getByRole('button', { name: /start sandlot dynasty/i });
  await expect(startBtn).toBeVisible();
  await startBtn.click();

  // Soundboard lives exclusively in Design Lab (NOT cluttering Game Day)
  await expect(page.getByTestId('ballpark-soundboard')).toHaveCount(0);
  await expect(page.getByTestId('manager-action-inbox')).toBeVisible();
  await expect(page.getByTestId('scheduled-matchup-card')).toBeVisible();
  await expect(page.getByTestId('matchup-faceoff-portraits')).toBeVisible();
  await expect(page.getByTestId('schedule-series-pill')).toHaveCount(7);
  await expect(page.getByTestId('probable-matchup-strip')).toBeVisible();
  await expect(page.getByTestId('pregame-lineup-check')).toBeVisible();
  await expect(page.getByTestId('start-clutch-moment-btn')).toBeVisible();
  await page.getByTestId('auto-tune-lineup-btn').click();
  await page.getByTestId('scout-rival-starter-btn').click();
  await expect(page.getByRole('dialog', { name: /player baseball card/i })).toBeVisible();
  await page.getByRole('button', { name: /close player card/i }).click();
  await page.getByRole('button', { name: /start live 3d game/i }).click();

  // Verify Sticky R/H/E Scoreboard + 3D Ballpark Canvas + Next Pitch button are ALL visible on-screen together WITHOUT scrolling!
  await expect(page.getByTestId('scoreboard-away-rhe')).toBeVisible();
  await expect(page.getByTestId('scoreboard-home-rhe')).toBeVisible();
  await expect(page.getByTestId('scoreboard-count-text')).toBeVisible();
  await expect(page.getByTestId('scoreboard-bases-diamond')).toBeVisible();
  const scoreBox = await page.getByTestId('sticky-live-scoreboard').boundingBox();
  const canvasBox = await page.getByTestId('live-game-3d-canvas').boundingBox();
  const nextPitchBtn = page.getByRole('button', { name: /next pitch/i });
  const nextPitchBox = await nextPitchBtn.boundingBox();
  const viewport = page.viewportSize()!;
  expect(scoreBox).not.toBeNull();
  expect(canvasBox).not.toBeNull();
  expect(nextPitchBox).not.toBeNull();
  expect(scoreBox!.y).toBeGreaterThanOrEqual(0);
  expect(canvasBox!.y).toBeGreaterThanOrEqual(0);
  expect(nextPitchBox!.y + nextPitchBox!.height).toBeLessThanOrEqual(viewport.height);

  await expect(page.getByTestId('coach-action-cue')).toBeVisible();
  await expect(page.getByTestId('camera-angle-switcher')).toBeVisible();
  await expect(page.getByTestId('smart-watch-toggle')).toBeVisible();
  await expect(page.getByTestId('broadcast-lower-third')).toBeVisible();
  await expect(page.getByTestId('arcade-bullpen-toggle')).toBeVisible();
  await nextPitchBtn.click();
  await expect(page.getByTestId('live-last-pitch-readout')).toContainText(/mph|ball|strike|out|hit|walk/i);

  // Inspect Batter & Pitcher baseball cards right inside the 3D game (top-safe on Mobile!)
  await page.getByTestId('inspect-batter-card-btn').click();
  const liveCardDialog = page.getByRole('dialog', { name: /player baseball card/i });
  await expect(liveCardDialog).toBeVisible();
  const liveCardHeadingBox = await liveCardDialog.locator('h2').first().boundingBox();
  expect(liveCardHeadingBox).not.toBeNull();
  expect(liveCardHeadingBox!.y).toBeGreaterThanOrEqual(0);
  await page.getByTestId('card-modal-pitcher-tab').click();
  await page.getByRole('button', { name: /close player card/i }).click();

  // Verify Weather, Rivalry, Live Box Score, Broadcast HUD & Show Math Inspector
  await expect(page.getByTestId('broadcast-hud')).toBeVisible();
  await expect(page.getByTestId('game-weather-banner')).toBeVisible();
  await expect(page.getByTestId('rivalry-showdown-banner')).toBeVisible();
  await page.getByRole('button', { name: /live box score/i }).click();
  await expect(page.getByTestId('live-box-score-modal')).toBeVisible();
  await page.getByRole('button', { name: /close live box score/i }).click();
  await expect(page.getByTestId('play-by-play-ticker')).toBeVisible();
  await page.getByRole('button', { name: /show math/i }).click();
  await expect(page.getByTestId('pitch-math-breakdown').first()).toBeVisible();
  await expect(page.getByTestId('strike-zone-plot')).toBeVisible();

  // Expand Pro Manager mode on 1 tap and verify deep Active Powers & Mind Games unlock cleanly
  await page.getByTestId('control-mode-toggle').click();
  await expect(page.getByTestId('active-powers-dock')).toBeVisible();
  await expect(page.getByTestId('mind-games-bar')).toBeVisible();

  // Finish the game via Fast Sim -> verify Post-Game Summary top is NOT clipped off mobile screen, mascot cheers, and closing scrolls cleanly to top!
  await page.getByTestId('fast-sim-toggle').click();
  await page.getByRole('button', { name: /sim to end/i }).click();
  const postGameDialog = page.getByRole('dialog', { name: /post-game box score & mvp/i });
  await expect(postGameDialog).toBeVisible();
  const postGameHeaderBox = await postGameDialog.locator('h2').first().boundingBox();
  expect(postGameHeaderBox).not.toBeNull();
  expect(postGameHeaderBox!.y).toBeGreaterThanOrEqual(0);
  await page.getByRole('button', { name: /back to clubhouse/i }).click();
  const matchupBox = await page.getByTestId('scheduled-matchup-card').boundingBox();
  expect(matchupBox).not.toBeNull();
  expect(matchupBox!.y).toBeGreaterThanOrEqual(0);

  // Visit Roster -> verify Mobile Roster Card Binder, 1-tap Card modal, Trainer's Table, Dossier & PNG export
  await page.getByRole('button', { name: /^roster$/i }).locator('visible=true').first().click();
  await page.getByTestId('roster-open-card-btn').first().click();
  await expect(page.getByRole('dialog', { name: /player baseball card/i })).toBeVisible();
  await page.getByRole('button', { name: /close player card/i }).click();
  await page.getByTestId('roster-view-cards-btn').click();
  await expect(page.getByTestId('roster-card-binder')).toBeVisible();
  await page.getByTestId('roster-view-lineup-btn').click();
  await page.getByTestId('fa-scout-card-btn').first().click();
  await expect(page.getByRole('dialog', { name: /player baseball card/i })).toBeVisible();
  await page.getByRole('button', { name: /close player card/i }).click();
  await expect(page.getByTestId('trainers-table-panel')).toBeVisible();
  await page.getByRole('button', { name: /full scouting dossier/i }).click();
  await expect(page.getByTestId('player-dossier-modal')).toBeVisible();
  await page.getByRole('button', { name: /close scouting dossier/i }).click();
  await page.getByRole('button', { name: /download 90s card/i }).click();
  await expect(page.getByTestId('cross-train-feedback')).toContainText(/exported 90s baseball card/i);

  // Visit Ballpark HQ -> 4 Clean Rooms (Ballpark & Economy, Uniforms & Gear, Staff & Front Office, Events & Duels)
  await page.getByRole('button', { name: /^ballpark$/i }).locator('visible=true').first().click();
  await expect(page.getByTestId('hub-room-tabs')).toBeVisible();
  await expect(page.getByText(/neighborhood sandlot/i)).toBeVisible();

  await page.getByRole('button', { name: /economy & district/i }).click();
  await expect(page.getByTestId('ballpark-economy-panel')).toBeVisible();
  await page.getByRole('button', { name: /sign turbo fizz soda/i }).click();

  await page.getByRole('button', { name: /uniforms & gear/i }).click();
  await expect(page.getByTestId('uniform-designer-panel')).toBeVisible();
  await page.getByRole('button', { name: /vintage pinstripes/i }).click();
  await page.getByRole('button', { name: /apply custom uniform/i }).click();

  await page.getByRole('button', { name: /staff & front office/i }).click();
  await page.getByRole('button', { name: /gazette & front office/i }).click();
  await expect(page.getByTestId('front-office-gazette-panel')).toBeVisible();
  await page.getByRole('button', { name: /draw 90s surprise card/i }).click();
  await page.getByTestId('surprise-choice-0').click();
  await expect(page.getByTestId('surprise-outcome-banner')).toBeVisible();

  await page.getByRole('button', { name: /events & duels/i }).click();
  await page.getByRole('button', { name: /run home run derby/i }).click();
  await expect(page.getByText(/derby champ:/i)).toBeVisible();
  await page.getByRole('button', { name: /run global chibi cup/i }).click();
  await expect(page.getByTestId('global-cup-result')).toBeVisible();
  await page.getByRole('button', { name: /load 1994 cyber sluggers code/i }).click();
  await page.getByRole('button', { name: /play boss exhibition duel/i }).click();
  await expect(page.getByTestId('exhibition-duel-result')).toBeVisible();
  await page.getByRole('button', { name: /generate club export code/i }).click();
  await expect(page.locator('#club-export-code')).toHaveValue(/^MBM1:/);

  // Visit League tab and confirm Playoff Bracket, clickable rival club cards, and Season Awards & Club Hall of Fame Ballot render
  await page.getByRole('button', { name: /^league$/i }).locator('visible=true').first().click();
  await expect(page.getByTestId('playoff-bracket-panel')).toBeVisible();
  await page.getByTestId('standings-club-btn').nth(1).click();
  await expect(page.getByRole('dialog', { name: /player baseball card/i })).toBeVisible();
  await page.getByRole('button', { name: /close player card/i }).click();
  await expect(page.getByTestId('awards-and-hof-panel')).toBeVisible();

  // Open Coach Pops' Guide, Story & Origins CYOA, 4 Save Slots, Jukebox, Foil Packs & Settings (via Desktop Sidebar OR Clean Mobile Menu!)
  const openUtilityItem = async (ariaPattern: RegExp) => {
    const mobileMenuToggle = page.getByTestId('mobile-menu-toggle');
    if (await mobileMenuToggle.isVisible()) {
      await mobileMenuToggle.click();
      await expect(page.getByTestId('mobile-clubhouse-menu')).toBeVisible();
      await page.getByTestId('mobile-clubhouse-menu').getByRole('button', { name: ariaPattern }).click();
    } else {
      await page.getByRole('button', { name: ariaPattern }).locator('visible=true').first().click();
    }
  };

  await openUtilityItem(/open dugout guide/i);
  await expect(page.getByText(/COACH POPS’ DUGOUT HANDBOOK/i)).toBeVisible();
  await page.getByRole('button', { name: /close dugout handbook/i }).click();

  await openUtilityItem(/open dynasty story/i);
  await expect(page.getByTestId('active-story-chapter')).toBeVisible();
  await page.getByRole('button', { name: /close story modal/i }).click();

  await openUtilityItem(/open 4 career save slots/i);
  await expect(page.getByTestId('career-slot-1')).toBeVisible();
  await expect(page.getByTestId('career-slot-4')).toBeVisible();
  await page.getByRole('button', { name: /close career slots/i }).click();

  await openUtilityItem(/open 90s music jukebox/i);
  await expect(page.getByTestId('music-jukebox-modal')).toBeVisible();
  await page.getByRole('button', { name: /close music jukebox/i }).click();

  await openUtilityItem(/open 1994 foil packs/i);
  await expect(page.getByTestId('foil-pack-modal')).toBeVisible();
  await page.getByRole('button', { name: /rip open 1994 foil pack/i }).click();
  await expect(page.getByTestId('foil-pack-card')).toHaveCount(3);
  await page.getByRole('button', { name: /reveal all 3 cards/i }).click();
  await expect(page.getByTestId('foil-pack-summary')).toBeVisible();
  await page.getByRole('button', { name: /close foil packs/i }).click();

  await openUtilityItem(/open settings and accessibility/i);
  await expect(page.getByTestId('settings-modal')).toBeVisible();
  await page.getByRole('button', { name: /close settings/i }).click();
});
