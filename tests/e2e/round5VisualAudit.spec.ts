import { expect, test, type Page } from '@playwright/test';

async function expectNoHorizontalOverflow(page: Page, viewportWidth: number): Promise<void> {
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(viewportWidth + 1);
}

async function openNavTab(page: Page, tabLabel: RegExp, isMobile: boolean): Promise<void> {
  if (isMobile) {
    const dugoutBtn = page.getByRole('button', { name: /^dugout$/i }).first();
    if (await dugoutBtn.isVisible().catch(() => false)) {
      await dugoutBtn.click();
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('button', { name: tabLabel }).first().click();
      return;
    }
  }
  await page.getByRole('button', { name: tabLabel }).first().click();
}

test.describe('Round 5 Feature & Visual Audit (Desktop + Android Mobile)', () => {
  test('Desktop 1280x800: Constellation Skills, Stadium Lightbox, Money Flow, 5-Rank Staff, Relic Locker, Contracts & Design Lab QA', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'Desktop audit runs in desktop-chrome project');
    test.slow();

    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto('/');
    const opening = page.getByRole('region', { name: 'Opening Day feature' });
    await opening.getByRole('button', { name: /^(Bat|Pitch) with / }).click();
    await expect(page.getByTestId('live-game-3d-canvas')).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(500);
    await expectNoHorizontalOverflow(page, 1280);
    await page.screenshot({ path: 'test-results/round5-desktop-gameday.png' });

    // 1. Skill Tree Constellation + 3-Mode Assistant (TASK-133)
    await openNavTab(page, /^skill tree/i, false);
    const constellation = page.getByTestId('skill-tree-constellation');
    await expect(constellation).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('skill-tree-assist-bar')).toBeVisible();
    await expectNoHorizontalOverflow(page, 1280);
    await constellation.scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'test-results/round5-desktop-constellation.png' });

    // 1b. 1994 Foil Pack Card Shop & Pity Tracker Modal (TASK-137)
    await page.getByRole('button', { name: /open 1994 foil packs/i }).click();
    await expect(page.getByRole('dialog', { name: /1994 foil card booster packs/i })).toBeVisible();
    await page.screenshot({ path: 'test-results/round5-desktop-foil-packs.png' });
    await page.getByRole('button', { name: 'Close Foil Packs' }).click();

    // 2. Clubhouse HQ: Full-Size Stadium Lightbox (TASK-142) + Money Flow (TASK-143)
    await openNavTab(page, /^clubhouse$/i, false);
    await expect(page.getByTestId('stadium-fullsize-btn')).toBeVisible({ timeout: 10_000 });
    await page.getByTestId('stadium-fullsize-btn').click();
    await expect(page.getByTestId('stadium-lightbox-modal')).toBeVisible();
    await page.screenshot({ path: 'test-results/round5-desktop-stadium-lightbox.png' });
    await page.getByLabel('Close Full-Size Stadium View').click();

    await page.getByRole('button', { name: /^treasury$/i }).click();
    await expect(page.getByTestId('money-flow-breakdown')).toBeVisible();
    await page.screenshot({ path: 'test-results/round5-desktop-money-flow.png' });

    // 3. Uniforms & Gear: 18 Crests / Home-Road Uniforms + 26-Relic Gear Locker (TASK-131, TASK-138)
    await page.getByRole('button', { name: /uniforms & gear/i }).click();
    await expect(page.getByTestId('uniform-designer-panel')).toBeVisible({ timeout: 10_000 });
    await page.screenshot({ path: 'test-results/round5-desktop-uniforms.png' });

    await page.getByRole('button', { name: /relics & chemistry/i }).click();
    await expect(page.getByTestId('relic-locker-panel')).toBeVisible({ timeout: 10_000 });
    await page.screenshot({ path: 'test-results/round5-desktop-relic-locker.png' });

    // 4. Staff & Front Office: 5-Rank Crew Cards + ALL 6 MDs (TASK-128, TASK-129, TASK-130)
    await page.getByRole('button', { name: /staff & front office/i }).click();
    await expect(page.getByTestId('medical-staff-market')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('medical-staff-market')).toContainText("Women's Sports Medicine MD");
    await expect(page.getByTestId('medical-staff-market')).toContainText('Oncology & Complex Recovery MD');
    await page.screenshot({ path: 'test-results/round5-desktop-staff-5rank.png' });

    // 5. Roster HQ: Simple Personality-Driven Contract Negotiation Modal (TASK-144)
    await openNavTab(page, /^roster$/i, false);
    await expect(page.getByTestId('negotiate-selected-player-btn')).toBeVisible({ timeout: 10_000 });
    await page.getByTestId('negotiate-selected-player-btn').click();
    await expect(page.getByTestId('contract-negotiation-modal')).toBeVisible();
    await page.screenshot({ path: 'test-results/round5-desktop-contract-negotiation.png' });
    await page.getByLabel('Close Contract Negotiation').click();

    // 6. Design Lab QA Inspector: 45 Manga Health Art + 3,000 Players & Hobbies (TASK-141, TASK-145)
    for (let i = 0; i < 5; i += 1) {
      await page.keyboard.press('d');
    }
    await expect(page.getByTestId('design-lab-qa-tabs')).toBeVisible({ timeout: 10_000 });
    await page.getByTestId('design-lab-tab-health_art').click();
    await expect(page.getByTestId('qa-health-card-patellofemoral_knee_strain')).toBeVisible();
    await page.screenshot({ path: 'test-results/round5-desktop-designlab-health.png' });

    await page.getByTestId('design-lab-tab-players_hobbies').click();
    await expect(page.getByTestId('design-lab-qa-players_hobbies')).toBeVisible();
    await page.screenshot({ path: 'test-results/round5-desktop-designlab-hobbies.png' });

    expect(pageErrors).toEqual([]);
  });

  test('Android Mobile 390x844: Constellation Skills, Stadium Lightbox & Relic Locker with zero overflow', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'Mobile audit runs in android-mobile project');
    test.slow();

    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto('/');
    const opening = page.getByRole('region', { name: 'Opening Day feature' });
    await opening.getByRole('button', { name: /^(Bat|Pitch) with / }).click();
    await expect(page.getByTestId('live-game-3d-canvas')).toBeVisible({ timeout: 15_000 });
    await expectNoHorizontalOverflow(page, 390);

    // Mobile Constellation Skill Tree
    await openNavTab(page, /^skill tree/i, true);
    const mobileConst = page.getByTestId('skill-tree-constellation');
    await expect(mobileConst).toBeVisible({ timeout: 10_000 });
    await expectNoHorizontalOverflow(page, 390);
    await mobileConst.scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'test-results/round5-mobile-constellation.png' });

    // Mobile Clubhouse: Stadium Lightbox + Relic Locker
    await openNavTab(page, /^clubhouse$/i, true);
    await expect(page.getByTestId('stadium-fullsize-btn')).toBeVisible({ timeout: 10_000 });
    await expectNoHorizontalOverflow(page, 390);
    await page.getByTestId('stadium-fullsize-btn').click();
    await expect(page.getByTestId('stadium-lightbox-modal')).toBeVisible();
    await page.screenshot({ path: 'test-results/round5-mobile-stadium-lightbox.png' });
    await page.getByLabel('Close Full-Size Stadium View').click();

    await page.getByRole('button', { name: /uniforms & gear/i }).click();
    await page.getByRole('button', { name: /relics & chemistry/i }).click();
    await expect(page.getByTestId('relic-locker-panel')).toBeVisible({ timeout: 10_000 });
    await expectNoHorizontalOverflow(page, 390);
    await page.screenshot({ path: 'test-results/round5-mobile-relic-locker.png' });

    expect(pageErrors).toEqual([]);
  });
});
