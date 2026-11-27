import { expect, test, type Locator, type Page } from '@playwright/test';

async function seedOpeningDay(page: Page, seed = 2089): Promise<void> {
  await page.addInitScript((s: number) => {
    const random = crypto.getRandomValues.bind(crypto);
    crypto.getRandomValues = (array) =>
      array instanceof Uint32Array && array.length === 1
        ? (array.fill(s), array)
        : random(array);
  }, seed);
}

async function expectNoHorizontalOverflow(page: Page, viewportWidth: number): Promise<void> {
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(viewportWidth);
}

async function expectMinTapTarget(locator: Locator, minPx = 44): Promise<void> {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(Math.round(box!.width)).toBeGreaterThanOrEqual(minPx);
  expect(Math.round(box!.height)).toBeGreaterThanOrEqual(minPx);
}

async function openLiveTacticsOrMore(page: Page): Promise<void> {
  const moreControls = page.getByRole('button', { name: /more controls/i }).first();
  if (await moreControls.isVisible()) {
    await moreControls.click();
  }
  await expect(page.getByTestId('live-action-bar')).toBeVisible({ timeout: 15_000 });
}

async function openTacticsSheetIfCollapsed(page: Page): Promise<void> {
  const tacticsToggle = page
    .getByRole('button', { name: /^tactics$/i })
    .or(page.getByTestId('live-bottom-sheet-toggle'))
    .first();
  if (await tacticsToggle.isVisible()) {
    const expanded = await tacticsToggle.getAttribute('aria-expanded');
    if (expanded !== 'true') {
      await tacticsToggle.click();
    }
  }
}

test.describe('Council Cross-Device Visual Audit (TASK-101)', () => {
  test('360x640 compact phone: Opening Cover, Live Guided At-Bat, and 1994 Foil Pack modal', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'Compact phone audit runs in android-mobile project');
    test.slow();
    await seedOpeningDay(page, 2089);
    await page.setViewportSize({ width: 360, height: 640 });

    // 1. Opening Cover
    await page.goto('/');
    const opening = page.getByRole('region', { name: 'Opening Day feature' });
    const startBtn = opening.getByRole('button', { name: /^(Bat|Pitch) with / });
    await expect(startBtn).toBeInViewport({ ratio: 1 });
    await expectNoHorizontalOverflow(page, 360);
    await page.screenshot({ path: 'test-results/audit-360x640-01-opening-cover.png' });

    // 2. Live Guided At-Bat (wait for entrance to settle into behind-the-catcher batting view)
    await startBtn.click();
    await expect(page.getByTestId('live-game-3d-canvas')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('region', { name: 'First at-bat' })).toBeVisible();
    await expect(page.getByTestId('player-entrance')).toHaveCount(0, { timeout: 5_000 });
    await expectNoHorizontalOverflow(page, 360);
    await page.screenshot({ path: 'test-results/audit-360x640-02-live-guided-atbat.png' });

    // Confirm 1-tap live audio toggle is >=44px and mutes/unmutes cleanly
    const liveAudioBtn = page.getByTestId('live-audio-toggle');
    await expect(liveAudioBtn).toBeVisible();
    await expectMinTapTarget(liveAudioBtn, 44);
    await liveAudioBtn.click();
    await expect(liveAudioBtn).toHaveAttribute('aria-pressed', 'true');
    await liveAudioBtn.click();
    await expect(liveAudioBtn).toHaveAttribute('aria-pressed', 'false');

    // Confirm Swing button locks with non-shifting label + aria-busy until the play completes
    const swingBtn = page
      .getByRole('button', {
        name: /^(Swing|Throw Pitch|Throw|Lay down bunt|Send Runner|Steal & Swing \(2K\))(\s*·\s*1-Pitch)?$/i,
      })
      .first();
    await expectMinTapTarget(swingBtn, 44);
    const unlockedLabel = await swingBtn.innerText();
    expect(unlockedLabel).toMatch(/1-Pitch/i);
    await swingBtn.click();
    await expect(swingBtn).toBeDisabled();
    await expect(swingBtn).toHaveAttribute('aria-busy', 'true');
    await expect(swingBtn).toHaveAttribute('data-play-locked', 'true');
    expect(await swingBtn.innerText()).toBe(unlockedLabel);

    // 3. 1994 Foil Pack Modal (prize-first + thumb-reach Reveal All on 360x640)
    const dugoutBtn = page.getByRole('button', { name: 'Dugout', exact: true });
    if (await dugoutBtn.isVisible()) {
      await dugoutBtn.click();
    } else {
      await page.getByTestId('mobile-menu-toggle').click();
    }
    const menu = page.getByTestId('mobile-clubhouse-menu');
    await expect(menu).toBeVisible();
    await menu.getByRole('button', { name: /open 1994 foil packs/i }).click();

    const foilModal = page.getByTestId('foil-pack-modal');
    await expect(foilModal).toBeVisible();
    const ripBtn = foilModal.getByRole('button', { name: /rip open 1994 foil pack/i });
    if (await ripBtn.isVisible()) {
      await ripBtn.click();
      await expect(foilModal.getByTestId('foil-pack-pulls-section')).toBeVisible();
      await expect(foilModal.getByTestId('foil-pack-thumb-bar')).toBeInViewport({ ratio: 1 });
    }
    await expectNoHorizontalOverflow(page, 360);
    await page.screenshot({ path: 'test-results/audit-360x640-03-foil-pack-modal.png' });
  });

  test('390x844 Pixel 7 portrait: Live Cockpit, Tactics Sheet / More Controls, and 3-Tab Post-Game modal', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'Pixel 7 portrait audit runs in android-mobile project');
    test.slow();
    await seedOpeningDay(page, 2089);
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto('/');
    await page.getByRole('button', { name: /^(Bat|Pitch) with / }).click();
    await expect(page.getByTestId('live-game-3d-canvas')).toBeVisible({ timeout: 15_000 });

    // 4. Expanded Live Cockpit
    await openLiveTacticsOrMore(page);
    await expectMinTapTarget(page.getByTestId('live-audio-toggle'), 44);
    await expectMinTapTarget(page.getByTestId('live-primary-pitch-btn').first(), 44);
    await expectNoHorizontalOverflow(page, 390);
    await page.screenshot({ path: 'test-results/audit-390x844-04-live-cockpit.png' });

    // 5. Tactics Bottom Sheet / Drawer (tap targets + 1-Pitch toggle + instant auto-dismiss)
    await openTacticsSheetIfCollapsed(page);
    const tacticsSheet = page.getByTestId('tactics-sheet');
    await expect(tacticsSheet).toBeVisible();
    await expectMinTapTarget(tacticsSheet.getByTestId('tactics-sheet-close-btn'), 44);
    await expectMinTapTarget(tacticsSheet.getByTestId('arcade-one-pitch-toggle'), 44);
    await expectMinTapTarget(tacticsSheet.getByTestId('tactics-audio-toggle'), 44);
    await expectMinTapTarget(tacticsSheet.getByTestId('fast-sim-toggle'), 44);
    await expectNoHorizontalOverflow(page, 390);
    await page.screenshot({ path: 'test-results/audit-390x844-05-tactics-drawer.png' });

    // Verify 1-Pitch Mode defaults ON in Simple Mode, toggles cleanly, and fires deciding pitch -> sheet immediately auto-dismisses!
    const onePitchToggle = tacticsSheet.getByTestId('arcade-one-pitch-toggle');
    await expect(onePitchToggle).toHaveAttribute('aria-pressed', 'true');
    const sheetPrimary = tacticsSheet.getByTestId('live-primary-pitch-btn');
    await expect(sheetPrimary).toContainText(/1-Pitch/i);
    await onePitchToggle.click();
    await expect(onePitchToggle).toHaveAttribute('aria-pressed', 'false');
    await onePitchToggle.click();
    await expect(onePitchToggle).toHaveAttribute('aria-pressed', 'true');
    await sheetPrimary.click();
    await expect(tacticsSheet).toHaveCount(0);

    // Wait for deciding pitch animation to settle, then reopen Tactics and Sim to End
    const dockPrimary = page.getByTestId('live-primary-pitch-btn').first();
    await expect(dockPrimary).toBeEnabled({ timeout: 10_000 });
    await openTacticsSheetIfCollapsed(page);
    await expect(page.getByTestId('fast-sim-toggle')).toBeVisible();

    // 6. Post-Game 3-Tab Celebration Modal (Highlights -> Clubhouse -> Box Score)
    await page.getByTestId('fast-sim-toggle').click();
    await page.getByRole('button', { name: /sim to end/i }).click();

    const recap = page.getByRole('dialog', { name: /post-game box score & mvp/i });
    await expect(recap).toBeVisible({ timeout: 15_000 });
    const tabs = recap.getByTestId('postgame-tabs');
    await expect(tabs).toBeInViewport({ ratio: 1 });
    await expectNoHorizontalOverflow(page, 390);
    await page.screenshot({ path: 'test-results/audit-390x844-06-postgame-highlights.png' });

    await tabs.getByRole('tab', { name: /clubhouse/i }).click();
    await expect(recap.getByTestId('postgame-clubhouse-panel')).toBeVisible();
    await expectNoHorizontalOverflow(page, 390);
    await page.screenshot({ path: 'test-results/audit-390x844-07-postgame-clubhouse.png' });

    await tabs.getByRole('tab', { name: /box score/i }).click();
    await expect(recap.getByTestId('postgame-boxscore-panel')).toBeVisible();
    await expectNoHorizontalOverflow(page, 390);
    await page.screenshot({ path: 'test-results/audit-390x844-08-postgame-boxscore.png' });

    // 7. Tap persistent mobile Cash Pill -> Club Treasury & Power-Up Camp (TASK-108, TASK-115)
    await recap.getByRole('button', { name: /close/i }).first().click();
    const mobileCashPill = page.getByTestId('club-cash-pill-mobile');
    await expect(mobileCashPill).toBeVisible({ timeout: 10_000 });
    await expectMinTapTarget(mobileCashPill, 44);
    await mobileCashPill.click();
    await expect(page.getByTestId('club-treasury-panel')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('power-up-camp')).toBeVisible();
    await expectNoHorizontalOverflow(page, 390);
    await page.screenshot({ path: 'test-results/audit-390x844-11-club-treasury.png' });

    // 8. Check Skill Trees (Career Talent Cap + Build Identity, TASK-114) & League Boss Badge (TASK-120)
    await page.getByRole('button', { name: /skill tree/i }).first().click();
    await expect(page.getByTestId('career-talent-budget')).toBeVisible({ timeout: 10_000 });
    await expectNoHorizontalOverflow(page, 390);
    await page.screenshot({ path: 'test-results/audit-390x844-13-skill-trees.png' });

    await page.getByRole('button', { name: /league/i }).first().click();
    await expect(page.getByTestId('standings-boss-badge').first()).toBeVisible({ timeout: 10_000 });
    await expectNoHorizontalOverflow(page, 390);
    await page.screenshot({ path: 'test-results/audit-390x844-14-league-boss.png' });
  });

  test('844x390 phone landscape: Live Landscape 2-column ballpark and action layout', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'Phone landscape audit runs in android-mobile project');
    test.slow();
    await seedOpeningDay(page, 2089);
    await page.setViewportSize({ width: 844, height: 390 });

    await page.goto('/');
    await page.getByRole('button', { name: /^(Bat|Pitch) with / }).click();
    await expect(page.getByTestId('player-entrance')).toHaveCount(0, { timeout: 5_000 });

    const field = page.getByTestId('live-game-3d-canvas');
    const primaryAction = page
      .getByRole('button', {
        name: /^(Swing|Throw Pitch|Throw|Lay down bunt)(\s*·\s*1-Pitch)?$/i,
      })
      .or(page.getByRole('button', { name: /next pitch/i }))
      .first();
    await expect(field).toBeInViewport({ ratio: 1 });
    await expect(primaryAction).toBeInViewport({ ratio: 1 });
    await expectMinTapTarget(primaryAction, 44);
    await expectMinTapTarget(page.getByTestId('live-audio-toggle'), 44);
    await expectNoHorizontalOverflow(page, 844);
    await page.screenshot({ path: 'test-results/audit-844x390-09-live-landscape.png' });
  });

  test('1280x800 desktop: Desktop Broadcast Studio live game layout', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'Desktop broadcast audit runs in desktop-chrome project');
    test.slow();
    await seedOpeningDay(page, 2089);
    await page.setViewportSize({ width: 1280, height: 800 });

    await page.goto('/');
    await page.getByRole('button', { name: /^(Bat|Pitch) with / }).click();
    await expect(page.getByTestId('live-game-3d-canvas')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('player-entrance')).toHaveCount(0, { timeout: 5_000 });
    await openLiveTacticsOrMore(page);

    await expect(page.getByTestId('sticky-live-scoreboard')).toBeVisible();
    const desktopCanvas = page.getByTestId('live-game-3d-canvas');
    await expect(desktopCanvas).toBeVisible();
    await expectMinTapTarget(page.getByTestId('live-audio-toggle'), 44);
    await expectMinTapTarget(page.getByTestId('live-primary-pitch-btn').first(), 44);

    // Full Live batting stance preview OR pitcher shake-off hook works live on desktop
    const buntBtn = page.getByTestId('arcade-bunt-btn').first();
    const shakeOffBtn = page.getByTestId('arcade-shake-off-btn').first();
    if (await buntBtn.isVisible()) {
      await expectMinTapTarget(buntBtn, 44);
      await buntBtn.click();
      await expect(desktopCanvas).toHaveAttribute('data-preview', 'bunt');
    } else if (await shakeOffBtn.isVisible()) {
      await expectMinTapTarget(shakeOffBtn, 44);
      await shakeOffBtn.click();
      await expect(desktopCanvas).toHaveAttribute('data-shake-off-signal', '1');
    }

    await expectNoHorizontalOverflow(page, 1280);
    await page.screenshot({ path: 'test-results/audit-1280x800-10-desktop-broadcast.png' });

    // Open Club Treasury directly via persistent Desktop Cash Pill (TASK-108, TASK-115)
    const desktopCashPill = page.getByTestId('club-cash-pill-desktop');
    await expect(desktopCashPill).toBeVisible();
    await desktopCashPill.click();
    await expect(page.getByTestId('club-treasury-panel')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('power-up-camp')).toBeVisible();
    await expectNoHorizontalOverflow(page, 1280);
    await page.screenshot({ path: 'test-results/audit-1280x800-12-desktop-treasury.png' });

    // Open Skill Trees on Desktop to inspect Career Talent Budget & Manager Legacy (TASK-114)
    await page.getByRole('button', { name: /skill tree/i }).first().click();
    await expect(page.getByTestId('career-talent-budget')).toBeVisible({ timeout: 10_000 });
    await expectNoHorizontalOverflow(page, 1280);
    await page.screenshot({ path: 'test-results/audit-1280x800-15-desktop-skills.png' });
  });
});
