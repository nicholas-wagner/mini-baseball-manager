import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCameraPresetPose } from '../../scene/camera/cameraRig';
import { clearAllCareerSlotsStorage, useCareerStoryStore } from '../../store/careerSlots';
import { useGameStore } from '../../store/gameStore';
import { useUserPreferencesStore } from '../../store/userPreferences';
import { App } from '../../App';
import { ArcadeDerbyModal } from './ArcadeDerbyModal';
import { FirstAtBat } from './FirstAtBat';
import { LiveActionBar } from './LiveActionBar';
import { PostGameSummaryModal } from './PostGameSummaryModal';
import { StoryChapterModal } from './StoryChapterModal';
import { GameDayScreen } from '../screens/GameDayScreen';
import { LeagueScreen } from '../screens/LeagueScreen';

function seedCareer(seed = 2089) {
  clearAllCareerSlotsStorage();
  useUserPreferencesStore.getState().resetDefaults();
  useGameStore.getState().startNewCareer({
    city: 'Sandlot',
    clubName: 'Comets',
    mascot: 'Rocket Dog',
    monogram: 'SC',
    primaryColor: '#E63946',
    secondaryColor: '#1D3557',
    accentColor: '#FFD166',
    managerName: 'Coach Skip',
    seed,
  });
}

describe('TASK-087 — Mobile Round 12 First-Time Hook & On-Screen Ergonomics', () => {
  beforeEach(() => {
    seedCareer();
  });

  it('surfaces the Opening Day Signature Power button directly in the visible FirstAtBat header instead of hiding it inside Options', () => {
    const club = useGameStore.getState().getHumanClub()!;
    const rival = useGameStore.getState().leagues[club.leagueTier].find((c) => c.id !== club.id)!;
    const onArmPower = vi.fn();

    render(<GameDayScreen />);
    fireEvent.click(screen.getByRole('button', { name: /^(Bat|Pitch) with / }));

    const guide = screen.getByRole('region', { name: 'First at-bat' });
    const powerBtn = within(guide).getByTestId('guided-unleash-power-btn');
    // Power button must NOT be trapped inside the collapsed <details class="atbat-options">!
    expect(powerBtn.closest('details')).toBeNull();
    expect(powerBtn).toBeVisible();

    // Direct FirstAtBat unit check for armed state & label
    const { unmount } = render(
      <FirstAtBat
        session={{
          away: { clubId: rival.id, name: rival.name, isHuman: false, score: 0, hits: 0, errors: 0, lineup: [], lineupIndex: 0, activePitcherId: rival.roster[0].id, bullpenIds: [], usedPitcherIds: [], playersById: {}, hypeGauge: 0, pitcherFatigue: 0, catcherPopTimeBonus: 0, gameplan: 'balanced' } as never,
          home: { clubId: club.id, name: club.name, isHuman: true, score: 0, hits: 0, errors: 0, lineup: [], lineupIndex: 0, activePitcherId: club.roster[0].id, bullpenIds: [], usedPitcherIds: [], playersById: {}, hypeGauge: 100, pitcherFatigue: 0, catcherPopTimeBonus: 0, gameplan: 'balanced' } as never,
          inning: 4,
          half: 'BOT',
          outs: 0,
          balls: 0,
          strikes: 0,
          bases: [null, null, null],
          status: 'in_progress',
          regulationInnings: 5,
          rngSeed: 1,
          stepCounter: 0,
          eventSeq: 0,
          pressureLevel: 'regular',
          ballparkId: 'sandlot_commons',
          boxScore: { inningRuns: [], awayBatters: {}, homeBatters: {}, awayPitchers: {}, homePitchers: {} },
          abilityCooldowns: { playerUsesById: {}, pitcherCooldownBattersById: {}, pitcherCooldownPitchesById: {}, teamSuperSwingCooldownPas: { away: 0, home: 0 } },
        } as never}
        batting
        target="attack_zone"
        call="contact"
        locked={false}
        expanded={false}
        powerArmed={false}
        readyPowerName="Eagle Soar (USA)"
        cue={{
          kind: 'power_ready',
          urgency: 'high',
          turnLabel: 'BOT 4 • BATTING',
          badgeText: 'POWER READY',
          headline: 'Power ready',
          primaryButtonLabel: 'Swing',
          suggestedAction: null,
        }}
        onTarget={vi.fn()}
        onSwing={vi.fn()}
        onPitch={vi.fn()}
        onArmPower={onArmPower}
        onExpand={vi.fn()}
        onSuggested={vi.fn()}
      />,
    );
    const unitBtns = screen.getAllByTestId('guided-unleash-power-btn');
    const unitBtn = unitBtns[unitBtns.length - 1];
    expect(unitBtn.closest('details')).toBeNull();
    fireEvent.click(unitBtn);
    expect(onArmPower).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('places the Between-Games Primary Play CTA ahead of probable pitcher scout cards, compacts face-off to 3 columns, and removes doubled sparkles on Auto-Tune', () => {
    const club = useGameStore.getState().getHumanClub()!;
    const rival = useGameStore.getState().leagues[club.leagueTier].find((c) => c.id !== club.id)!;
    useGameStore.getState().playInstantExhibition(rival.id, 2089);

    render(<GameDayScreen />);
    const matchupCard = screen.getByTestId('scheduled-matchup-card');
    const playBtn = within(matchupCard).getByRole('button', { name: /start live 3d game/i });
    const scoutStrip = within(matchupCard).getByTestId('probable-matchup-strip');

    // Play CTA must come BEFORE the probable pitcher scouting strip in document order so it stays above the fold on mobile!
    expect(
      Boolean(playBtn.compareDocumentPosition(scoutStrip) & Node.DOCUMENT_POSITION_FOLLOWING),
    ).toBe(true);

    // Probable face-off portraits use a compact 3-column mobile strip
    const faceoff = within(matchupCard).getByTestId('matchup-faceoff-portraits');
    expect(faceoff.className).toMatch(/grid-cols-3/);

    // Auto-Tune button uses its Lucide Sparkles icon without a doubled ✨ emoji prefix
    const autoTune = within(matchupCard).getByTestId('auto-tune-lineup-btn');
    expect(autoTune.textContent).not.toContain('✨');
  });

  it('adds a 1-tap Box Score button inside the LiveActionBar Tactics drawer for mobile baseball fans', () => {
    const onOpenBoxScore = vi.fn();
    render(
      <LiveActionBar
        cue={{
          kind: 'power_ready',
          urgency: 'calm',
          turnLabel: 'TOP 1 • PITCHING',
          badgeText: 'ON THE MOUND',
          headline: 'Attack the zone',
          primaryButtonLabel: 'Throw Pitch',
          suggestedAction: null,
        }}
        matchupLabel="Batter vs Pitcher"
        basesLabel="Bases: · · ·"
        latestEvent={null}
        controlMode="simple"
        watchMode="paused"
        tacticalCall="normal"
        pitchTarget="high_heat"
        isBatting={false}
        gameCompleted={false}
        onOpenBoxScore={onOpenBoxScore}
        onNextPitch={vi.fn()}
        onToggleWatchMode={vi.fn()}
        onSimAtBat={vi.fn()}
        onSimHalfInning={vi.fn()}
        onClutchSim={vi.fn()}
        onSimToEnd={vi.fn()}
        onSelectTacticalCall={vi.fn()}
        onSuggestedAction={vi.fn()}
        onToggleControlMode={vi.fn()}
      />,
    );

    const boxBtn = screen.getByTestId('arcade-box-score-btn');
    fireEvent.click(boxBtn);
    expect(onOpenBoxScore).toHaveBeenCalledTimes(1);
  });

  it('adds a header Close button to PostGameSummaryModal, fixes negative cash sign in StoryChapterModal, and removes doubled SWING icon in ArcadeDerbyModal', () => {
    const club = useGameStore.getState().getHumanClub()!;
    const rival = useGameStore.getState().leagues[club.leagueTier].find((c) => c.id !== club.id)!;
    const summary = useGameStore.getState().playInstantExhibition(rival.id, 1994)!;
    const onClose = vi.fn();

    const { unmount: unmountPost } = render(
      <PostGameSummaryModal
        summary={summary}
        humanClub={club}
        opponentClub={rival}
        managerLevel={1}
        onClose={onClose}
      />,
    );
    const closeRecapBtn = screen.getByRole('button', { name: /close post-game recap/i });
    fireEvent.click(closeRecapBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
    unmountPost();

    // StoryChapterModal formats negative cash as -$200 (never $-200) and renders compact 3-col tabs
    useCareerStoryStore.getState().chooseCareerBackstory('sandlot_hero');
    const { unmount: unmountStory } = render(<StoryChapterModal open onClose={vi.fn()} />);
    expect(screen.queryByText(/\$-/)).toBeNull();
    expect(screen.getByTestId('story-modal-tabs').className).toMatch(/grid-cols-3/);
    unmountStory();

    // ArcadeDerbyModal SWING button avoids doubled Flame + 💥 icon
    const { unmount: unmountDerby } = render(
      <ArcadeDerbyModal open club={club} worldSeed={1994} onClose={vi.fn()} />,
    );
    const swingBtn = screen.getByTestId('derby-swing-btn');
    expect(swingBtn.textContent).not.toContain('💥');
    unmountDerby();
  });

  it('gives mobile LeagueStandings a non-truncating YOU badge, styles mobile Save/Load cleanly, and frames mound_portrait without cropping the cap', () => {
    const { unmount: unmountLeague } = render(<LeagueScreen />);
    const youBadge = screen.getByTestId('standings-you-badge');
    expect(youBadge).toHaveTextContent('YOU');
    unmountLeague();

    // Mound portrait camera backs up gently from z=-7.10 so chibi caps stay inside compact/landscape viewports
    const moundPose = getCameraPresetPose('mound_portrait', 0, 0, 'R', 'R');
    expect(moundPose.position.z).toBeGreaterThan(-6.6);
    expect(moundPose.lookAt.y).toBeGreaterThanOrEqual(1.2);

    // Mobile Clubhouse Menu styles Save / Load with JSON Backup clarity
    render(<App />);
    fireEvent.click(screen.getByTestId('mobile-menu-toggle'));
    const menu = screen.getByTestId('mobile-clubhouse-menu');
    expect(within(menu).getByRole('button', { name: /save \/ load/i })).toHaveTextContent(/json backup/i);
  });
});
