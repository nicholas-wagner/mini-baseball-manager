import { useCallback, useEffect, useState } from 'react';
import { FastForward, Play, RefreshCw, SkipForward, Zap } from 'lucide-react';
import { bgmEngine } from '../../audio/bgmEngine';
import { soundEngine } from '../../audio/soundEngine';
import { evaluatePlatoonMatchup } from '../../engine/handedness/handedness';
import {
  createInGameManagerPowerTracker,
  MANAGER_POWER_CATALOG,
  triggerInGameManagerPower,
  type InGameManagerPowerTracker,
} from '../../engine/manager/managerTree';
import type { ManagerPowerId } from '../../engine/models/manager';
import type { PlayEvent, TacticalCall } from '../../engine/models/playEvent';
import {
  PITCHER_ROLE_SHORT_LABELS,
  PITCH_TYPE_SHORT_LABELS,
  type GameLengthInnings,
  type PitchType,
} from '../../engine/models/player';
import {
  canTriggerSpecialAbility,
  SPECIAL_ABILITY_HYPE_COST,
} from '../../engine/rpg/abilityCooldowns';
import {
  evaluatePitcherEnduranceEffect,
  fatigueToEndurance,
} from '../../engine/rpg/pitcherEndurance';
import {
  buildPlayerStatDeltas,
  createGameSession,
  manualSwapPitcher,
  simFullGame,
  simUntilClutchOrEnd,
  stepAtBat,
  stepHalfInning,
  stepPitch,
} from '../../engine/simulation/baseballEngine';
import {
  getCurrentBatter,
  getCurrentLeverage,
  getCurrentPitcher,
  type GameSessionResult,
  type GameSessionState,
} from '../../engine/simulation/gameState';
import {
  estimateHomeWinProbability,
  evaluateBullpenWarmup,
  tickBullpenWarmups,
  type DefensiveShiftId,
} from '../../engine/simulation/winProbability';
import { choreographPlayEvent, type ChoreographedStep } from '../../scene/playback/eventChoreographer';
import { useGameStore, type PostGameSummary } from '../../store/gameStore';
import { BallparkSoundboardCard } from '../components/BallparkSoundboardCard';
import { BroadcastHud } from '../components/BroadcastHud';
import { LiveGameCanvas } from '../components/LiveGameCanvas';
import { PostGameSummaryModal } from '../components/PostGameSummaryModal';
import { ComicButton } from '../design-system/ComicButton';
import { ComicCard } from '../design-system/ComicCard';
import { ScoreboardStrip } from '../design-system/ScoreboardStrip';

const TACTICAL_OPTIONS: readonly { id: TacticalCall; label: string }[] = [
  { id: 'normal', label: 'Normal' },
  { id: 'contact', label: 'Contact' },
  { id: 'power', label: 'Power' },
  { id: 'bunt', label: 'Bunt' },
  { id: 'steal', label: 'Steal' },
  { id: 'intentional_walk', label: 'IBB' },
];

const GAME_LENGTH_OPTIONS: readonly { innings: GameLengthInnings; label: string }[] = [
  { innings: 5, label: '5 Inn (Blitz)' },
  { innings: 7, label: '7 Inn (Quick)' },
  { innings: 9, label: '9 Inn (Classic)' },
];

export function GameDayScreen() {
  const humanClub = useGameStore((s) => s.getHumanClub());
  const leagues = useGameStore((s) => s.leagues);
  const manager = useGameStore((s) => s.manager);
  const worldSeed = useGameStore((s) => s.worldSeed);
  const commitCompletedGame = useGameStore((s) => s.commitCompletedGame);

  const opponents = humanClub
    ? leagues[humanClub.leagueTier].filter((c) => c.id !== humanClub.id)
    : [];

  const [selectedOpponentId, setSelectedOpponentId] = useState<string>(opponents[0]?.id ?? '');
  const [gameLength, setGameLength] = useState<GameLengthInnings>(9);
  const [liveSession, setLiveSession] = useState<GameSessionState | null>(null);
  const [activeOpponentId, setActiveOpponentId] = useState<string>('');
  const [recentEvents, setRecentEvents] = useState<PlayEvent[]>([]);
  const [playbackEvent, setPlaybackEvent] = useState<PlayEvent | null>(null);
  const [lastChoreo, setLastChoreo] = useState<ChoreographedStep | null>(null);
  const [speed, setSpeed] = useState<1 | 2 | 4>(1);
  const [watchMode, setWatchMode] = useState<'live' | 'clutch' | 'paused'>('paused');
  const [tacticalCall, setTacticalCall] = useState<TacticalCall>('normal');
  const [selectedPitchType, setSelectedPitchType] = useState<PitchType | null>(null);
  const [defensiveShift, setDefensiveShift] = useState<DefensiveShiftId>('standard');
  const [winProbHistory, setWinProbHistory] = useState<number[]>([0.52]);
  const [warmingRelieverIds, setWarmingRelieverIds] = useState<string[]>([]);
  const [warmupCounts, setWarmupCounts] = useState<Record<string, number>>({});
  const [powerTracker, setPowerTracker] = useState<InGameManagerPowerTracker>(() =>
    createInGameManagerPowerTracker(),
  );
  const [modalSummary, setModalSummary] = useState<PostGameSummary | null>(null);

  const activeOpponent = opponents.find((c) => c.id === activeOpponentId) ?? opponents[0];

  const finalizeSessionIfComplete = useCallback(
    (finalState: GameSessionState, eventsList: PlayEvent[], opponentId: string) => {
      if (finalState.status !== 'completed') return;
      const result: GameSessionResult = {
        finalState,
        events: eventsList,
        awayScore: finalState.away.score,
        homeScore: finalState.home.score,
        winnerClubId: finalState.winnerClubId ?? finalState.home.clubId,
        boxScore: finalState.boxScore,
        playerStatDeltas: buildPlayerStatDeltas(finalState.boxScore),
      };
      const summary = commitCompletedGame(opponentId, result, true);
      if (summary) {
        setModalSummary(summary);
        setWatchMode('paused');
      }
    },
    [commitCompletedGame],
  );

  const handleStartLiveGame = (autoPlay: boolean) => {
    if (!humanClub) return;
    const opp = opponents.find((c) => c.id === selectedOpponentId) ?? opponents[0];
    if (!opp) return;
    const seed = worldSeed + humanClub.wins + humanClub.losses + 1;
    const session = createGameSession(opp, humanClub, seed, 'regular', gameLength);
    setActiveOpponentId(opp.id);
    setLiveSession(session);
    setRecentEvents([]);
    setLastChoreo(null);
    setPlaybackEvent(null);
    setSelectedPitchType(null);
    setDefensiveShift('standard');
    setWinProbHistory([estimateHomeWinProbability(session)]);
    setWarmingRelieverIds([]);
    setWarmupCounts({});
    setPowerTracker(createInGameManagerPowerTracker());
    setModalSummary(null);
    setWatchMode(autoPlay ? 'live' : 'paused');
    bgmEngine.syncStadium(session.ballparkId);
    soundEngine.play('organ_charge');
  };

  const applyStepResult = useCallback(
    (nextSession: GameSessionState, emitted: PlayEvent[], oppId: string) => {
      setLiveSession(nextSession);
      setWinProbHistory((prev) => [...prev.slice(-23), estimateHomeWinProbability(nextSession)]);
      if (warmingRelieverIds.length > 0) {
        setWarmupCounts((prev) => tickBullpenWarmups(prev, warmingRelieverIds));
      }
      // An inning-ending out can be followed by administrative events in the same step.
      const lastEvent = emitted.slice().reverse().find(e => e.outcome || e.type === 'stolen_base_attempt')
        ?? emitted.at(-1);
      setPlaybackEvent(lastEvent ?? null);
      if (lastEvent) {
        const choreo = choreographPlayEvent(lastEvent, speed);
        if (choreo.infield === 'double_play') {
          const before = emitted[emitted.indexOf(lastEvent) - 1];
          choreo.leadRunnerId = (before?.half === lastEvent.half && before.inning === lastEvent.inning
            ? before.basesAfter[0] : liveSession?.bases[0]) ?? undefined;
        }
        setLastChoreo(choreo);
        if (choreo.soundCue) {
          soundEngine.play(choreo.soundCue);
        }
        setRecentEvents((prev) => [...emitted.slice().reverse(), ...prev].slice(0, 12));
      }
      finalizeSessionIfComplete(nextSession, emitted, oppId);
    },
    [finalizeSessionIfComplete, speed, warmingRelieverIds, liveSession],
  );

  const resolvePitchCallOption = useCallback(
    (session: GameSessionState): { requestedPitchType?: PitchType } => {
      if (session.half !== 'TOP' || !selectedPitchType) return {};
      const pitcher = getCurrentPitcher(session);
      const ownsPitch = pitcher.pitchArsenal?.repertoire.some(
        (slot) => slot.pitchType === selectedPitchType,
      );
      return ownsPitch ? { requestedPitchType: selectedPitchType } : {};
    },
    [selectedPitchType],
  );

  const handleNextPitch = useCallback(() => {
    if (!liveSession || liveSession.status === 'completed') return;
    const { nextSession, events } = stepPitch(
      liveSession,
      tacticalCall,
      resolvePitchCallOption(liveSession),
    );
    applyStepResult(nextSession, events, activeOpponentId);
    if (
      tacticalCall === 'steal' ||
      tacticalCall === 'steal_3b' ||
      tacticalCall === 'double_steal' ||
      tacticalCall === 'steal_home' ||
      tacticalCall === 'pitchout' ||
      tacticalCall === 'hold_runner' ||
      tacticalCall === 'intentional_walk'
    ) {
      setTacticalCall('normal');
    }
  }, [activeOpponentId, applyStepResult, liveSession, resolvePitchCallOption, tacticalCall]);

  const handleSimAtBat = () => {
    if (!liveSession || liveSession.status === 'completed') return;
    const { nextSession, events } = stepAtBat(
      liveSession,
      tacticalCall,
      resolvePitchCallOption(liveSession),
    );
    applyStepResult(nextSession, events, activeOpponentId);
  };

  const handleSimHalfInning = () => {
    if (!liveSession || liveSession.status === 'completed') return;
    const { nextSession, events } = stepHalfInning(liveSession, tacticalCall);
    applyStepResult(nextSession, events, activeOpponentId);
  };

  const handleClutchSim = () => {
    if (!liveSession || liveSession.status === 'completed') return;
    const { nextSession, events } = simUntilClutchOrEnd(liveSession);
    applyStepResult(nextSession, events, activeOpponentId);
  };

  const handleSimToEnd = () => {
    if (!humanClub || !activeOpponent) return;
    const seed = liveSession?.rngSeed ?? worldSeed + humanClub.wins + humanClub.losses + 1;
    const innings = liveSession?.regulationInnings ?? gameLength;
    const full = simFullGame(activeOpponent, humanClub, seed, innings);
    setLiveSession(full.finalState);
    setRecentEvents(full.events.slice(-8).reverse());
    const summary = commitCompletedGame(activeOpponent.id, full, true);
    if (summary) setModalSummary(summary);
    setWatchMode('paused');
    soundEngine.play('crowd_cheer');
  };

  const handleInstantSimPreGame = () => {
    if (!humanClub) return;
    const opp = opponents.find((c) => c.id === selectedOpponentId) ?? opponents[0];
    if (!opp) return;
    const seed = worldSeed + humanClub.wins + humanClub.losses + 1;
    const full = simFullGame(opp, humanClub, seed, gameLength);
    const summary = commitCompletedGame(opp.id, full, true);
    if (summary) setModalSummary(summary);
    soundEngine.play('crowd_cheer');
  };

  const handleBullpenSwap = (relieverId: string) => {
    if (!liveSession) return;
    const swapped = manualSwapPitcher(liveSession, 'home', relieverId);
    if (swapped.event) {
      setSelectedPitchType(null);
      applyStepResult(swapped.nextSession, [swapped.event], activeOpponentId);
    }
  };

  useEffect(() => {
    if (watchMode !== 'live' || !liveSession || liveSession.status === 'completed') {
      return undefined;
    }
    const delayMs = lastChoreo?.durationMs ?? Math.round(900 / speed);
    const timer = window.setTimeout(() => {
      handleNextPitch();
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [handleNextPitch, lastChoreo, liveSession, speed, watchMode]);

  if (!humanClub) return null;

  if (!liveSession || !activeOpponent) {
    return (
      <div className="space-y-4">
        <ComicCard
          title="CHOOSE TODAY'S MATCHUP"
          subtitle={`${humanClub.city} ${humanClub.name} (${humanClub.wins}-${humanClub.losses}) • Home Stand`}
          headerBg="#1B4332"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {opponents.map((opp) => {
                const selected = (selectedOpponentId || opponents[0]?.id) === opp.id;
                return (
                  <button
                    key={opp.id}
                    type="button"
                    onClick={() => setSelectedOpponentId(opp.id)}
                    className={`p-3 rounded-xl border-2 border-[#181B2C] text-left min-h-[64px] transition ${
                      selected
                        ? 'bg-[#FFF3BF] shadow-[3px_3px_0_#181B2C]'
                        : 'bg-[#FFFDF7]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-xs text-[#181B2C]">
                        {opp.city} {opp.name}
                      </span>
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-[#181B2C]"
                        style={{ backgroundColor: opp.colors.primary }}
                      />
                    </div>
                    <div className="text-[11px] font-bold text-[#4A5068] mt-1">
                      {opp.aiArchetype.replace('_', ' ')} • {opp.wins}-{opp.losses}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-extrabold uppercase text-[#181B2C]">
                Game Length:
              </span>
              {GAME_LENGTH_OPTIONS.map((opt) => (
                <ComicButton
                  key={opt.innings}
                  size="sm"
                  variant={gameLength === opt.innings ? 'gold' : 'cream'}
                  active={gameLength === opt.innings}
                  onClick={() => setGameLength(opt.innings)}
                >
                  {opt.label}
                </ComicButton>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <ComicButton
                variant="turf"
                size="lg"
                icon={<Play className="w-4 h-4" />}
                onClick={() => handleStartLiveGame(false)}
              >
                Start Live 3D Game
              </ComicButton>
              <ComicButton
                variant="gold"
                size="lg"
                icon={<Zap className="w-4 h-4" />}
                onClick={handleInstantSimPreGame}
              >
                Instant Sim Game
              </ComicButton>
            </div>
          </div>
        </ComicCard>

        <BallparkSoundboardCard />

        <PostGameSummaryModal
          summary={modalSummary}
          humanClub={humanClub}
          managerLevel={manager?.level ?? 1}
          onClose={() => setModalSummary(null)}
        />
      </div>
    );
  }

  const currentBatter = getCurrentBatter(liveSession);
  const currentPitcher = getCurrentPitcher(liveSession);
  const currentLeverage = getCurrentLeverage(liveSession);
  const platoon = evaluatePlatoonMatchup(currentBatter.bats, currentPitcher.throws);
  const battingSideKey = liveSession.half === 'TOP' ? 'away' : 'home';
  const fieldingSideKey = liveSession.half === 'TOP' ? 'home' : 'away';
  const battingHype = liveSession[battingSideKey].hypeGauge;
  const fieldingHype = liveSession[fieldingSideKey].hypeGauge;
  const pitcherEndurance = fatigueToEndurance(liveSession[fieldingSideKey].pitcherFatigue);
  const enduranceFx = evaluatePitcherEnduranceEffect(
    pitcherEndurance,
    currentPitcher.pitchArsenal?.favoritePitch ?? 'four_seam',
  );
  const batterSpecial = canTriggerSpecialAbility(
    liveSession.abilityCooldowns,
    battingSideKey,
    currentBatter,
    'batter',
    battingHype,
  );
  const pitcherSpecial = canTriggerSpecialAbility(
    liveSession.abilityCooldowns,
    fieldingSideKey,
    currentPitcher,
    'pitcher',
    fieldingHype,
  );
  const availableRelievers = liveSession.home.bullpenIds.filter(
    (id) => !liveSession.home.usedPitcherIds.includes(id),
  );

  return (
    <div className="space-y-3">
      <ScoreboardStrip
        awayAbbr={activeOpponent.colors.monogram}
        awayScore={liveSession.away.score}
        awayColor={activeOpponent.colors.primary}
        homeAbbr={humanClub.colors.monogram}
        homeScore={liveSession.home.score}
        homeColor={humanClub.colors.primary}
        inning={liveSession.inning}
        half={liveSession.half}
        balls={liveSession.balls}
        strikes={liveSession.strikes}
        outs={liveSession.outs}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3 items-start">
        <div className="space-y-3">
          <LiveGameCanvas
            awayClub={activeOpponent}
            homeClub={humanClub}
            session={liveSession}
            choreo={lastChoreo}
            lastEvent={playbackEvent}
          />

          <BroadcastHud
            session={liveSession}
            winProbHistory={winProbHistory}
            defensiveShift={defensiveShift}
            onSelectShift={(shift) => {
              setDefensiveShift(shift);
              soundEngine.play('ui_pop');
            }}
            activeTacticalCall={tacticalCall}
            onSelectStealCall={(call) => {
              setTacticalCall((prev) => (prev === call ? 'normal' : call));
              soundEngine.play('ui_pop');
            }}
            lastEvent={recentEvents[0] ?? null}
          />

          <ComicCard
            title={`${currentBatter.name} (${currentBatter.bats}) vs ${currentPitcher.name} (${currentPitcher.throws}HP)`}
            subtitle={`${platoon.label} • Bases: ${liveSession.bases.map((b, idx) => (b ? `${idx + 1}B` : '·')).join(' ')}`}
            headerBg="#1D3557"
            badge={
              <div className="flex flex-wrap gap-1.5">
                {([1, 2, 4] as const).map((rate) => (
                  <ComicButton
                    key={rate}
                    size="sm"
                    variant={speed === rate ? 'gold' : 'cream'}
                    active={speed === rate}
                    onClick={() => setSpeed(rate)}
                  >
                    {rate}x
                  </ComicButton>
                ))}
              </div>
            }
          >
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-extrabold">
                <span className="px-2 py-0.5 rounded bg-[#D8F3DC] border border-[#181B2C] text-[#1B4332]">
                  Batter Crushes: {PITCH_TYPE_SHORT_LABELS[currentBatter.batterPitchProfile.favoritePitch]}
                </span>
                <span className="px-2 py-0.5 rounded bg-[#FFE5EC] border border-[#181B2C] text-[#9D0208]">
                  Batter Weak: {PITCH_TYPE_SHORT_LABELS[currentBatter.batterPitchProfile.weakPitch]}
                </span>
                {currentPitcher.pitchArsenal ? (
                  <span className="px-2 py-0.5 rounded bg-[#FFF3BF] border border-[#181B2C] text-[#181B2C]">
                    {currentPitcher.position} Mix ({currentPitcher.pitchArsenal.repertoire.length}): ★{' '}
                    {PITCH_TYPE_SHORT_LABELS[currentPitcher.pitchArsenal.favoritePitch]}
                  </span>
                ) : null}
                <span
                  data-testid="leverage-hud"
                  className={`px-2 py-0.5 rounded border border-[#181B2C] ${
                    currentLeverage.tier === 'critical'
                      ? 'bg-[#FF4D6D] text-white'
                      : currentLeverage.tier === 'high'
                        ? 'bg-[#FFC300] text-[#181B2C]'
                        : 'bg-[#F1E4C8] text-[#181B2C]'
                  }`}
                >
                  LI {currentLeverage.leverageIndex.toFixed(2)} • {currentLeverage.label}
                </span>
                <span
                  data-testid="endurance-hud"
                  className={`px-2 py-0.5 rounded border border-[#181B2C] ${
                    enduranceFx.tier === 'gassed' || enduranceFx.tier === 'fatigued'
                      ? 'bg-[#FF4D6D] text-white'
                      : enduranceFx.tier === 'tiring'
                        ? 'bg-[#FFC300] text-[#181B2C]'
                        : 'bg-[#D8F3DC] text-[#1B4332]'
                  }`}
                >
                  Endurance {pitcherEndurance}% ({enduranceFx.tier}
                  {enduranceFx.mphDrop < 0 ? `, ${enduranceFx.mphDrop} mph` : ''})
                </span>
                {enduranceFx.scoutWarning ? (
                  <span className="px-2 py-0.5 rounded bg-[#FFE5EC] border border-[#181B2C] text-[#9D0208]">
                    ⚠️ {enduranceFx.scoutWarning}
                  </span>
                ) : null}
                <span
                  data-testid="special-ability-hud"
                  className="px-2 py-0.5 rounded bg-[#E0FBFC] border border-[#181B2C] text-[#1D3557]"
                >
                  ⚡ Hype {fieldingHype}/{SPECIAL_ABILITY_HYPE_COST} • Pitcher {pitcherSpecial.chargesLeft}/
                  {pitcherSpecial.maxCharges}
                  {pitcherSpecial.cooldownRemaining > 0
                    ? ` (CD ${pitcherSpecial.cooldownRemaining})`
                    : ''}{' '}
                  • Batter {batterSpecial.chargesLeft}/{batterSpecial.maxCharges}
                </span>
              </div>

              {liveSession.half === 'TOP' && currentPitcher.pitchArsenal ? (
                <div
                  data-testid="pitch-selector-bar"
                  className="p-2 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-1.5"
                >
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#4A5068]">
                    Call Pitch ({currentPitcher.position} Arsenal: {currentPitcher.pitchArsenal.repertoire.length}{' '}
                    Pitches)
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <ComicButton
                      size="sm"
                      variant={selectedPitchType === null ? 'sky' : 'cream'}
                      active={selectedPitchType === null}
                      onClick={() => setSelectedPitchType(null)}
                    >
                      Auto Pitch
                    </ComicButton>
                    {currentPitcher.pitchArsenal.repertoire.map((slot) => {
                      const isFav = slot.pitchType === currentPitcher.pitchArsenal!.favoritePitch;
                      const hitsWeak = slot.pitchType === currentBatter.batterPitchProfile.weakPitch;
                      const hitsFav = slot.pitchType === currentBatter.batterPitchProfile.favoritePitch;
                      const isSelected = selectedPitchType === slot.pitchType;
                      return (
                        <ComicButton
                          key={slot.pitchType}
                          size="sm"
                          variant={isSelected ? 'gold' : 'cream'}
                          active={isSelected}
                          aria-label={`Pitch ${PITCH_TYPE_SHORT_LABELS[slot.pitchType]}`}
                          onClick={() => setSelectedPitchType(slot.pitchType)}
                        >
                          {isFav ? '★ ' : ''}
                          {PITCH_TYPE_SHORT_LABELS[slot.pitchType]} ({slot.mastery})
                          {hitsWeak ? ' 🎯' : hitsFav ? ' ⚠️' : ''}
                        </ComicButton>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {manager && manager.activePowerIds.length > 0 ? (
                <div
                  data-testid="manager-power-dock"
                  className="p-2 rounded-xl border-2 border-[#181B2C] bg-[#FFF3BF] space-y-1.5"
                >
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#181B2C]">
                    Manager Skipper Power Dock (1 Charge / Game Each)
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {manager.activePowerIds.map((powerId: ManagerPowerId) => {
                      const meta = MANAGER_POWER_CATALOG[powerId];
                      const used = powerTracker.usedPowerIds.includes(powerId);
                      return (
                        <ComicButton
                          key={powerId}
                          size="sm"
                          variant={used ? 'cream' : 'gold'}
                          disabled={used || liveSession.status === 'completed'}
                          onClick={() => {
                            const res = triggerInGameManagerPower(
                              powerTracker,
                              manager,
                              powerId,
                              liveSession,
                              'home',
                            );
                            if (res.used && res.event) {
                              setPowerTracker(res.tracker);
                              applyStepResult(res.session, [res.event], activeOpponent.id);
                            }
                          }}
                        >
                          ⚡ {meta.label} {used ? '(Used)' : '(1/1)'}
                        </ComicButton>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                {TACTICAL_OPTIONS.map((opt) => (
                  <ComicButton
                    key={opt.id}
                    size="sm"
                    variant={tacticalCall === opt.id ? 'coral' : 'cream'}
                    active={tacticalCall === opt.id}
                    onClick={() => setTacticalCall(opt.id)}
                  >
                    {opt.label}
                  </ComicButton>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <ComicButton
                  size="sm"
                  variant={watchMode === 'live' ? 'turf' : 'sky'}
                  onClick={() => setWatchMode((w) => (w === 'live' ? 'paused' : 'live'))}
                >
                  {watchMode === 'live' ? 'Pause Auto' : 'Auto Play 3D'}
                </ComicButton>
                <ComicButton
                  size="sm"
                  variant="turf"
                  icon={<Play className="w-4 h-4" />}
                  onClick={handleNextPitch}
                >
                  Next Pitch
                </ComicButton>
                <ComicButton
                  size="sm"
                  variant="sky"
                  icon={<SkipForward className="w-4 h-4" />}
                  onClick={handleSimAtBat}
                >
                  Sim At-Bat
                </ComicButton>
                <ComicButton
                  size="sm"
                  variant="cream"
                  icon={<FastForward className="w-4 h-4" />}
                  onClick={handleSimHalfInning}
                >
                  Sim Half-Inn
                </ComicButton>
                <ComicButton
                  size="sm"
                  variant="violet"
                  icon={<Zap className="w-4 h-4" />}
                  onClick={handleClutchSim}
                >
                  Clutch Sim
                </ComicButton>
                <ComicButton
                  size="sm"
                  variant="gold"
                  icon={<FastForward className="w-4 h-4" />}
                  onClick={handleSimToEnd}
                >
                  Sim to End
                </ComicButton>
              </div>
            </div>
          </ComicCard>
        </div>

        <div className="space-y-3">
          <ComicCard title="PLAY-BY-PLAY TICKER" headerBg="#1B4332">
            <ul
              data-testid="play-by-play-ticker"
              className="space-y-1.5 text-xs font-bold text-[#181B2C] max-h-56 overflow-y-auto"
            >
              {recentEvents.length === 0 ? (
                <li className="text-[#4A5068]">Step onto the mound or tap Next Pitch!</li>
              ) : (
                recentEvents.map((ev) => (
                  <li
                    key={ev.seq}
                    className="p-2 rounded-lg border border-[#181B2C]/20 bg-[#FFFDF7]"
                  >
                    <span className="text-[#1B4332] font-extrabold mr-1">
                      [{ev.half} {ev.inning}]
                    </span>
                    {ev.commentary}
                  </li>
                ))
              )}
            </ul>
          </ComicCard>

          <ComicCard title="BULLPEN PHONE" headerBg="#2B2D42">
            {availableRelievers.length === 0 ? (
              <p className="text-xs font-bold text-[#4A5068]">No fresh relievers remaining.</p>
            ) : (
              <div className="space-y-2">
                {availableRelievers.map((relId) => {
                  const rel = liveSession.home.playersById[relId];
                  if (!rel) return null;
                  const warmup = evaluateBullpenWarmup(rel.id, warmupCounts[rel.id] ?? 0);
                  const isWarming = warmingRelieverIds.includes(rel.id);
                  return (
                    <div key={rel.id} className="space-y-1 p-2 rounded-xl border border-[#181B2C]/20 bg-[#FFFDF7]">
                      <div className="flex items-center justify-between gap-1 text-[10px] font-extrabold">
                        <span className="text-[#181B2C]">
                          {rel.name} ({rel.throws}HP
                          {rel.pitcherRole ? ` • ${PITCHER_ROLE_SHORT_LABELS[rel.pitcherRole]}` : ''})
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded border border-[#181B2C] uppercase ${
                            warmup.status === 'hot'
                              ? 'bg-[#2FB356] text-white'
                              : warmup.status === 'warming'
                                ? 'bg-[#FFC300] text-[#181B2C]'
                                : warmup.status === 'overcooked'
                                  ? 'bg-[#FF4D6D] text-white'
                                  : 'bg-[#E2E8F0] text-[#181B2C]'
                          }`}
                        >
                          {warmup.status}
                        </span>
                      </div>
                      <div className="flex gap-1.5">
                        <ComicButton
                          size="sm"
                          variant={isWarming ? 'gold' : 'sky'}
                          onClick={() => {
                            soundEngine.play('bullpen_phone');
                            setWarmingRelieverIds((prev) =>
                              prev.includes(rel.id) ? prev.filter((id) => id !== rel.id) : [...prev, rel.id],
                            );
                          }}
                        >
                          {isWarming ? 'Sit Down' : 'Warm Up'}
                        </ComicButton>
                        <ComicButton
                          size="sm"
                          variant="cream"
                          className="flex-1 justify-between"
                          icon={<RefreshCw className="w-3.5 h-3.5" />}
                          onClick={() => handleBullpenSwap(rel.id)}
                        >
                          Bring In {rel.name}
                        </ComicButton>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ComicCard>
        </div>
      </div>

      <PostGameSummaryModal
        summary={modalSummary}
        humanClub={humanClub}
        managerLevel={manager?.level ?? 1}
        onClose={() => {
          setModalSummary(null);
          setLiveSession(null);
        }}
        onPlayAgain={() => handleStartLiveGame(false)}
      />
    </div>
  );
}
