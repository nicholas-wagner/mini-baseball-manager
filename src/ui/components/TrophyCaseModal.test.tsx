import { act, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '../../store/gameStore';
import { TrophyCaseModal } from './TrophyCaseModal';

describe('TrophyCaseModal — 📸 Victory Polaroids Shelf (TASK-122)', () => {
  beforeEach(() => {
    useGameStore.getState().startNewCareer({
      city: 'Sandlot',
      clubName: 'Comets',
      mascot: 'Rocket Dog',
      monogram: 'SC',
      primaryColor: '#E63946',
      secondaryColor: '#1D3557',
      accentColor: '#FFD166',
      managerName: 'Coach Skip',
      seed: 1221,
    });
  });

  it('shows empty Victory Polaroids prompt before first marquee win and renders snapped keepsakes afterward', () => {
    const { rerender } = render(<TrophyCaseModal open onClose={vi.fn()} />);

    const emptyShelf = screen.getByTestId('trophy-polaroids-shelf');
    expect(emptyShelf).toHaveTextContent(/victory polaroids \(0\)/i);
    expect(emptyShelf).toHaveTextContent(/snap your first victory polaroid/i);

    const state = useGameStore.getState();
    const club = state.getHumanClub()!;
    const updatedClub = {
      ...club,
      polaroids: [
        {
          id: 'polaroid-s1-g1-boss_victory',
          season: 1,
          occasion: 'boss_victory' as const,
          badgeLabel: 'BOSS DEFEATED!',
          headline: 'Toppled Iron Wolves!',
          caption: 'Rocket Dog celebrates with rally nachos after taking down Iron Wolves 6-2!',
          scoreLine: '6-2 vs Iron Wolves',
          stadiumName: club.stadium.name,
          playerIds: [club.roster[0].id, club.roster[1].id, club.roster[2].id],
          playerNames: [club.roster[0].name, club.roster[1].name, club.roster[2].name],
          createdAtGameNumber: 1,
        },
      ],
    };
    act(() => {
      useGameStore.setState({
        leagues: {
          ...state.leagues,
          [club.leagueTier]: state.leagues[club.leagueTier].map((c) =>
            c.id === club.id ? updatedClub : c,
          ),
        },
      });
    });

    rerender(<TrophyCaseModal open onClose={vi.fn()} />);

    const shelf = screen.getByTestId('trophy-polaroids-shelf');
    expect(shelf).toHaveTextContent(/victory polaroids \(1\)/i);
    expect(within(shelf).getByTestId('polaroid-occasion-ribbon')).toHaveTextContent('BOSS DEFEATED!');
    expect(within(shelf).getByText(/rally nachos/i)).toBeInTheDocument();
  });
});
