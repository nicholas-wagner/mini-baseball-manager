import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useFoilPackStore } from '../../store/foilPackStore';
import { useGameStore } from '../../store/gameStore';
import { useUserPreferencesStore } from '../../store/userPreferences';
import { GameDayScreen } from '../screens/GameDayScreen';

describe('GM Season Pulse UI: Promotion Chase, Series Gameplan, Incoming Inbox & Breakout Watch', () => {
  beforeEach(() => {
    useUserPreferencesStore.getState().resetDefaults();
    useFoilPackStore.getState().resetPacks();
    useGameStore.getState().startNewCareer({
      city: 'Sandlot',
      clubName: 'Comets',
      mascot: 'Rocket',
      monogram: 'SC',
      primaryColor: '#E63946',
      secondaryColor: '#1D3557',
      accentColor: '#FFC300',
      managerName: 'Coach Skip',
      seed: 1994,
    });
  });

  it('renders Promotion Chase Strip, 1-tap Series Gameplan Picker, Tired Starter Swap, Breakout Spotlight, and Incoming GM Inbox Cards', () => {
    // Prime a tired scheduled starter + breakout hitter in slot 6 so every contextual strip renders
    const club = useGameStore.getState().getHumanClub()!;
    const scheduledAceId = club.rotationIds[club.rotationCursor % club.rotationIds.length];
    const breakoutHitterId = club.lineup[5].playerId;
    useGameStore.setState((s) => ({
      leagues: {
        ...s.leagues,
        [club.leagueTier]: s.leagues[club.leagueTier].map((c) =>
          c.id === club.id
            ? {
                ...c,
                roster: c.roster.map((p) => {
                  if (p.id === scheduledAceId) return { ...p, fatigue: 64 };
                  if (p.id === breakoutHitterId) return { ...p, age: 21, level: 1, xp: 180, formScore: 24 };
                  return p;
                }),
              }
            : c,
        ),
      },
    }));

    render(<GameDayScreen />);
    fireEvent.click(screen.getByTestId('opening-day-more-toggle'));

    // 1. Live Promotion Chase & Owner Goal strip
    expect(screen.getByTestId('promotion-chase-strip')).toBeInTheDocument();

    // 2. Pre-Series Gameplan 4-card trade-off picker
    fireEvent.click(screen.getByTestId('gameplan-toggle'));
    expect(screen.getByTestId('series-gameplan-picker')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /swing for the fences/i }));
    expect(useGameStore.getState().activeGameplan).toBe('swing_fences');
    expect(screen.queryByTestId('series-gameplan-picker')).not.toBeInTheDocument();

    // 3. Tired Scheduled Starter 1-tap swap
    expect(screen.getByTestId('tired-starter-alert')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /start fresh arm/i }));
    expect(screen.queryByTestId('tired-starter-alert')).not.toBeInTheDocument();

    // 4. Breakout / Hot-Hand Watch + 1-tap Spotlight in Lineup
    expect(screen.getByTestId('breakout-watch-strip')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /spotlight #1/i }));
    expect(useGameStore.getState().getHumanClub()!.lineup[0].playerId).toBe(breakoutHitterId);

    // 5. Simming a series delivers an Incoming GM Inbox Card (Trade Offer or Clubhouse Dilemma)
    fireEvent.click(screen.getByRole('button', { name: /sim next 3-game series/i }));
    expect(screen.getByTestId('gm-inbox-event-card')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('gm-inbox-choice-0'));
    expect(screen.queryByTestId('gm-inbox-event-card')).not.toBeInTheDocument();
    expect(screen.getByTestId('gm-quick-feedback').textContent?.length).toBeGreaterThan(5);
  });
});
