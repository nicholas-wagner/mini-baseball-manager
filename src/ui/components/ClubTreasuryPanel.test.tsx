import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useFoilPackStore } from '../../store/foilPackStore';
import { useGameStore } from '../../store/gameStore';
import { AppShell } from '../design-system/AppShell';
import { ClubTreasuryPanel } from './ClubTreasuryPanel';

function TreasuryHarness() {
  const club = useGameStore((state) => state.getHumanClub());
  const seriesIndex = useGameStore((state) => state.currentSeriesIndex);
  if (!club) return null;
  return (
    <ClubTreasuryPanel
      club={club}
      seriesIndex={seriesIndex}
      onNotice={() => undefined}
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
});
