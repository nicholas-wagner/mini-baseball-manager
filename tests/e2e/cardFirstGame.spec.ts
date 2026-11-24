import { expect, test } from '@playwright/test';

test('Opening Day print, live matchup and final rematch work on the first screen', async ({ page }) => {
  test.slow();
  await page.goto('/');
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
  const guide = page.getByRole('region',{name:'First at-bat'});
  await guide.getByRole('button',{name:'More controls'}).click();
  const tactics = page.getByRole('button', { name:'Tactics', exact:true });
  if (await tactics.isVisible()) await tactics.click();
  await page.getByTestId('fast-sim-toggle').click();
  await page.getByRole('button', { name: /sim to end/i }).click();
  const recap = page.getByRole('dialog', { name: /post-game box score/i });
  const again = recap.getByRole('button', { name: /rematch/i });
  await expect(again).toBeInViewport({ ratio: 1 });
  const keepsake = recap.getByRole('region',{name:'Scorebook prints'});
  const scorer = await keepsake.getByRole('heading').innerText();
  await keepsake.getByRole('button',{name:'Keep this moment'}).click();
  await expect(recap.getByRole('button',{name:/In your album/})).toBeDisabled();
  await again.click();
  await expect(recap).toHaveCount(0);
  await expect(page.getByTestId('live-game-3d-canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Dugout', exact:true }).click();
  await page.getByRole('dialog', { name: 'Dugout', exact:true }).getByRole('button', {name:'Roster', exact:true}).click();
  await page.getByTestId('roster-view-cards-btn').click();
  await page.getByTestId('roster-view-gallery-btn').click();
  const gallery = page.getByRole('region', { name: 'Roster print gallery' });
  await gallery.getByRole('button').first().click();
  const enlarged = page.locator('dialog:modal');
  await expect(enlarged.locator('img')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(enlarged).toHaveCount(0);
  await page.reload();
  const albumButton = page.getByRole('button',{name:/Trophy and Sticker Album|Trophy & Sticker Album/i}).locator('visible=true').first();
  if (!await albumButton.count()) await page.getByRole('button',{name:'Open clubhouse menu'}).click();
  await albumButton.click();
  await expect(page.getByRole('region',{name:'Scorebook prints'}).getByRole('heading')).toHaveText(scorer);
});

test('a replay keeps the first out and hands the same rally to Ethan', async ({ page }) => {
  test.slow();
  await page.addInitScript(() => {
    const random = crypto.getRandomValues.bind(crypto);
    crypto.getRandomValues = array => array instanceof Uint32Array && array.length === 1
      ? (array.fill(2089), array) : random(array);
  });
  await page.goto('/');
  await page.getByRole('button', {name:'Bat with Marcus'}).click();
  const guide = page.getByRole('region', {name:'First at-bat'});
  const line = page.getByRole('button', {name:'Toggle line score'});
  await line.click();
  await expect(page.getByTestId('scoreboard-home-rhe')).toBeVisible();
  await line.click();
  await expect(guide).toContainText('Easier to connect. Less power.');
  await guide.getByRole('button', {name:'Power'}).click();
  await expect(guide).toContainText('More power. Easier to miss.');
  await expect(guide.getByRole('button', {name:'Swing'})).toBeInViewport({ratio:1});
  await guide.getByRole('button', {name:'Swing'}).click();
  const result = page.getByRole('region', {name:'Play result'});
  await expect(result.getByRole('heading')).toHaveText('Marcus Baker', {timeout:20000});
  await result.getByText('Scoring detail').click();
  await expect(result).toContainText(/to first · [456]–3/);
  await result.getByRole('button', {name:'Watch again'}).click();
  await expect(result.getByRole('heading')).toHaveText('Marcus Baker', {timeout:20000});
  await expect(result).toContainText('Both runners hold.');
  await result.getByRole('button', {name:'Next batter'}).click();
  await expect(page.getByRole('group', {name:'Matchup cards'})).toContainText('Ethan Torres');
  await expect(guide).toContainText('One out. A single could score a run.');
});

test('a pitching opener keeps the named pitcher through a first strikeout', async ({ page }) => {
  test.slow();
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.addInitScript(() => {
    const random = crypto.getRandomValues.bind(crypto);
    crypto.getRandomValues = array => array instanceof Uint32Array && array.length === 1
      ? (array.fill(1994), array) : random(array);
  });
  await page.goto('/');
  await page.getByRole('button', {name:'Pitch with Jasper'}).click();
  const guide = page.getByRole('region', {name:'First at-bat'});
  await guide.getByRole('button', {name:'Corner', exact:true}).click();
  const pitch = guide.getByRole('button', {name:'Pitch to the corner'});
  const result = page.getByRole('region', {name:'Play result'});
  for (let i = 0; i < 12; i++) {
    await pitch.click();
    await expect(result.or(pitch.and(page.locator(':enabled')))).toBeVisible({timeout:20000});
    if (await result.count()) break;
  }
  await expect(result.getByRole('heading')).toHaveText('Jasper Hunter');
  await expect(result).toContainText('Jasper strikes out Ariel.');
});

test('the first pitch, field and handoff share a phone screen and survive visiting the dugout', async ({page, isMobile}) => {
  test.slow();
  const size = isMobile ? {width:360,height:640} : {width:844,height:390};
  await page.setViewportSize(size);
  await page.addInitScript(() => {
    const random = crypto.getRandomValues.bind(crypto);
    crypto.getRandomValues = array => array instanceof Uint32Array && array.length === 1
      ? (array.fill(2089), array) : random(array);
  });
  await page.goto('/');
  const start = page.getByRole('button',{name:'Bat with Marcus'});
  await expect(start).toBeInViewport({ratio:1});
  await start.click();
  const swing = page.getByRole('button',{name:'Swing',exact:true});
  const field = page.getByTestId('live-game-3d-canvas');
  await expect(swing).toBeInViewport({ratio:1});
  await expect(field).toBeInViewport({ratio:1});
  await expect(page.getByRole('navigation',{name:'Mobile Navigation'})).toBeHidden();
  const box = (await swing.boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(48);
  if (!isMobile) expect((await field.boundingBox())!.x + (await field.boundingBox())!.width).toBeLessThan(box.x);
  await page.getByRole('button',{name:'Power',exact:true}).click();
  await swing.click();
  const next = page.getByRole('button',{name:'Next batter'});
  await expect(next).toBeVisible({timeout:20000});
  await expect(next).toBeInViewport({ratio:1});
  expect(Math.abs((await next.boundingBox())!.y - box.y)).toBeLessThan(12);
  await next.click();
  await page.getByRole('button',{name:'Dugout',exact:true}).click();
  await page.getByRole('dialog',{name:'Dugout'}).getByRole('button',{name:'Roster',exact:true}).click();
  await expect(page.getByTestId('roster-view-cards-btn')).toBeVisible();
  await page.getByRole('button',{name:'Play Ball',exact:true}).locator('visible=true').first().click();
  await expect(page.getByRole('group',{name:'Matchup cards'})).toContainText('Ethan Torres');
  await expect(page.getByRole('button',{name:'Toggle line score'})).toContainText('1 out');
  await expect(swing).toBeInViewport({ratio:1});
});

test('a compact phone keeps the chosen call, primary action and field together after rotation', async ({page, isMobile}) => {
  test.skip(!isMobile, 'Compact phone layout');
  test.slow();
  await page.addInitScript(() => {
    const random = crypto.getRandomValues.bind(crypto);
    crypto.getRandomValues = a => a instanceof Uint32Array && a.length === 1 ? (a.fill(1994), a) : random(a);
  });
  await page.setViewportSize({width:360,height:640});
  await page.goto('/');
  const customize = page.getByRole('button', {name:'Change club'});
  await expect(customize).toBeInViewport({ratio:1});
  const target = (await customize.boundingBox())!;
  expect(Math.min(target.width, target.height)).toBeGreaterThanOrEqual(44);
  await customize.tap();
  const useClub = page.getByRole('button', {name:'Use this club'});
  await expect(useClub).toBeInViewport({ratio:1});
  await useClub.click();
  await page.getByRole('button',{name:'Pitch with Jasper'}).click();
  await page.getByRole('button',{name:'More controls'}).click();
  for (const size of [{width:360,height:640},{width:390,height:844},{width:844,height:390}]) {
    await page.setViewportSize(size);
    await expect(page.getByTestId('live-game-3d-canvas')).toBeInViewport({ratio:1});
    await expect(page.getByRole('button',{name:/throw pitch \(next pitch\)/i})).toBeInViewport({ratio:1});
    await expect(page.getByTestId('arcade-call-bar').getByRole('button',{pressed:true})).toBeInViewport({ratio:1});
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(size.width);
  }
  await expect(page.getByTestId('arcade-speed-toggle')).toBeHidden();
  const tactics = page.getByRole('button',{name:'Tactics'});
  await tactics.click();
  await expect(page.getByTestId('arcade-speed-toggle')).toBeVisible();
  await tactics.click();
  await page.setViewportSize({width:360,height:740});
  for (const sign of await page.getByTestId('arcade-pitch-sign-bar').getByRole('button').all()) {
    const rect = (await sign.boundingBox())!;
    expect(Math.min(rect.width,rect.height)).toBeGreaterThanOrEqual(48);
  }
  await page.getByRole('button',{name:'Dugout',exact:true}).click();
  await page.getByRole('dialog',{name:'Dugout'}).getByRole('button',{name:'Roster'}).click();
  await page.setViewportSize({width:360,height:640});
  await page.getByTestId('roster-view-cards-btn').click();
  const firstName = page.getByTestId('binder-card-open-btn').first().locator('.binder-name');
  await expect(firstName).toBeInViewport({ratio:1});
  expect(await firstName.evaluate(el => {
    const r = el.getBoundingClientRect();
    return el.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2));
  })).toBe(true);
});
