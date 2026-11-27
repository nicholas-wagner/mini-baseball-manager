import { expect, test } from '@playwright/test';

test('talk to a teammate from the game recap and keep their off-field story', async ({ page }, testInfo) => {
  test.slow();
  await page.goto('/');
  await page.getByRole('button', {name:/^(Bat|Pitch) with /}).click();
  await page.getByRole('region', {name:'First at-bat'}).getByRole('button', {name:'More controls'}).click();
  const tactics = page.getByRole('button', {name:'Tactics', exact:true});
  if (await tactics.isVisible() && await tactics.getAttribute('aria-expanded') === 'false') {
    await tactics.click();
  }
  await page.getByTestId('fast-sim-toggle').click();
  await page.getByRole('button', {name:/sim to end/i}).click();
  const recap = page.getByRole('dialog', { name: /post-game box score/i });
  await recap.getByRole('tab', { name: /clubhouse/i }).click();
  const conversation = recap.getByRole('region', {name:'Off the Clock', exact:true});
  await conversation.getByText('Talk to a teammate').click();
  const select = conversation.getByRole('combobox', { name: 'Choose a teammate' });
  const option = select.locator('option[value^="mbm-"]').first();
  const id = await option.getAttribute('value');
  const [playerName] = (await option.innerText()).split(' · ');
  await select.selectOption(id!);
  await conversation.getByRole('button', {name:'Ask about the clue'}).click();
  await expect(conversation.locator('figcaption')).toContainText(playerName);
  const quote = await conversation.locator('blockquote').innerText();
  const print = conversation.locator('figure img');
  await expect(print).toHaveJSProperty('naturalWidth', 560);
  await expect(print).toHaveJSProperty('naturalHeight', 700);
  await conversation.scrollIntoViewIfNeeded();
  await page.screenshot({path:testInfo.outputPath('hobby-recap.png')});

  await recap.getByRole('button', { name: /back to clubhouse/i }).click();
  await page.reload();
  await page.getByTestId('open-trophy-case-btn').click();
  const album = page.getByRole('region', { name: 'Off the Clock album' });
  const entry = album.locator('details').filter({ has: page.locator('summary').filter({ hasText: playerName }) });
  await entry.locator('summary').click();
  await expect(entry.locator('blockquote')).toHaveText(quote);
  await expect(entry.locator('figure img')).toHaveJSProperty('naturalWidth', 560);
});
