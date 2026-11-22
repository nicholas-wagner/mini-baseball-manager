import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createPortraitTraits } from '../../art/portraits/generatePortrait';
import { INITIAL_SHOWCASE_ROSTER } from '../../art/portraits/sampleRoster';
import { SAMPLE_TEAM_PALETTES } from '../../art/themes/teamPalettes';
import { FlipBaseballCard, type BaseballCardPlayer } from './FlipBaseballCard';

const samplePlayer: BaseballCardPlayer = {
  id: 'p-1',
  name: 'Rico Comet',
  nickname: 'The Rocket Kid',
  position: 'SP',
  bats: 'R',
  throws: 'R',
  jerseyNumber: 24,
  nationalityId: 'USA',
  hometown: 'Sandlot, OH',
  overall: 89,
  rarity: 'mvp',
  level: 7,
  popularity: 85,
  traits: createPortraitTraits(9401),
  specialPowers: ['Blazing Comet', 'Ice Veins'],
  stats: {
    contact: 62,
    power: 70,
    speed: 74,
    pitching: 94,
    fielding: 78,
  },
  bio: 'Throws a comet fastball so hot it toasts peanut shells in the front row.',
};

describe('FlipBaseballCard', () => {
  it('keeps a catalog athlete’s picture across trades, number changes, and game moods', () => {
    const player = INITIAL_SHOWCASE_ROSTER[1];
    const { rerender } = render(<FlipBaseballCard player={structuredClone(player)} team={SAMPLE_TEAM_PALETTES[0]} />);
    const picture = () => screen.getByRole('img', { name: 'Kiko Tanaka manga illustration' });
    const original = picture().getAttribute('src');
    expect(original).toContain('kiko');
    rerender(<FlipBaseballCard player={{ ...player, jerseyNumber: 83 }} team={SAMPLE_TEAM_PALETTES[1]} mood="rival_glare" />);
    expect(picture()).toHaveAttribute('src', original);
    expect(screen.getByText('#83')).toBeInTheDocument();
    expect(screen.getByLabelText('Club BP')).toBeInTheDocument();
    rerender(<FlipBaseballCard player={{ ...player, id: 'different-athlete' }} team={SAMPLE_TEAM_PALETTES[1]} mood="rival_glare" />);
    expect(screen.queryByRole('img', { name: 'Kiko Tanaka manga illustration' })).toBeNull();
    expect(screen.getByRole('img', { name: 'Portrait pending' })).toBeInTheDocument();
  });

  it('has a distinct illustration and stable identity for everyone in the 75/25 pool', () => {
    const players = INITIAL_SHOWCASE_ROSTER;
    const femaleCount = players.filter(p => p.traits.playerLook === 'female').length;
    expect(femaleCount).toBeGreaterThanOrEqual(Math.floor(players.length / 4));
    expect(femaleCount).toBeLessThanOrEqual(Math.ceil(players.length / 4));
    expect(players.filter(p => p.traits.playerLook === 'male')).toHaveLength(players.length - femaleCount);
    expect(new Set(players.map(p => p.id)).size).toBe(players.length);
    expect(new Set(players.map(p => p.illustration)).size).toBe(players.length);
  });

  it('uses the same pending art for unillustrated players across positions, teams and moods', () => {
    const { rerender } = render(<FlipBaseballCard player={samplePlayer} team={SAMPLE_TEAM_PALETTES[0]} />);
    const pending = () => screen.getByRole('img', { name: 'Portrait pending' });
    const image = pending().getAttribute('src');
    expect(image).toBeTruthy();
    rerender(<FlipBaseballCard player={{ ...samplePlayer, id: 'another-recruit', position: 'C', traits: createPortraitTraits(17) }}
      team={SAMPLE_TEAM_PALETTES[1]} mood="fired_up" />);
    expect(pending()).toHaveAttribute('src', image);
  });

  it('renders front portrait, flag badge, heritage ability, and flips cleanly to stats back', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    const { container } = render(
      <FlipBaseballCard player={samplePlayer} team={SAMPLE_TEAM_PALETTES[0]} onSelect={onSelect} />,
    );

    expect(screen.getAllByText('Rico Comet').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Blazing Comet')).toBeInTheDocument();
    expect(screen.getAllByText(/eagle soar/i)).toHaveLength(2);
    expect(screen.getAllByRole('img', { name: /usa flag/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('MVP HOLO FOIL')).toBeInTheDocument();

    const flipper = container.querySelector('.card-flipper');
    expect(flipper).not.toHaveClass('is-flipped');
    expect(screen.queryByRole('button', { name: /card to portrait/i })).toBeNull();

    await user.click(screen.getByRole('button', { name: /flip rico comet card to stats/i }));
    expect(flipper).toHaveClass('is-flipped');
    expect(screen.getByText(samplePlayer.bio)).toBeVisible();

    await user.click(screen.getByRole('button', { name: /flip rico comet card to portrait/i }));
    expect(flipper).not.toHaveClass('is-flipped');

    await user.click(screen.getByRole('button', { name: /send to 3d/i }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});

it('falls back to the pending print if a catalog asset fails and shows the next healthy portrait', () => {
  const [first, second] = INITIAL_SHOWCASE_ROSTER;
  const team = SAMPLE_TEAM_PALETTES[0];
  const { rerender } = render(<FlipBaseballCard player={first} team={team} />);
  fireEvent.error(screen.getByRole('img', { name: first.name + ' manga illustration' }));
  expect(screen.getByRole('img', { name: 'Portrait pending' })).toBeInTheDocument();
  rerender(<FlipBaseballCard player={second} team={team} />);
  expect(screen.getByRole('img', { name: second.name + ' manga illustration' })).toHaveAttribute('src', second.illustration);
});
