import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createPortraitTraits } from '../../art/portraits/generatePortrait';
import { SAMPLE_TEAM_PALETTES } from '../../art/themes/teamPalettes';
import { FlipBaseballCard, type BaseballCardPlayer } from './FlipBaseballCard';

const samplePlayer: BaseballCardPlayer = {
  id: 'p-1',
  name: 'Rico Comet',
  nickname: 'The Rocket Kid',
  position: 'SP',
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

    await user.click(screen.getByRole('button', { name: /flip rico comet card to stats/i }));
    expect(flipper).toHaveClass('is-flipped');

    await user.click(screen.getByRole('button', { name: /flip rico comet card to portrait/i }));
    expect(flipper).not.toHaveClass('is-flipped');

    await user.click(screen.getByRole('button', { name: /send to 3d/i }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
