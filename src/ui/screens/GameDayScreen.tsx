import { useCallback, useEffect, useState } from 'react';
import { FastForward, Play, RefreshCw, SkipForward, Zap } from 'lucide-react';
import { soundEngine } from '../../audio/soundEngine';
import { evaluatePlatoonMatchup } from '../../engine/handedness/handedness';
import type { PlayEvent, TacticalCall } from '../../engine/models/playEvent';
import { PITCH_TYPE_SHORT_LABELS, type PitchType } from '../../engine/models/player';
import {
  canTriggerSpecialAbility,
  SPECIAL_ABILITY_HYPE_COST,
} from '../../engine/rpg/abilityCooldowns';
import {
  buildPlayerStatDeltas,
  createGameSession,
  manualSwapPitcher,
  simFullGame,
  simUntilClutchOrEnd,
  stepAtBat,
  stepPitch,
} from '../../engine/simulation/baseballEngine';
import {
  getCurrentBatter,
  getCurrentPitcher,
  type GameSessionResult,
  type GameSessionState,
} from '../../engine/simulation/gameState';
import { choreographPlayEvent, type ChoreographedStep } from '../../scene/playback/eventChoreographer';
import { useGameStore, type PostGameSummary } from '../../store/gameStore';
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
  const [liveSession, setLiveSession] = useState<GameSessionState | null>(null);
  const [activeOpponentId, setActiveOpponentId] = useState<string>('');
  const [recentEvents, setRecentEvents] = useState<PlayEvent[]>([]);
  const [lastChoreo, setLastChoreo] = useState<ChoreographedStep | null>(null);
  const [speed, setSpeed] = useState<1 | 2 | 4>(1);
  const [watchMode, setWatchMode] = useState<'live' | 'clutch' | 'paused'>('paused');
  const [tacticalCall, setTacticalCall] = useState<TacticalCall>('normal');
  const [selectedPitchType, setSelectedPitchType] = useState<PitchType | null>(null);
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
    const session = createGameSession(opp, humanClub, seed);
    setActiveOpponentId(opp.id);
    setLiveSession(session);
    setRecentEvents([]);
    setLastChoreo(null);
    setSelectedPitchType(null);
    setModalSummary(null);
    setWatchMode(autoPlay ? 'live' : 'paused');
    soundEngine.play('organ_charge');
  };

  const applyStepResult = useCallback(
    (nextSession: GameSessionState, emitted: PlayEvent[], oppId: string) => {
      setLiveSession(nextSession);
      const lastEvent = emitted[emitted.length - 1] ?? null;
      if (lastEvent) {
        const choreo = choreographPlayEvent(lastEvent, speed);
        setLastChoreo(choreo);
        if (choreo.soundCue) {
          soundEngine.play(choreo.soundCue);
        }
        setRecentEvents((prev) => [...emitted.slice().reverse(), ...prev].slice(0, 12));
      }
      finalizeSessionIfComplete(nextSession, emitted, oppId);
    },
    [finalizeSessionIfComplete, speed],
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
    if (tacticalCall === 'steal' || tacticalCall === 'intentional_walk') {
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

  const handleClutchSim = () => {
    if (!liveSession || liveSession.status === 'completed') return;
    const { nextSession, events } = simUntilClutchOrEnd(liveSession);
    applyStepResult(nextSession, events, activeOpponentId);
  };

  const handleSimToEnd = () => {
    if (!humanClub || !activeOpponent) return;
    const seed = liveSession?.rngSeed ?? worldSeed + humanClub.wins + humanClub.losses + 1;
    const full = simFullGame(activeOpponent, humanClub, seed);
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
    const full = simFullGame(opp, humanClub, seed);
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
  const platoon = evaluatePlatoonMatchup(currentBatter.bats, currentPitcher.throws);
  const battingSideKey = liveSession.half === 'TOP' ? 'away' : 'home';
  const fieldingSideKey = liveSession.half === 'TOP' ? 'home' : 'away';
  const battingHype = liveSession[battingSideKey].hypeGauge;
  const fieldingHype = liveSession[fieldingSideKey].hypeGauge;
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
                  return (
                    <ComicButton
                      key={rel.id}
                      size="sm"
                      variant="cream"
                      className="w-full justify-between"
                      icon={<RefreshCw className="w-3.5 h-3.5" />}
                      onClick={() => handleBullpenSwap(rel.id)}
                    >
                      Bring In {rel.name} ({rel.throws}HP)
                    </ComicButton>
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
