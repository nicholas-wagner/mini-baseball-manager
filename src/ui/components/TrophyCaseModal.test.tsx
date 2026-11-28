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

  it('renders the compact Franchise Records shelf cleanly for empty and populated club records (TASK-124)', () => {
    const { rerender } = render(<TrophyCaseModal open onClose={vi.fn()} />);

    const emptyRecordsShelf = screen.getByTestId('trophy-franchise-records-shelf');
    expect(emptyRecordsShelf).toHaveTextContent(/franchise records/i);
    expect(emptyRecordsShelf).toHaveTextContent(/longest hr/i);

    const state = useGameStore.getState();
    const club = state.getHumanClub()!;
    const slugger = club.roster[0];
    const ace = club.roster.find((p) => p.position === 'SP') ?? club.roster[1];
    const updatedClub = {
      ...club,
      franchiseRecords: {
        longestHomeRunFt: {
          value: 441,
          holderName: slugger.name,
          holderId: slugger.id,
          season: 1,
          detail: '441 FT (114 MPH)',
        },
        mostSingleGameStrikeouts: {
          value: 11,
          holderName: ace.name,
          holderId: ace.id,
          season: 1,
          detail: '11 Ks in 1 game',
        },
        mostSingleGameHits: {
          value: 4,
          holderName: slugger.name,
          holderId: slugger.id,
          season: 1,
          detail: '4-for-4 game',
        },
        longestWinStreak: {
          value: 5,
          holderName: `${club.city} ${club.name}`,
          holderId: club.id,
          season: 1,
          detail: '5-Game Win Streak',
        },
        currentWinStreak: 3,
        mostSeasonHomeRuns: {
          value: 14,
          holderName: slugger.name,
          holderId: slugger.id,
          season: 1,
          detail: '14 HR (S1)',
        },
        mostSeasonStolenBases: {
          value: 18,
          holderName: slugger.name,
          holderId: slugger.id,
          season: 1,
          detail: '18 SB (S1)',
        },
      },
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

    const recordsShelf = screen.getByTestId('trophy-franchise-records-shelf');
    expect(recordsShelf).toHaveTextContent('441 FT');
    expect(recordsShelf).toHaveTextContent('11 K');
    expect(recordsShelf).toHaveTextContent('4 H');
    expect(recordsShelf).toHaveTextContent('5 W');
    expect(recordsShelf).toHaveTextContent('14 HR');
    expect(recordsShelf).toHaveTextContent('18 SB');
    expect(recordsShelf).toHaveTextContent(slugger.name);
    expect(recordsShelf).toHaveTextContent(ace.name);
  });
});
