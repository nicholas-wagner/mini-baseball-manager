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

it('shows both faces of the catcher equipment in the rig inspector', () => {
  render(<DesignLabScreen />);
  expect(screen.getByText('Catcher · Front')).toBeVisible();
  expect(screen.getByText('Catcher · Back')).toBeVisible();
});

it('shows the selected showcase pitcher’s signature motion and plays it through Throw pitch', () => {
  render(<DesignLabScreen />);
  const mound = () => screen.getAllByTestId('mini-player-svg-front')[0].querySelector('[data-throw]');
  expect(screen.getByText('Sidearm · Front')).toBeVisible();
  const kiko = screen.getByRole('article', {name:'Kiko Tanaka baseball card front'});
  fireEvent.click(within(kiko).getByRole('button', {name:/send to 3d/i}));
  expect(screen.getByText('Underhand · Front')).toBeVisible();
  fireEvent.click(screen.getByRole('button', {name:'Throw pitch'}));
  expect(mound()).toHaveAttribute('data-throw','underhand');
});
