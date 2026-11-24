import { expect, test } from '@playwright/test';

test('wave the runner home after the opening groundout', async ({
  page,
  isMobile,
}, info) => {
  test.slow();
  await page.addInitScript(() => {
    const random = crypto.getRandomValues.bind(crypto);
    crypto.getRandomValues = (array) =>
      array instanceof Uint32Array && array.length === 1
        ? (array.fill(2089), array)
        : random(array);
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Bat with Marcus' }).click();
  const swing = page.getByRole('button', { name: 'Swing', exact: true });
  await swing.click();
  const next = page.getByRole('button', { name: 'Next batter' });
  await next.click({ timeout: 30000 });
  if (!isMobile) {
    await page.getByRole('button', { name: 'Camera angles' }).click();
    await page.getByRole('button', { name: 'Wide Cam' }).click();
  }
  await swing.click();
  const coach = page.getByRole('region', { name: 'Third-base coach' });
  await expect(coach).toContainText('Yuto Suzuki');
  const send = coach.getByRole('button', { name: 'Send home' });
  await expect(send).toBeEnabled();
  await expect(send).toBeInViewport();
  if (!isMobile) {
    await coach.getByRole('button', { name: 'Camera angles' }).click({ timeout: 5000 });
    await expect(coach.getByRole('button', { name: 'Wide Cam' })).toHaveAttribute('aria-pressed', 'true');
    await coach.getByRole('button', { name: 'Auto Cam' }).click();
  }
  await page.screenshot({ path: info.outputPath('third-base.png') });
  await coach
    .getByRole('button', { name: isMobile ? 'Hold at third' : 'Send home' })
    .click();
  const result = page.getByRole('region', { name: 'Play result' });
  await expect(result).toBeVisible({ timeout: 30000 });
  await expect(result).toContainText(isMobile ? 'third' : 'run scores');
  if (!isMobile)
    await page.screenshot({ path: info.outputPath('relay-home.png') });
  await expect(
    page.getByRole('region', { name: 'Third-base coach' }),
  ).toHaveCount(0);
});
