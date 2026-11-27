import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isPitcherPosition } from '../../engine/models/player';
import { computeCoreRatingSum } from '../../engine/rpg/trainingCompromises';
import { useFoilPackStore } from '../../store/foilPackStore';
import { useGameStore } from '../../store/gameStore';
import { AppShell } from '../design-system/AppShell';
import { ClubTreasuryPanel } from './ClubTreasuryPanel';

function TreasuryHarness({ onNotice = () => undefined }: { onNotice?: (msg: string) => void }) {
  const club = useGameStore((state) => state.getHumanClub());
  const seriesIndex = useGameStore((state) => state.currentSeriesIndex);
  if (!club) return null;
  return (
    <ClubTreasuryPanel
      club={club}
      seriesIndex={seriesIndex}
      onNotice={onNotice}
      onJump={() => undefined}
    />
  );
}

describe('TASK-108 Club Treasury', () => {
  beforeEach(() => {
    useFoilPackStore.getState().resetPacks();
    useGameStore.getState().startNewCareer({
      city: 'Sandlot',
      clubName: 'Comets',
      mascot: 'Rocket Dog',
      monogram: 'SC',
      primaryColor: '#E63946',
      secondaryColor: '#1D3557',
      accentColor: '#FFD166',
      managerName: 'Coach Skip',
      seed: 108,
    });
  });

  it('buys a bronze foil pack, hosts one feast, and books a promo with club cash', () => {
    render(<TreasuryHarness />);
    const before = useGameStore.getState().getHumanClub()!.economy.cash;
    const packsBefore = useFoilPackStore.getState().unopenedPacks.length;

    fireEvent.click(screen.getByTestId('buy-foil-sandlot_foil'));
    expect(useGameStore.getState().getHumanClub()!.economy.cash).toBe(before - 1_200);
    expect(useFoilPackStore.getState().unopenedPacks.length).toBe(packsBefore + 1);
    expect(screen.getByTestId('treasury-cash')).toHaveTextContent((before - 1_200).toLocaleString());

    const beforeFeast = useGameStore.getState().getHumanClub()!;
    fireEvent.click(screen.getByTestId('host-feast'));
    const afterFeast = useGameStore.getState().getHumanClub()!;
    expect(afterFeast.economy.cash).toBe(beforeFeast.economy.cash - 750);
    expect(afterFeast.economy.spaUsedInSeriesIndex).toBe(0);
    expect(afterFeast.roster[0].fatigue).toBeLessThanOrEqual(beforeFeast.roster[0].fatigue);
    fireEvent.click(screen.getByTestId('host-feast'));
    expect(useGameStore.getState().getHumanClub()!.economy.cash).toBe(afterFeast.economy.cash);

    fireEvent.click(screen.getByTestId('book-promo-bobblehead_night'));
    const booked = useGameStore.getState().getHumanClub()!;
    expect(booked.economy.scheduledPromoId).toBe('bobblehead_night');
    expect(booked.economy.cash).toBe(afterFeast.economy.cash - 650);
    expect(screen.getByTestId('promo-booked')).toHaveTextContent(/booked for next home game/i);
    expect(screen.getByTestId('treasury-cap-meter')).toBeInTheDocument();
  });

  it('opens the treasury from the persistent cash pill', () => {
    const onOpenTreasury = vi.fn();
    render(
      <AppShell
        clubName="Sandlot Comets"
        leagueLabel="ROOKIE"
        navItems={[]}
        activeTab="gameday"
        onSelectTab={() => undefined}
        muted={false}
        onToggleMute={() => undefined}
        cashDisplay={{ amount: 12450, capStatus: 'healthy', onOpenTreasury }}
      >
        <div>Field</div>
      </AppShell>,
    );
    fireEvent.click(screen.getByTestId('club-cash-pill-mobile'));
    expect(onOpenTreasury).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('club-cash-pill-mobile')).toHaveTextContent('$12.5k');
  });

  it('spends cash in Power-Up Camp for role-specific stats, shows budget-trim note, and updates live cash HUD (TASK-115)', () => {
    const state = useGameStore.getState();
    const club = state.getHumanClub()!;
    const hitter = club.roster.find((p) => !isPitcherPosition(p.position))!;
    const pitcher = club.roster.find((p) => isPitcherPosition(p.position))!;

    // Set hitter with clean trainable power (65/88 -> $600) and budget full to verify 1-line note
    const tunedRoster = club.roster.map((p) => {
      if (p.id === hitter.id) {
        const ratings = { ...p.ratings, power: 65 };
        return {
          ...p,
          ratings,
          statCaps: { ...p.statCaps, power: 88 },
          totalRatingBudget: computeCoreRatingSum({ position: p.position, ratings }),
        };
      }
      if (p.id === pitcher.id) {
        return {
          ...p,
          ratings: { ...p.ratings, velocity: 72 },
          statCaps: { ...p.statCaps, velocity: 90 },
        };
      }
      return p;
    });
    const tunedClub = { ...club, roster: tunedRoster, economy: { ...club.economy, cash: 5_000 } };
    useGameStore.setState({
      leagues: {
        ...state.leagues,
        [club.leagueTier]: state.leagues[club.leagueTier].map((c) => (c.id === club.id ? tunedClub : c)),
      },
    });

    const onNotice = vi.fn();
    render(<TreasuryHarness onNotice={onNotice} />);

    const camp = screen.getByTestId('power-up-camp');
    const select = within(camp).getByTestId('power-up-player-select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: hitter.id } });

    expect(within(camp).getByTestId('power-up-budget-note')).toHaveTextContent(/budget full/i);
    const powerBtn = within(camp).getByTestId('power-up-stat-power');
    expect(powerBtn).toHaveTextContent(/65 \/ 88/);
    expect(powerBtn).toHaveTextContent(/\$600/);
    expect(within(camp).queryByTestId('power-up-stat-velocity')).toBeNull();

    fireEvent.click(powerBtn);

    const updatedClub = useGameStore.getState().getHumanClub()!;
    const updatedHitter = updatedClub.roster.find((p) => p.id === hitter.id)!;
    expect(updatedClub.economy.cash).toBe(4_400);
    expect(updatedHitter.ratings.power).toBe(66);
    expect(screen.getByTestId('treasury-cash')).toHaveTextContent('4,400');
    expect(onNotice).toHaveBeenCalledWith(expect.stringMatching(/\+1 Power for .*-\$600/));

    // Switching to pitcher swaps buttons to pitching stats (Velocity, Movement, Control, Stamina, Clutch)
    fireEvent.change(select, { target: { value: pitcher.id } });
    expect(within(camp).getByTestId('power-up-stat-velocity')).toHaveTextContent(/72 \/ 90/);
    expect(within(camp).queryByTestId('power-up-stat-power')).toBeNull();
  });
});
