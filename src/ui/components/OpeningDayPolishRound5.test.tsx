import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../App';
import type { PlayEvent } from '../../engine/models/playEvent';
import { useFoilPackStore } from '../../store/foilPackStore';
import { useGameStore } from '../../store/gameStore';
import { useUserPreferencesStore } from '../../store/userPreferences';
import { ClubCreatorScreen } from '../screens/ClubCreatorScreen';
import { GameDayScreen } from '../screens/GameDayScreen';
import { MatchupPrints } from './GameDayPrints';
import { LiveActionBar } from './LiveActionBar';
import { LiveGameCanvas } from './LiveGameCanvas';
import { PostGameSummaryModal } from './PostGameSummaryModal';
import { createGameSession } from '../../engine/simulation/baseballEngine';

describe('Opening Day Polish Round 5 (Clean Badges, Unified Opening Story, 2-Row Mobile Controls, Warm MVP & Living Matchup Cards)', () => {
  beforeEach(() => {
    useUserPreferencesStore.getState().resetDefaults();
    useFoilPackStore.getState().resetPacks();
    useGameStore.getState().startNewCareer({
      city: 'Sandlot',
      clubName: 'Comets',
      mascot: 'Rocket Dog',
      monogram: 'SC',
      primaryColor: '#E63946',
      secondaryColor: '#1D3557',
      accentColor: '#FFC300',
      managerName: 'Coach Skip',
      seed: 1994,
    });
  });

  it('shows ⚡ 3 (not 21) and suppresses Ballpark ⬆ & Menu dot before Game 1 on App', () => {
    useFoilPackStore.getState().awardPack('sandlot_foil', 'Opening Day Gift!');
    render(<App />);

    expect(screen.getAllByText('⚡ 3').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('⚡ 21')).not.toBeInTheDocument();
    expect(screen.queryByText('⬆')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mobile-menu-badge-dot')).not.toBeInTheDocument();
  });

  it('fans 3 real manga player cards in the ClubCreatorScreen hero beside the mascot', () => {
    render(<ClubCreatorScreen onCreated={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Change club' }));

    const fan = screen.getByTestId('creator-manga-fan');
    const imgs = within(fan).getAllByRole('img') as HTMLImageElement[];
    expect(imgs).toHaveLength(3);
    for (const img of imgs) {
      expect(img.src).toMatch(/\.png|data:image/i);
    }
  });

  it('unifies Opening Day into 3 calm moments with a 1-tap Full Season & GM Options toggle and auto-expands after Game 1', () => {
    useFoilPackStore.getState().awardPack('sandlot_foil', 'Opening Day Gift!');
    const { unmount } = render(<GameDayScreen />);

    // 3 calm Opening Day moments visible immediately
    expect(screen.getByRole('region', { name: 'Opening Day feature' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /rip foil pack/i })).toBeNull();
    expect(screen.getByTestId('meet-your-squad-card')).toBeInTheDocument();

    // Competing matchup card & GM clipboard start tucked behind 1-tap toggle on Opening Day
    const toggle = screen.getByTestId('opening-day-more-toggle');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('scheduled-matchup-card')).not.toBeInTheDocument();
    expect(screen.queryByTestId('manager-action-inbox')).not.toBeInTheDocument();

    // 1 tap expands full season & GM tools seamlessly
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('scheduled-matchup-card')).toBeInTheDocument();
    expect(screen.getByTestId('manager-action-inbox')).toBeInTheDocument();
    unmount();

    // After Game 1 is played, full Season & GM dashboard auto-expands
    const club = useGameStore.getState().getHumanClub()!;
    const rival = useGameStore.getState().leagues[club.leagueTier].find((c) => c.id !== club.id)!;
    useGameStore.getState().playInstantExhibition(rival.id, 1994);
    render(<GameDayScreen />);
    expect(screen.queryByTestId('opening-day-more-toggle')).not.toBeInTheDocument();
    expect(screen.getByTestId('scheduled-matchup-card')).toBeInTheDocument();
  });

  it('defaults Arcade pitching to Heat selected, shows READY! 100% Hype with high-contrast power button, compact 2-row control grid, and top-left 3D overlay', () => {
    render(<GameDayScreen />);
    fireEvent.click(screen.getByTestId('opening-day-more-toggle'));
    fireEvent.click(screen.getByRole('button', { name: /start live 3d game/i }));

    // When pitching in Arcade mode, 🔥 Heat starts already selected!
    const heatBtn = screen.getByRole('button', { name: /🔥 heat/i });
    expect(heatBtn).toHaveAttribute('aria-pressed', 'true');

    // Compact 2-row control grid with Last Play Readout directly below controls (before Coach Cue)
    const grid = screen.getByTestId('live-control-grid');
    const readout = screen.getByTestId('live-last-pitch-readout');
    const coachCue = screen.getByTestId('coach-action-cue');
    expect(Boolean(grid.compareDocumentPosition(readout) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    expect(Boolean(readout.compareDocumentPosition(coachCue) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
  });

  it('renders READY! 100% Hype (never 89/75) without opacity-washing animate-pulse and pins LiveGameCanvas overlay top-left', () => {
    const club = useGameStore.getState().getHumanClub()!;
    const rival = useGameStore.getState().leagues[club.leagueTier].find((c) => c.id !== club.id)!;
    const session = createGameSession(rival, club, 1994);

    render(
      <>
        <LiveGameCanvas
          awayClub={rival}
          homeClub={club}
          session={session}
          overlay={<span className="plate-verdict">Single</span>}
        />
        <LiveActionBar
          cue={{
            kind: 'default_pitching',
            urgency: 'calm',
            badgeText: 'ON THE MOUND',
            turnLabel: 'TOP 1',
            headline: 'Fire a strike!',
            primaryButtonLabel: 'Throw Pitch',
            suggestedAction: null,
          }}
          matchupLabel="A vs B"
          basesLabel="Bases: · · ·"
          latestEvent={null}
          controlMode="simple"
          watchMode="paused"
          tacticalCall="normal"
          pitchTarget="high_heat"
          isBatting={false}
          gameCompleted={false}
          humanHype={89}
          hypeCost={75}
          readyPowerLabel="Coquí Leap (PR)"
          powerArmed={false}
          onArmReadyPower={vi.fn()}
          onNextPitch={vi.fn()}
          onToggleWatchMode={vi.fn()}
          onToggleSmartWatch={vi.fn()}
          onCycleSpeed={vi.fn()}
          onSimAtBat={vi.fn()}
          onSimHalfInning={vi.fn()}
          onClutchSim={vi.fn()}
          onSimToEnd={vi.fn()}
          onSelectTacticalCall={vi.fn()}
          onSelectPitchTarget={vi.fn()}
          onSuggestedAction={vi.fn()}
          onToggleControlMode={vi.fn()}
        />
      </>,
    );

    const hypeBar = screen.getByTestId('arcade-hype-bar');
    expect(hypeBar.textContent).toMatch(/ready!\s*100%/i);
    expect(hypeBar.textContent).not.toContain('89/75');

    const powerBtn = screen.getByTestId('arcade-unleash-power-btn');
    expect(powerBtn.className).not.toContain('animate-pulse');

    const overlayWrap = screen.getByTestId('live-canvas-overlay');
    expect(overlayWrap.className).toContain('justify-start');
  });

  it('shows warm sports MVP headline and puts Rip Foil Pack right next to Rematch at the top of PostGameSummaryModal', () => {
    const club = useGameStore.getState().getHumanClub()!;
    const rival = useGameStore.getState().leagues[club.leagueTier].find((c) => c.id !== club.id)!;
    const baseSummary = useGameStore.getState().playInstantExhibition(rival.id, 1994)!;
    const mvpId = baseSummary.mvp.playerId;
    const summaryWithHr = {
      ...baseSummary,
      won: true,
      result: {
        ...baseSummary.result,
        playerStatDeltas: {
          ...baseSummary.result.playerStatDeltas,
          [mvpId]: {
            ...(baseSummary.result.playerStatDeltas[mvpId] ?? {
              games: 1,
              plateAppearances: 3,
              atBats: 3,
              hits: 2,
              doubles: 0,
              triples: 0,
              homeRuns: 1,
              rbis: 2,
              runs: 1,
              walks: 0,
              strikeouts: 0,
              stolenBases: 0,
              caughtStealing: 0,
              outsRecorded: 0,
              hitsAllowed: 0,
              earnedRuns: 0,
              walksAllowed: 0,
              pitchingStrikeouts: 0,
              homeRunsAllowed: 0,
              pitchesThrown: 0,
              strikesThrown: 0,
              ballsThrown: 0,
              wins: 0,
              losses: 0,
              saves: 0,
              holds: 0,
              errors: 0,
              putouts: 0,
              assists: 0,
            }),
            homeRuns: 1,
          },
        },
      },
    };

    const onOpenFoilPacks = vi.fn();
    render(
      <PostGameSummaryModal
        summary={summaryWithHr}
        humanClub={useGameStore.getState().getHumanClub()!}
        opponentClub={rival}
        managerLevel={1}
        unopenedPackCount={1}
        playAgainLabel="Play Game 2/3 · Rematch"
        onPlayAgain={vi.fn()}
        onOpenFoilPacks={onOpenFoilPacks}
        onClose={vi.fn()}
      />,
    );

    const dialog = screen.getByRole('dialog', { name: /post-game box score & mvp/i });
    expect(dialog.textContent).toMatch(/crushed a home run/i);
    expect(dialog.textContent).not.toMatch(/homered once/i);

    const foilBtn = screen.getByRole('button', { name: /rip foil pack/i });
    const mvpHeading = screen.getByText(/game mvp spotlight/i);
    // Reward-first: Foil Pack CTA appears BEFORE the MVP card spotlight at the top of the modal!
    expect(Boolean(foilBtn.compareDocumentPosition(mvpHeading) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    fireEvent.click(foilBtn);
    expect(onOpenFoilPacks).toHaveBeenCalledTimes(1);
  });

  it('brings live reactive sparkle glow rings, badges, and reaction bubbles to MatchupPrints', () => {
    const club = useGameStore.getState().getHumanClub()!;
    const batter = { ...club.roster[0], formState: 'hot' as const };
    const pitcher = { ...club.roster.find((p) => p.position === 'SP')!, formState: 'neutral' as const };
    const hrEvent: PlayEvent = {
      seq: 5,
      inning: 2,
      half: 'BOT',
      type: 'ball_in_play',
      outsBefore: 0,
      outsAfter: 0,
      balls: 1,
      strikes: 1,
      basesAfter: [null, null, null],
      isClutchMoment: false,
      outcome: 'home_run',
      batterId: batter.id,
      pitcherId: pitcher.id,
      awayScore: 0,
      homeScore: 1,
      commentary: 'CRUSHED!',
    };

    render(
      <MatchupPrints
        batter={batter}
        pitcher={pitcher}
        batterFavorite
        pitcherPowerReady
        latestEvent={hrEvent}
        onInspect={vi.fn()}
      />,
    );

    const batterCard = screen.getByRole('button', { name: new RegExp(`Inspect ${batter.name} card`) });
    const pitcherCard = screen.getByRole('button', { name: new RegExp(`Inspect ${pitcher.name} card`) });
    expect(batterCard).toHaveAttribute('data-sparkle-tone', 'celebrate');
    expect(batterCard.textContent).toMatch(/boom!/i);
    expect(batterCard.textContent).toMatch(/fav/i);
    expect(pitcherCard).toHaveAttribute('data-sparkle-tone', 'power');
    expect(pitcherCard.textContent).toMatch(/power/i);
  });
});
