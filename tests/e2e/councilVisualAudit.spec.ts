import { expect, test, type Page } from '@playwright/test';

async function seedOpeningDay(page: Page, seed = 2089): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce' });
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

    // 2. Live Guided At-Bat
    await startBtn.click();
    await expect(page.getByTestId('live-game-3d-canvas')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('region', { name: 'First at-bat' })).toBeVisible();
    await expectNoHorizontalOverflow(page, 360);
    await page.screenshot({ path: 'test-results/audit-360x640-02-live-guided-atbat.png' });

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
    await expectNoHorizontalOverflow(page, 390);
    await page.screenshot({ path: 'test-results/audit-390x844-04-live-cockpit.png' });

    // 5. Tactics Bottom Sheet / Drawer
    await openTacticsSheetIfCollapsed(page);
    await expect(page.getByTestId('fast-sim-toggle')).toBeVisible();
    await expectNoHorizontalOverflow(page, 390);
    await page.screenshot({ path: 'test-results/audit-390x844-05-tactics-drawer.png' });

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

    const field = page.getByTestId('live-game-3d-canvas');
    const primaryAction = page
      .getByRole('button', { name: /^(Swing|Throw Pitch|Lay down bunt)$/i })
      .or(page.getByRole('button', { name: /next pitch/i }))
      .first();
    await expect(field).toBeInViewport({ ratio: 1 });
    await expect(primaryAction).toBeInViewport({ ratio: 1 });
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
    await openLiveTacticsOrMore(page);

    await expect(page.getByTestId('sticky-live-scoreboard')).toBeVisible();
    await expect(page.getByTestId('live-game-3d-canvas')).toBeVisible();
    await expectNoHorizontalOverflow(page, 1280);
    await page.screenshot({ path: 'test-results/audit-1280x800-10-desktop-broadcast.png' });
  });
});
