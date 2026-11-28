import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createClub } from '../../engine/gm/rosterFactory';
import type { PolaroidKeepsake } from '../../engine/gm/polaroidKeepsakes';
import { createSeededRng } from '../../engine/rng/seededRng';
import { PolaroidKeepsakeCard } from './PolaroidKeepsakeCard';

function makeClub() {
  return createClub(createSeededRng(1220), {
    id: 'club-polaroid',
    city: 'Sandlot',
    name: 'Comets',
    mascot: 'Rocket Dog',
    colors: { primary: '#E63946', secondary: '#1D3557', accent: '#FFD166', monogram: 'SC' },
    leagueTier: 'rookie',
    isHuman: true,
  });
}

describe('PolaroidKeepsakeCard (TASK-122 Victory Keepsakes)', () => {
  it('renders retro Polaroid border, occasion ribbon, up to 3 manga portraits, mascot stamp, score footer & caption', () => {
    const club = makeClub();
    const polaroid: PolaroidKeepsake = {
      id: 'polaroid-s1-g5-walk_off',
      season: 1,
      occasion: 'walk_off',
      badgeLabel: 'WALK-OFF WIN!',
      headline: 'Walk-Off Magic at Sandlot Park!',
      caption: 'Strawberry milkshakes on the skipper with Rocket Dog after a 4-3 walk-off!',
      scoreLine: '4-3 vs Harbor Otters',
      stadiumName: club.stadium.name,
      playerIds: [club.roster[0].id, club.roster[1].id, club.roster[2].id, club.roster[3].id],
      playerNames: [club.roster[0].name, club.roster[1].name, club.roster[2].name, club.roster[3].name],
      createdAtGameNumber: 5,
    };

    render(<PolaroidKeepsakeCard polaroid={polaroid} club={club} />);

    expect(screen.getByTestId('polaroid-keepsake-card')).toBeInTheDocument();
    expect(screen.getByTestId('polaroid-occasion-ribbon')).toHaveTextContent('WALK-OFF WIN!');
    expect(screen.getByTestId('polaroid-mascot-stamp')).toBeInTheDocument();
    expect(screen.getAllByTestId('polaroid-player-portrait')).toHaveLength(3);
    expect(screen.getByText(/strawberry milkshakes on the skipper/i)).toBeInTheDocument();
    expect(screen.getByText(/4-3 vs harbor otters/i)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(club.stadium.name, 'i'))).toBeInTheDocument();
  });

  it('gracefully renders fallback portraits for archived/traded player IDs', () => {
    const club = makeClub();
    const polaroid: PolaroidKeepsake = {
      id: 'polaroid-s1-g9-boss_victory',
      season: 1,
      occasion: 'boss_victory',
      badgeLabel: 'BOSS DEFEATED!',
      headline: 'Toppled Iron Wolves!',
      caption: 'Rocket Dog celebrates with rally nachos!',
      scoreLine: '6-2 vs Iron Wolves',
      stadiumName: club.stadium.name,
      playerIds: ['former-legend-99'],
      playerNames: ['Sunny Blaze'],
      createdAtGameNumber: 9,
    };

    render(<PolaroidKeepsakeCard polaroid={polaroid} club={club} compact />);

    expect(screen.getByTestId('polaroid-occasion-ribbon')).toHaveTextContent('BOSS DEFEATED!');
    expect(screen.getAllByTestId('polaroid-player-portrait')).toHaveLength(1);
    expect(screen.getByAltText(/sunny blaze portrait/i)).toBeInTheDocument();
  });
});
