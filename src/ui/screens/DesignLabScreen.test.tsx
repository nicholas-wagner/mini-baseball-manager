import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { DesignLabScreen } from './DesignLabScreen';

vi.mock('../components/BallparkCanvas', () => ({ BallparkCanvas: () => null }));

it('replaces the rolled preview at the start of the shelf and keeps every illustration', () => {
  render(<DesignLabScreen />);
  const cards = screen.getByRole('region', { name: 'Player cards' });
  const firstPlayer = () => within(cards).getAllByRole('article')[0].getAttribute('aria-label');
  const original = firstPlayer();
  const illustrated = () => within(cards).getAllByRole('img', { name: /manga illustration$/ });
  const originalPrints = illustrated().map((image) => image.getAttribute('alt'));
  cards.scrollLeft = 500;
  fireEvent.click(screen.getByRole('button', { name: 'Roll Weighted Player' }));
  expect(firstPlayer()).not.toBe(original);
  expect(cards.scrollLeft).toBe(0);
  const firstRoll = firstPlayer();
  fireEvent.click(screen.getByRole('button', { name: 'Roll Weighted Player' }));
  expect(firstPlayer()).not.toBe(firstRoll);
  expect(within(cards).getAllByRole('img', { name: 'Portrait pending' })).toHaveLength(1);
  expect(illustrated().map((image) => image.getAttribute('alt'))).toEqual(originalPrints);
});

it('can throw from the viewport and replay the chosen swing from the current camera', () => {
  render(<DesignLabScreen />);
  fireEvent.click(screen.getByRole('button', { name: 'Throw pitch' }));
  expect(screen.getByRole('button', { name: 'Replay Blazing Comet' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Bomb-Swing HR' }));
  const wide = screen.getByRole('button', { name: 'Wide Ballpark' });
  fireEvent.click(wide);
  fireEvent.click(screen.getByRole('button', { name: 'Replay Bomb-Swing HR' }));
  expect(wide).toHaveAttribute('aria-pressed', 'true');
});

it('shows the selected painted pitcher and delivery without a model selector', () => {
  render(<DesignLabScreen />);
  expect(screen.queryByRole('group', { name: 'Pitcher model' })).not.toBeInTheDocument();
  expect(screen.queryByText(/classic mini rig inspector/i)).not.toBeInTheDocument();
  expect(screen.getByText(/Rico Comet #24.*sidearm/i)).toBeVisible();
  const card = screen.getByRole('article', {name:'Kiko Tanaka baseball card front'});
  fireEvent.click(within(card).getByRole('button', {name:/send to 3d/i}));
  expect(screen.getByText(/Kiko Tanaka #.*underhand/i)).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Throw pitch' }));
  expect(screen.getByRole('button', {name:'Replay Blazing Comet'})).toBeVisible();
});

it('browses permanent identities in small pages and returns to the original shelf', () => {
  render(<DesignLabScreen />);
  fireEvent.click(screen.getByRole('button', { name: 'Next players' }));
  expect(screen.getByText('14–26 of 3,000')).toBeVisible();
  const cards = screen.getByRole('region', { name: 'Player cards' });
  expect(within(cards).getAllByRole('article')).toHaveLength(13);
  fireEvent.click(screen.getByRole('button', { name: 'Previous players' }));
  expect(within(cards).getByRole('article', { name: 'Kiko Tanaka baseball card front' })).toBeVisible();
});

it('keeps the painted lineup across player, palette and camera changes', () => {
  render(<DesignLabScreen />);
  fireEvent.click(screen.getByRole('button', { name: 'Pitcher OTS 3D' }));
  const kiko = screen.getByRole('article', { name: 'Kiko Tanaka baseball card front' });
  fireEvent.click(within(kiko).getByRole('button', { name: /send to 3d/i }));
  fireEvent.click(screen.getByRole('button', { name: 'Bayview Pelicans' }));
  expect(screen.getByRole('button', { name: 'Pitcher OTS 3D' })).toHaveAttribute('aria-pressed', 'true');
});

it('can replay a groundout, a force at second and relay to first, a pop fly, and a bunt out', () => {
  render(<DesignLabScreen />);
  for (const label of ['Groundout to short', '6–4–3 Double Play', 'Infield Pop Fly', 'Bunt Throwout']) {
    fireEvent.click(screen.getByRole('button', { name: label }));
    expect(screen.getByRole('button', { name: 'Replay ' + label })).toBeVisible();
  }
}, 30_000);
