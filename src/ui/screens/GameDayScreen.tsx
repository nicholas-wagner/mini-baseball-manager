import { describeBuntAdvance } from '../../scene/playback/sacrificeBunt';
import { RunnerCue } from '../components/RunnerCue';
import { FORCE_HOLD_SECONDS } from '../../scene/playback/firstAtBatPresentation';
import { forceAtFirst } from '../../scene/playback/diamondPlay';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ClipboardList,
  CloudRain,
  Flame,
  Gift,
  Palette,
  Play,
  RefreshCw,
  Sliders,
  Sparkles,
  Sun,
  Trophy,
  Zap,
} from 'lucide-react';
import { bgmEngine } from '../../audio/bgmEngine';
import { soundEngine } from '../../audio/soundEngine';
import { getBallparkPreset } from '../../engine/ballparks/stadiumCatalog';
import {
  detectTiredScheduledStarter,
  evaluatePromotionChase,
  evaluateRosterSpotlight,
} from '../../engine/gm/gmSeasonPulse';
import {
  buildLiveBroadcastLowerThird,
  buildPreGameProbableMatchup,
  createClutchMomentSession, type ClutchMomentLaunch,
  evaluateSeriesStakes,
} from '../../engine/gm/gameDayMoments';
import { evaluatePreGameLineupCheck, summarizeLineupChange } from '../../engine/gm/seriesRecap';
import {
  buildFirstPitchCoachTip,
  buildMatchupScoutLine,
  buildTeammateDugoutCheer,
  evaluateWelcomeChecklist,
  selectBetweenGameSpotlight,
  selectClubSpotlightTrio,
} from '../../engine/gm/openingDayHook';
import { getEligibleStealPlays } from '../../engine/simulation/baserunning';
import {
  chooseAiDefensiveShift,
  isOffensiveTacticalCall,
  resolveIsolatedStepInputs,
} from '../../engine/simulation/aiManager';
import { evaluateBuntOdds, formatBuntPreviewSummary } from '../../engine/simulation/buntResolver';
import { getBattingSide, getDefenderAtPosition, getFieldingSide } from '../../engine/simulation/gameState';
import { getNextAvailableStoryChapter } from '../../engine/story/storyEngine';
import { useCareerStoryStore } from '../../store/careerSlots';
import {
  buildManagerActionInbox,
  recommendTeamPracticeFocus,
  type ManagerJumpTarget,
  type TeamPracticeFocusId,
} from '../../engine/gm/managerActionInbox';
import { evaluatePlatoonMatchup } from '../../engine/handedness/handedness';
import {
  buildRivalryShowdownPreview,
  createCrosstownStarterRivalry,
} from '../../engine/league/rivalryEngine';
import { evaluateNemesisMatchup } from '../../engine/league/nemesisTracker';
import { buildCatcherCallSequence } from '../../engine/simulation/catcherCalls';
import {
  BULLPEN_MODE_OPTIONS,
  evaluateBullpenCall,
  getUpcomingBatters,
  rankBullpenCandidates,
  type BullpenMode,
} from '../../engine/simulation/bullpenManager';
import { catcherSign, personalWatchStop, gazetteCaption, recentContact } from '../../engine/simulation/dugoutCalls';
import { GazetteCall, ThirdBaseDecision, LeagueWire, ParkLineupCard, WatchSettings } from '../components/DugoutScouting';
import { seriesRoundSeed, getHumanSeasonSchedule } from '../../engine/league/seasonEngine';
import { createSeededRng } from '../../engine/rng/seededRng';
import {
  evaluateWeatherSimulationImpact,
  rollGameDayWeather,
  type GameDayWeather,
} from '../../engine/simulation/weather';
import {
  createInGameManagerPowerTracker,
  MANAGER_POWER_CATALOG,
  triggerInGameManagerPower,
  type InGameManagerPowerTracker,
} from '../../engine/manager/managerTree';
import type { ManagerPowerId } from '../../engine/models/manager';
import type { PlayEvent, TacticalCall } from '../../engine/models/playEvent';
import {
  computePlayerOverall,
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
  evaluateCapstoneGameplayProfile,
  evaluateHeritageGameplayProfile,
  getActivatablePowersForPlayer,
} from '../../engine/rpg/specialPowerEffects';
import {
  buildPlayerStatDeltas,
  createGameSession,
  manualSwapPitcher,
  simFullGame,
  simRemainingGame,
  simUntilClutchOrEnd,
  stepAtBat,
  stepHalfInning,
  stepPitch,
} from '../../engine/simulation/baseballEngine';
import {
  applyMoundVisit,
  applyPinchHitter,
  applyPinchRunner,
  getAvailableBenchPlayers,
  resolveArgueCallGamble,
} from '../../engine/simulation/dugoutDrama';
import {
  computeLiveActionCue,
  type SuggestedQuickAction,
} from '../../engine/simulation/liveActionAdvisor';
import {
  buildComicPopArtBanner,
  shouldSmartAutoPause,
} from '../../engine/simulation/liveWatchPacing';
import {
  BATTER_GUESS_OPTIONS,
  PITCH_TARGET_OPTIONS,
  type ArcadeTimingGrade,
  type BatterPitchGuess,
  type PitchingMode,
  type PitchTargetIntent,
} from '../../engine/simulation/pitchMindGames';
import {
  getCurrentBatter,
  getCurrentLeverage,
  getCurrentPitcher,
  type GameSessionResult,
  type GameSessionState,
} from '../../engine/simulation/gameState';
import {
  DEFENSIVE_SHIFTS,
  estimateHomeWinProbability,
  evaluateBullpenWarmup,
  tickBullpenWarmups,
  type DefensiveShiftId,
} from '../../engine/simulation/winProbability';
import { choreographPlayEvent, type ChoreographedStep } from '../../scene/playback/eventChoreographer';
import { runHumanRoutineFrontOfficePass } from '../../store/clubHubActions';
import { useFoilPackStore } from '../../store/foilPackStore';
import { useGameStore, type PostGameSummary } from '../../store/gameStore';
import { useNemesisStore } from '../../store/nemesisStore';
import { usePostseasonStore } from '../../store/postseasonStore';
import { useUserPreferencesStore } from '../../store/userPreferences';
import { ArcadeDerbyModal } from '../components/ArcadeDerbyModal';
import { CelebrationStickerToast } from '../components/CelebrationStickerToast';
import { RallyResult } from '../components/RallyResult';
import {
  detectDerbyCelebrationSticker,
  detectLiveCelebrationSticker,
  type CelebrationStickerUnlock,
} from '../../engine/gm/celebrationStickers';
import { FirstAtBat } from '../components/FirstAtBat';
import { PlayerPrint, BatterEntrance, MatchupPrints, OpeningDayPrint } from '../components/GameDayPrints';
import type { PlayerEntranceCue } from '../../scene/playback/firstAtBatPresentation';
import { decisionDelayMs, scoringDetail, playReadout } from '../../scene/playback/playReadout';
import { BroadcastHud } from '../components/BroadcastHud';
import { ClubMascotBuddy } from '../components/ClubMascotBuddy';
import { DugoutCheerBubble } from '../components/DugoutCheerBubble';
import { FoilPackModal } from '../components/FoilPackModal';
import { FrontOfficeModeBar } from '../components/FrontOfficeModeBar';
import { StrikeZoneOverlay } from '../components/StrikeZoneOverlay';
import { TrophyCaseModal } from '../components/TrophyCaseModal';
import { LiveActionBar } from '../components/LiveActionBar';
import { LiveBottomSheet, useWideStudio } from '../components/LiveBottomSheet';
import { LiveBoxScoreModal } from '../components/LiveBoxScoreModal';
import { LiveGameCanvas, type LiveCameraMode } from '../components/LiveGameCanvas';
import { ManagerClipboardBanner } from '../components/ManagerClipboardBanner';
import {
  PlayerCardModal,
  type InspectableCardEntry,
} from '../components/PlayerCardModal';
import { PlayerPortraitBadge } from '../components/PlayerPortraitBadge';
import { PostGameSummaryModal } from '../components/PostGameSummaryModal';
import { ComicButton } from '../design-system/ComicButton';
import { ComicCard } from '../design-system/ComicCard';
import { ScoreboardStrip } from '../design-system/ScoreboardStrip';
import { requestGameWakeLock, triggerHapticPulse } from '../utils/deviceFeedback';

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

function playGazetteCrowd() { soundEngine.play('crowd_cheer'); }

function safeScrollTop(): void {
  try {
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  } catch {
    // Ignore non-scrolling jsdom environments
  }
}

interface GameDayScreenProps {
  onLiveChange?: (live: boolean) => void;
  onOpenDugout?: () => void;
  openingRequest?: ClutchMomentLaunch | null;
  onOpeningStarted?: () => void;
  onJumpToTab?: (tab: 'roster' | 'skills' | 'league' | 'economy') => void;
  onOpenStory?: () => void;
  onOpenRelics?: () => void;
  onOpenUniforms?: () => void;
}

export function GameDayScreen({
  openingRequest, onOpeningStarted, onLiveChange, onOpenDugout,
  onJumpToTab,
  onOpenStory,
  onOpenRelics,
  onOpenUniforms,
}: GameDayScreenProps = {}) {
  const humanClub = useGameStore((s) => s.getHumanClub());
  const leagues = useGameStore((s) => s.leagues);
  const manager = useGameStore((s) => s.manager);
  const worldSeed = useGameStore((s) => s.worldSeed);
  const seasonNumber = useGameStore((s) => s.seasonNumber);
  const storyState = useCareerStoryStore((s) => s.storyState);
  const currentSeriesIndex = useGameStore((s) => s.currentSeriesIndex);
  const currentGameInSeries = useGameStore((s) => s.currentGameInSeries);
  const seriesResults = useGameStore((s) => s.seriesResults);
  const lastSeriesRecap = useGameStore((s) => s.lastSeriesRecap);
  const practiceAvailable = useGameStore((s) => s.practiceAvailable);
  const lastPracticeFocusLabel = useGameStore((s) => s.lastPracticeFocusLabel);
  const activeGameplan = useGameStore((s) => s.activeGameplan);
  const activeGmInboxEvent = useGameStore((s) => s.activeGmInboxEvent);
  const spotlightUsedThisSeries = useGameStore((s) => s.spotlightUsedThisSeries);
  const commitCompletedGame = useGameStore((s) => s.commitCompletedGame);
  const simNextSeriesRound = useGameStore((s) => s.simNextSeriesRound);
  const runQuickTeamPracticeAction = useGameStore((s) => s.runQuickTeamPracticeAction);
  const setSeriesGameplan = useGameStore((s) => s.setSeriesGameplan);
  const resolveActiveGmInboxDecision = useGameStore((s) => s.resolveActiveGmInboxDecision);
  const spotlightBreakoutPlayer = useGameStore((s) => s.spotlightBreakoutPlayer);
  const swapTiredStarterToFresh = useGameStore((s) => s.swapTiredStarterToFresh);
  const autoTuneHumanLineupForStarter = useGameStore((s) => s.autoTuneHumanLineupForStarter);
  const clearLastSeriesRecap = useGameStore((s) => s.clearLastSeriesRecap);
  const favoritePlayerIds = useGameStore((s) => s.favoritePlayerIds);
  const welcomeChecklistClaimed = useGameStore((s) => s.welcomeChecklistClaimed);
  const toggleFavoritePlayer = useGameStore((s) => s.toggleFavoritePlayer);
  const unlockCelebrationSticker = useGameStore((s) => s.unlockCelebrationSticker);
  const customizePlayerProfile = useGameStore((s) => s.customizePlayerProfile);
  const claimWelcomeChecklistReward = useGameStore((s) => s.claimWelcomeChecklistReward);
  const packsOpenedCount = useFoilPackStore((s) => s.openedCount);
  const [gmQuickFeedback, setGmQuickFeedback] = useState<string | null>(null);
  const [autoTuneStatus, setAutoTuneStatus] = useState<{
    starterId: string;
    message: string;
  } | null>(null);
  const [derbyOpen, setDerbyOpen] = useState(false);
  const [trophyOpen, setTrophyOpen] = useState(false);
  const [stickerToast, setStickerToast] = useState<CelebrationStickerUnlock | null>(null);
  const [openingSeasonExpanded, setOpeningSeasonExpanded] = useState(false);
  const [gameSettingsOpen, setGameSettingsOpen] = useState(false);

  const opponents = humanClub
    ? leagues[humanClub.leagueTier].filter((c) => c.id !== humanClub.id)
    : [];

  const seasonSchedule = useMemo(
    () =>
      humanClub
        ? getHumanSeasonSchedule(leagues[humanClub.leagueTier], humanClub.id, currentSeriesIndex)
        : { entries: [], nextSeries: null },
    [currentSeriesIndex, humanClub, leagues],
  );

  const [gameLength, setGameLength] = useState<GameLengthInnings>(5);
  const [liveSession, setLiveSession] = useState<GameSessionState | null>(null);
  const [activeOpponentId, setActiveOpponentId] = useState<string>('');
  const [watchChoice, setWatchChoice] = useState('highlights');
  const lastStop = useRef<string | null>(null);
  const [thirdDecision, setThirdDecision] = useState<{
    event: PlayEvent; film: ChoreographedStep; call: TacticalCall;
    options: Parameters<typeof stepPitch>[2]; hold: ReturnType<typeof stepPitch>;
  } | null>(null);
  const gameLog = useRef<PlayEvent[]>([]);
  const guidedPitchEvents = useRef(new Set<number>());
  const fullSeasonSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (openingSeasonExpanded) {
      fullSeasonSectionRef.current?.scrollIntoView?.({
        behavior: 'auto',
        block: 'start',
      });
    }
  }, [openingSeasonExpanded]);
  const [entranceCue, setEntranceCue] = useState<PlayerEntranceCue | null>(null);
  const finishEntrance = useCallback(() => setEntranceCue(null), []);
  const [guidedHalf, setGuidedHalf] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const wideStudio = useWideStudio();
  const liveKeysRef = useRef<(event: KeyboardEvent) => void>(() => {});
  liveKeysRef.current = () => {};
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => liveKeysRef.current(event);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const [recentEvents, setRecentEvents] = useState<PlayEvent[]>([]);
  const [playbackEvent, setPlaybackEvent] = useState<PlayEvent | null>(null);
  const [finishedPlay, setFinishedPlay] = useState<ChoreographedStep | null>(null);
  const [prePlaySession, setPrePlaySession] = useState<GameSessionState | null>(null);
  const [revealedPlay, setRevealedPlay] = useState<ChoreographedStep | null>(null);
  const [lastChoreo, setLastChoreo] = useState<ChoreographedStep | null>(null);
  const [speed, setSpeed] = useState<1 | 2 | 4>(1);
  const [watchMode, setWatchMode] = useState<'live' | 'smart' | 'clutch' | 'paused'>('paused');
  const [smartPauseReason, setSmartPauseReason] = useState<string | null>(null);
  const [cameraMode, setCameraMode] = useState<LiveCameraMode>('auto');
  const [tacticalCall, setTacticalCall] = useState<TacticalCall>('normal');
  const [selectedPitchType, setSelectedPitchType] = useState<PitchType | null>(null);
  const [pitchTarget, setPitchTarget] = useState<PitchTargetIntent>('attack_zone');
  const [shakeOffCount, setShakeOffCount] = useState(0);
  const [batterGuess, setBatterGuess] = useState<BatterPitchGuess>('none');
  const [moundVisitUsed, setMoundVisitUsed] = useState(false);
  const [argueUsed, setArgueUsed] = useState(false);
  const [managerEjected, setManagerEjected] = useState(false);
  const [foilModalOpen, setFoilModalOpen] = useState(false);
  const [armedPowerId, setArmedPowerId] = useState<string | null>(null);
  const [atBatEvents, setAtBatEvents] = useState<PlayEvent[]>([]);
  const [defensiveShift, setDefensiveShift] = useState<DefensiveShiftId>('standard');
  const [winProbHistory, setWinProbHistory] = useState<number[]>([0.52]);
  const [warmingRelieverIds, setWarmingRelieverIds] = useState<string[]>([]);
  const [warmupCounts, setWarmupCounts] = useState<Record<string, number>>({});
  const [powerTracker, setPowerTracker] = useState<InGameManagerPowerTracker>(() =>
    createInGameManagerPowerTracker(),
  );
  const [modalSummary, setModalSummary] = useState<PostGameSummary | null>(null);
  const [delayedSummary,setDelayedSummary]=useState<{summary:PostGameSummary; delay:number}|null>(null);
  const [pendingRelief,setPendingRelief]=useState<{event:PlayEvent;delay:number}|null>(null);
  const controlMode = useUserPreferencesStore((s) => s.gameDayControlMode);
  const pitchingMode = useUserPreferencesStore((s) => s.pitchingMode);
  const setPitchingMode = useUserPreferencesStore((s) => s.setPitchingMode);
  const bullpenMode = useUserPreferencesStore((s) => s.bullpenMode);
  const setBullpenMode = useUserPreferencesStore((s) => s.setBullpenMode);
  const frontOfficeMode = useUserPreferencesStore((s) => s.frontOfficeMode);
  const hasCustomizedUniform = useUserPreferencesStore((s) => s.hasCustomizedUniform);
  const markUniformCustomized = useUserPreferencesStore((s) => s.markUniformCustomized);
  const [dismissedBullpenKey, setDismissedBullpenKey] = useState<string | null>(null);
  const [activeRelieverWarmupBonus, setActiveRelieverWarmupBonus] = useState<{
    pitcherId: string;
    controlBonus: number;
  } | null>(null);
  const eventInGuide = Boolean(playbackEvent && guidedHalf === playbackEvent.inning + playbackEvent.half);
  const guiding = Boolean(liveSession && controlMode === 'simple' && watchMode === 'paused' &&
    (eventInGuide || guidedHalf === liveSession.inning + liveSession.half));
  const changedSides = Boolean(playbackEvent && liveSession &&
    (playbackEvent.inning !== liveSession.inning || playbackEvent.half !== liveSession.half));
  const stole = playbackEvent?.type === 'stolen_base_attempt';
  const handoff = Boolean(guiding && eventInGuide && !showMore && liveSession && playbackEvent &&
    (stole || (playbackEvent.outcome && (changedSides || liveSession.status === 'completed' ||
      playbackEvent.batterId !== getCurrentBatter(liveSession).id))));
  useEffect(()=>{
    if (handoff || !delayedSummary) return;
    const timer=window.setTimeout(()=>{setModalSummary(delayedSummary.summary);setDelayedSummary(null);},delayedSummary.delay);
    return ()=>window.clearTimeout(timer);
  },[delayedSummary,handoff]);
  useEffect(()=>{
    if (!pendingRelief || handoff) return;
    const timer=window.setTimeout(()=>{
      setPendingRelief(null);
      setPlaybackEvent(pendingRelief.event);
      setLastChoreo(choreographPlayEvent(pendingRelief.event,speed));
      soundEngine.play('bullpen_phone');
    }, playbackEvent ? pendingRelief.delay : 0);
    return ()=>window.clearTimeout(timer);
  },[pendingRelief,speed,handoff,playbackEvent]);
  const [boxScoreOpen, setBoxScoreOpen] = useState(false);
  const [inspectedGamePlayerId, setInspectedGamePlayerId] = useState<string | null>(null);
  const [preGameScoutPlayerId, setPreGameScoutPlayerId] = useState<string | null>(null);
  const [clutchRecap, setClutchRecap] = useState<string | null>(null);
  const [showPitchMath, setShowPitchMath] = useState(false);
  const [gameWeather, setGameWeather] = useState<GameDayWeather | null>(null);
  const wakeLockEnabled = useUserPreferencesStore((s) => s.wakeLockEnabled);
  const setControlMode = useUserPreferencesStore((s) => s.setGameDayControlMode);
  const toggleControlMode = useUserPreferencesStore((s) => s.toggleGameDayControlMode);
  const arcadeTimingEnabled = useUserPreferencesStore((s) => s.arcadeTimingEnabled);
  const toggleArcadeTiming = useUserPreferencesStore((s) => s.toggleArcadeTiming);
  const pendingLivePlayoff = usePostseasonStore((s) => s.pendingLiveGame);
  const recordLivePlayoffResult = usePostseasonStore((s) => s.recordLivePlayoffResult);
  const nemesisHistory = useNemesisStore((s) => s.history);
  const recordNemesisEvents = useNemesisStore((s) => s.recordEvents);
  const unopenedPacks = useFoilPackStore((s) => s.unopenedPacks);
  const awardFoilPack = useFoilPackStore((s) => s.awardPack);

  const nextScheduled = seasonSchedule.nextSeries;
  const scheduledOpponent = pendingLivePlayoff
    ? (opponents.find((c) => c.id === pendingLivePlayoff.opponentClubId) ?? opponents[0])
    : (nextScheduled?.opponent ?? opponents[0]);
  const scheduledIsHome = pendingLivePlayoff ? true : (nextScheduled?.isHome ?? true);
  const activeOpponent = opponents.find((c) => c.id === activeOpponentId) ?? scheduledOpponent;

  const buildScheduledMoment = useCallback((isOpeningHero = false) => {
    if (!humanClub || !scheduledOpponent) return null;
    return createClutchMomentSession({
      awayClub: scheduledIsHome ? scheduledOpponent : humanClub,
      homeClub: scheduledIsHome ? humanClub : scheduledOpponent,
      seed: worldSeed + humanClub.wins + humanClub.losses + 1,
      regulationInnings: gameLength,
      awayGameplan: scheduledIsHome ? 'balanced' : activeGameplan,
      homeGameplan: scheduledIsHome ? activeGameplan : 'balanced',
      pressureLevel: pendingLivePlayoff?.pressureLevel ?? 'regular',
      chargeOpeningPower: isOpeningHero,
    });
  }, [humanClub, scheduledOpponent, scheduledIsHome, worldSeed, gameLength, activeGameplan, pendingLivePlayoff]);
  const openingMoment = useMemo(() => !liveSession && humanClub && humanClub.wins + humanClub.losses === 0
    ? openingRequest ?? buildScheduledMoment(true) : null, [openingRequest, buildScheduledMoment, liveSession, humanClub]);

  const rivalryPreview = useMemo(() => {
    if (!humanClub || !activeOpponent) return null;
    const starterRecord = createCrosstownStarterRivalry(humanClub, activeOpponent);
    return buildRivalryShowdownPreview(humanClub, activeOpponent, starterRecord);
  }, [humanClub, activeOpponent]);

  const boardTier = humanClub?.leagueTier;
  const inRegularGame = Boolean(liveSession && liveSession.status === 'in_progress' && !pendingLivePlayoff);
  const innings = liveSession?.regulationInnings ?? gameLength;
  const settleWire = useGameStore(state => state.settleOutOfTownGame);
  useEffect(() => {
    if (inRegularGame && changedSides) settleWire(innings);
  },[inRegularGame,changedSides,settleWire,innings]);
  const final = humanClub?.leagueWireFinal;
  const roundSeed = seriesRoundSeed(worldSeed,seasonNumber,currentSeriesIndex,boardTier ?? 'rookie');
  const leagueBoard = changedSides && inRegularGame && final?.roundSeed === roundSeed && final.gameIndex === currentGameInSeries ? final : null;
  const hasLiveSession = liveSession !== null;
  useEffect(() => { onLiveChange?.(hasLiveSession); }, [hasLiveSession, onLiveChange]);
  useEffect(() => {
    if (!lastChoreo || revealedPlay === lastChoreo) return;
    const decisionMs = decisionDelayMs(lastChoreo);
    const timer = window.setTimeout(() => {
      setRevealedPlay(lastChoreo);
      if (lastChoreo.soundCue && !playbackEvent?.specialPowerTriggered) soundEngine.play(lastChoreo.soundCue);
      if (useUserPreferencesStore.getState().hapticsEnabled) {
        const outcome = playbackEvent?.outcome;
        if (outcome === 'home_run' || outcome === 'strikeout') triggerHapticPulse(outcome);
        if (outcome === 'single' || outcome === 'double' || outcome === 'triple') triggerHapticPulse('hit');
      }
      if (playbackEvent && prePlaySession && humanClub) {
        const unlock = detectLiveCelebrationSticker({
          event: playbackEvent,
          before: prePlaySession,
          earnedStickerIds: humanClub.earnedStickerIds ?? [],
          mascotName: humanClub.mascot,
        });
        if (unlock && unlockCelebrationSticker(unlock.sticker.id)) {
          setStickerToast(unlock);
          soundEngine.play('trophy_fanfare');
        }
      }
    }, decisionMs);
    return () => window.clearTimeout(timer);
  }, [lastChoreo, playbackEvent, prePlaySession, revealedPlay, humanClub, unlockCelebrationSticker]);
  useEffect(() => {
    if (!lastChoreo || finishedPlay === lastChoreo) return;
    const timer = window.setTimeout(() => setFinishedPlay(lastChoreo), lastChoreo.durationMs);
    return () => window.clearTimeout(timer);
  }, [lastChoreo, finishedPlay]);

  useEffect(() => {
    safeScrollTop();
  }, [hasLiveSession]);

  // Keep Android screen awake during active live 3D games when Wake Lock preference is ON
  useEffect(() => {
    if (!liveSession || liveSession.status !== 'in_progress' || !wakeLockEnabled) return undefined;
    let cancelled = false;
    let releaseFn: (() => Promise<void>) | null = null;
    void requestGameWakeLock().then((handle) => {
      if (cancelled) {
        void handle.release();
      } else {
        releaseFn = handle.release;
      }
    });
    return () => {
      cancelled = true;
      if (releaseFn) void releaseFn();
    };
  }, [liveSession?.status, wakeLockEnabled, liveSession]);

  const finalizeSessionIfComplete = useCallback(
    (finalState: GameSessionState, eventsList: PlayEvent[], opponentId: string, delay=0) => {
      if (finalState.status !== 'completed') return;
      const isHumanHome = finalState.home.isHuman;
      const humanSide = isHumanHome ? finalState.home : finalState.away;
      const rivalSide = isHumanHome ? finalState.away : finalState.home;
      const result: GameSessionResult = {
        finalState,
        events: eventsList,
        awayScore: finalState.away.score,
        homeScore: finalState.home.score,
        winnerClubId: finalState.winnerClubId ?? finalState.home.clubId,
        boxScore: finalState.boxScore,
        playerStatDeltas: buildPlayerStatDeltas(finalState.boxScore),
      };
      const summary = commitCompletedGame(opponentId, result, isHumanHome, guidedPitchEvents.current);
      if (useUserPreferencesStore.getState().frontOfficeMode === 'auto') {
        runHumanRoutineFrontOfficePass();
      }
      if (pendingLivePlayoff && pendingLivePlayoff.opponentClubId === opponentId) {
        recordLivePlayoffResult(result.winnerClubId, result.awayScore, result.homeScore);
      }
      if (result.winnerClubId === humanSide.clubId) {
        awardFoilPack(
          pendingLivePlayoff ? 'championship_holo' : rivalryPreview ? 'rivalry_chrome' : 'sandlot_foil',
          pendingLivePlayoff
            ? `Postseason Win vs ${rivalSide.name}`
            : `Victory ${isHumanHome ? 'vs' : '@'} ${rivalSide.name} (${humanSide.score}-${rivalSide.score})`,
        );
      }
      if (summary?.sweepBonusAwarded) {
        awardFoilPack('sandlot_foil', `3-0 Series Sweep vs ${rivalSide.name}!`);
      }
      if (summary) {
        if (delay) setDelayedSummary({summary,delay});
        else setModalSummary(summary);
        setWatchMode('paused');
      }
    },
    [awardFoilPack, commitCompletedGame, pendingLivePlayoff, recordLivePlayoffResult, rivalryPreview],
  );

  const handleStartLiveGame = (initialWatch: boolean | 'smart' = false) => {
    if (!humanClub || !scheduledOpponent) return;
    const opp = scheduledOpponent;
    const isHumanHome = scheduledIsHome;
    const awayClub = isHumanHome ? opp : humanClub;
    const homeClub = isHumanHome ? humanClub : opp;
    const seed = worldSeed + humanClub.wins + humanClub.losses + 1;
    const pressure = pendingLivePlayoff?.pressureLevel ?? 'regular';
    const session = createGameSession(
      awayClub,
      homeClub,
      seed,
      pressure,
      gameLength,
      isHumanHome ? 'balanced' : activeGameplan,
      isHumanHome ? activeGameplan : 'balanced',
    );
    lastStop.current = null;
    setActiveOpponentId(opp.id);
    setLiveSession(session);
    setRecentEvents([]);
    setAtBatEvents([]);
    setArmedPowerId(null);
    setPitchTarget('attack_zone');
    setShakeOffCount(0);
    setBatterGuess('none');
    setMoundVisitUsed(false);
    setArgueUsed(false);
    setManagerEjected(false);
    setLastChoreo(null);
    guidedPitchEvents.current.clear();
    gameLog.current = [];
    setTacticalCall('normal');
    setEntranceCue(null);
    setGuidedHalf(null);
    setPlaybackEvent(null);
    setSelectedPitchType(null);
    setDefensiveShift('standard');
    setWinProbHistory([estimateHomeWinProbability(session)]);
    setWarmingRelieverIds([]);
    setWarmupCounts({});
    setDismissedBullpenKey(null);
    setActiveRelieverWarmupBonus(null);
    setPowerTracker(createInGameManagerPowerTracker());
    setModalSummary(null);
    setBoxScoreOpen(false);
    setDelayedSummary(null);
    setPendingRelief(null);
    setInspectedGamePlayerId(null);
    setPreGameScoutPlayerId(null);
    setClutchRecap(null);
    const park = getBallparkPreset(session.ballparkId);
    const rolledWeather = rollGameDayWeather(createSeededRng(seed + 41), {
      isDome: park.factors.isDome,
      hasNightLights: homeClub.stadium.hasNightLights,
    });
    setGameWeather(rolledWeather);
    setWatchMode(initialWatch === 'smart' ? 'smart' : initialWatch ? 'live' : 'paused');
    setSmartPauseReason(null);
    setCameraMode('auto');
    bgmEngine.syncStadium(session.ballparkId);
    soundEngine.play(rolledWeather.condition === 'drizzle' ? 'rain_thunder' : 'organ_charge');
  };

  const handleStartClutchMoment = useCallback((guided = false) => {
    if (!humanClub || !scheduledOpponent) return;
    const opp = scheduledOpponent;
    const isHumanHome = scheduledIsHome;
    const homeClub = isHumanHome ? humanClub : opp;
    const seed = worldSeed + humanClub.wins + humanClub.losses + 1;
    const clutch = openingMoment ?? buildScheduledMoment();
    if (!clutch) return;
    setActiveOpponentId(opp.id);
    guidedPitchEvents.current.clear();
    lastStop.current = null;
    gameLog.current = [...clutch.gameEvents];
    const openingBatting = (clutch.session.half === 'BOT') === clutch.session.home.isHuman;
    setEntranceCue(guided ? {role: openingBatting ? 'batter' : 'pitcher'} : null);
    setGuidedHalf(guided ? clutch.session.inning + clutch.session.half : null);
    setShowMore(false);
    setTacticalCall(guided && (clutch.session.half === 'BOT') === clutch.session.home.isHuman ? 'contact' : 'normal');
    setLiveSession(clutch.session);
    setRecentEvents([...clutch.events].reverse());
    setAtBatEvents([]);
    setArmedPowerId(null);
    setPitchTarget('attack_zone');
    setShakeOffCount(0);
    setBatterGuess('none');
    setMoundVisitUsed(false);
    setArgueUsed(false);
    setManagerEjected(false);
    setLastChoreo(null);
    setPlaybackEvent(null);
    setSelectedPitchType(null);
    setDefensiveShift('standard');
    setWinProbHistory([estimateHomeWinProbability(clutch.session)]);
    setWarmingRelieverIds([]);
    setWarmupCounts({});
    setDismissedBullpenKey(null);
    setActiveRelieverWarmupBonus(null);
    setPowerTracker(createInGameManagerPowerTracker());
    setModalSummary(null);
    setBoxScoreOpen(false);
    setDelayedSummary(null);
    setPendingRelief(null);
    setInspectedGamePlayerId(null);
    setPreGameScoutPlayerId(null);
    setClutchRecap(clutch.recapHeadline);
    const park = getBallparkPreset(clutch.session.ballparkId);
    const rolledWeather = rollGameDayWeather(createSeededRng(seed + 41), {
      isDome: park.factors.isDome,
      hasNightLights: homeClub.stadium.hasNightLights,
    });
    setGameWeather(rolledWeather);
    setWatchMode('paused');
    bgmEngine.syncStadium(clutch.session.ballparkId);
    soundEngine.play('clutch_stinger');
  }, [humanClub, scheduledOpponent, scheduledIsHome, worldSeed, openingMoment, buildScheduledMoment]);

  const enteredOpening = useRef<ClutchMomentLaunch | null>(null);
  useEffect(() => {
    if (!openingRequest || enteredOpening.current === openingRequest) return;
    enteredOpening.current = openingRequest;
    handleStartClutchMoment(true);
    onOpeningStarted?.();
  }, [openingRequest, handleStartClutchMoment, onOpeningStarted]);

  const applyStepResult = useCallback(
    (nextSession: GameSessionState, emitted: PlayEvent[], oppId: string, calledTarget?: PitchTargetIntent, resumeAt?: number) => {
      gameLog.current.push(...emitted);
      setClutchRecap(null);
      setEntranceCue(null);
      setPrePlaySession(liveSession);
      setLiveSession(nextSession);
      setShakeOffCount(0);
      if (liveSession) {
        const halfChanged =
          nextSession.half !== liveSession.half || nextSession.inning !== liveSession.inning;
        const prevBatting = getBattingSide(liveSession);
        const nextBatting = getBattingSide(nextSession);
        const batterChanged = !halfChanged && nextBatting.lineupIndex !== prevBatting.lineupIndex;
        if (halfChanged) {
          setTacticalCall('normal');
          setBatterGuess('none');
          setArmedPowerId(null);
          setPitchTarget('attack_zone');
          setSelectedPitchType(null);
          setDismissedBullpenKey(null);
        } else if (batterChanged) {
          setTacticalCall((prev) => (prev === 'bunt' ? 'normal' : prev));
          setPitchTarget('attack_zone');
        }
      }
      setWinProbHistory((prev) => [...prev.slice(-23), estimateHomeWinProbability(nextSession)]);
      if (warmingRelieverIds.length > 0) {
        setWarmupCounts((prev) => tickBullpenWarmups(prev, warmingRelieverIds));
      }
      // An inning-ending out can be followed by administrative events in the same step.
      const lastEvent = emitted.slice().reverse().find(e => e.outcome || e.type === 'stolen_base_attempt')
        ?? emitted.at(-1);
      setPendingRelief(null);
      let summaryDelay=0;
      setPlaybackEvent(lastEvent ?? null);
      if (lastEvent) {
        const before = emitted[emitted.indexOf(lastEvent) - 1];
        const prior = before ?? liveSession;
        const basesBefore = prior?.half === lastEvent.half && prior.inning === lastEvent.inning
          ? before?.basesAfter ?? liveSession?.bases : undefined;
        const walkoff=emitted.some(e=>e.type==='game_end' && e.soundCue==='fireworks_boom');
        const beforeHome=before?.homeScore ?? liveSession?.home.score ?? 0;
        const beforeAway=before?.awayScore ?? liveSession?.away.score ?? 0;
        const runsScored=lastEvent.half==='BOT' ? lastEvent.homeScore-beforeHome : lastEvent.awayScore-beforeAway;
        const choreo = choreographPlayEvent(lastEvent, speed, basesBefore, {walkoff,runsScored,
          winningRunIndex:walkoff ? Math.max(0,lastEvent.awayScore-beforeHome) : 0});
        if (resumeAt && choreo.play) {
          choreo.startAt = resumeAt;
          choreo.durationMs = Math.round(choreo.durationMs * (1-resumeAt/choreo.play.duration));
        }
        if (choreo.play?.close && calledTarget) choreo.play.pitchTarget = calledTarget;
        if (guiding && !showMore && choreo.play && forceAtFirst(choreo.play)) {
          choreo.play.holdForceCall = true;
          choreo.durationMs += Math.round(FORCE_HOLD_SECONDS * 1000 / speed);
          choreo.soundCue = 'glove_pop';
        }
        const relief=emitted.slice(emitted.indexOf(lastEvent)+1).find(e=>e.type==='pitching_change');
        if (watchMode === 'smart' && !walkoff) choreo.durationMs = Math.min(choreo.durationMs, Math.round(580 / speed));
        if (nextSession.status === 'completed') summaryDelay = choreo.durationMs;
        if (relief) setPendingRelief({event: relief, delay: choreo.durationMs});
        choreo.leadRunnerId = basesBefore?.[0] ?? undefined;
        setLastChoreo(choreo);
        if (lastEvent.specialPowerTriggered) {
          soundEngine.play('heritage_power_surge');
        }
        if (emitted.some((ev) => ev.soundCue === 'organ_seventh_stretch')) {
          soundEngine.play('organ_seventh_stretch');
        }
        setRecentEvents((prev) => [...emitted.slice().reverse(), ...prev].slice(0, 12));
        recordNemesisEvents(emitted);
        const pitchEvs = emitted.filter((ev) => Boolean(ev.pitchThrown));
        if (pitchEvs.length > 0) {
          const latestBatterId = pitchEvs[pitchEvs.length - 1].batterId;
          setAtBatEvents((prev) => {
            const sameBatter = prev.length > 0 && prev[0].batterId === latestBatterId;
            return [...(sameBatter ? prev : []), ...pitchEvs].slice(-10);
          });
        }
      }
      finalizeSessionIfComplete(nextSession, gameLog.current, oppId,summaryDelay);
    },
    [finalizeSessionIfComplete, speed, watchMode, warmingRelieverIds, liveSession, recordNemesisEvents, guiding, showMore],
  );

  const resolveLiveStepInputs = useCallback(
    (session: GameSessionState, callOverride?: TacticalCall, timingGrade?: ArcadeTimingGrade) => {
      const batterNow = getCurrentBatter(session);
      const pitcherNow = getCurrentPitcher(session);
      const nemesisBonus =
        evaluateNemesisMatchup(
          nemesisHistory,
          batterNow.id,
          pitcherNow.id,
          batterNow.name,
          pitcherNow.name,
        ) ?? undefined;
      const aiRng = createSeededRng(
        (session.rngSeed ^ Math.imul(session.stepCounter + 1, 0x9e3779b1)) >>> 0,
      );
      const warmupBonus =
        activeRelieverWarmupBonus && activeRelieverWarmupBonus.pitcherId === pitcherNow.id
          ? activeRelieverWarmupBonus.controlBonus
          : undefined;
      return resolveIsolatedStepInputs(
        session,
        {
          tacticalCall: callOverride ?? tacticalCall,
          pitchingMode,
          bullpenMode,
          shakeOffCount,
          pitchTarget,
          selectedPitchType,
          defensiveShift,
          batterGuess,
          armedPowerId,
          arcadeTimingGrade: timingGrade,
          relieverWarmupControlBonus: warmupBonus,
        },
        aiRng,
        {
          weatherImpact: gameWeather ? evaluateWeatherSimulationImpact(gameWeather) : undefined,
          nemesisBonus,
        },
      );
    },
    [
      activeRelieverWarmupBonus,
      armedPowerId,
      batterGuess,
      bullpenMode,
      defensiveShift,
      gameWeather,
      nemesisHistory,
      pitchTarget,
      pitchingMode,
      selectedPitchType,
      shakeOffCount,
      tacticalCall,
    ],
  );

  const handleNextPitch = useCallback((call = tacticalCall, timingGrade?: ArcadeTimingGrade) => {
    if (!liveSession || liveSession.status === 'completed') return;
    const isolated = resolveLiveStepInputs(liveSession, call, timingGrade);
    if (thirdDecision) return;
    const managed = watchMode === 'paused' && getBattingSide(liveSession).isHuman;
    const options = { ...isolated.options, thirdBaseCall:managed ? 'hold' as const : 'coach' as const };
    const result = stepPitch(liveSession, isolated.tacticalCall, options);
    const {nextSession, events} = result;
    const choice = managed && events.find(e => e.thirdBase?.close);
    if (choice) {
      const film = choreographPlayEvent(choice, speed, liveSession.bases);
      film.freezeAt = film.play!.pickupAt;
      setThirdDecision({event:choice,film,call:isolated.tacticalCall,options,hold:result});
      return;
    }
    if (guiding && !showMore) {
      for (const event of events) guidedPitchEvents.current.add(event.seq);
    }
    setArmedPowerId(null);
    applyStepResult(nextSession, events, activeOpponentId, isolated.options.pitchTarget);
    if (
      call === 'steal' ||
      call === 'steal_3b' ||
      call === 'double_steal' ||
      call === 'steal_home' ||
      call === 'pitchout' ||
      call === 'hold_runner' ||
      call === 'intentional_walk'
    ) {
      setTacticalCall('normal');
    }
  }, [activeOpponentId, applyStepResult, guiding, liveSession, resolveLiveStepInputs, showMore, tacticalCall, thirdDecision, watchMode, speed]);

  const handleSimAtBat = () => {
    if (!liveSession || liveSession.status === 'completed') return;
    const isolated = resolveLiveStepInputs(liveSession, tacticalCall);
    const { nextSession, events } = stepAtBat(
      liveSession,
      isolated.tacticalCall,
      isolated.options,
    );
    setArmedPowerId(null);
    applyStepResult(nextSession, events, activeOpponentId);
  };

  const handleSimHalfInning = () => {
    if (!liveSession || liveSession.status === 'completed') return;
    const battingIsHuman = (liveSession.half === 'BOT') === liveSession.home.isHuman;
    const safeCall: TacticalCall =
      battingIsHuman && isOffensiveTacticalCall(tacticalCall) && tacticalCall !== 'bunt'
        ? tacticalCall
        : 'normal';
    const { nextSession, events } = stepHalfInning(liveSession, safeCall);
    setArmedPowerId(null);
    applyStepResult(nextSession, events, activeOpponentId);
  };

  const handleClutchSim = () => {
    if (!liveSession || liveSession.status === 'completed') return;
    const { nextSession, events } = simUntilClutchOrEnd(liveSession);
    applyStepResult(nextSession, events, activeOpponentId);
  };

  const handleSimToEnd = () => {
    if (!humanClub || !activeOpponent || liveSession?.status==='completed') return;
    setPendingRelief(null);
    if (liveSession) {
      const full = simRemainingGame(liveSession);
      setLiveSession(full.finalState);
      setRecentEvents((prev) => [...full.events.slice(-8).reverse(), ...prev].slice(0, 12));
      finalizeSessionIfComplete(full.finalState, [...gameLog.current,...full.events], activeOpponent.id);
      setWatchMode('paused');
      soundEngine.play('crowd_cheer');
      return;
    }
    const isHumanHome = scheduledIsHome;
    const awayClub = isHumanHome ? activeOpponent : humanClub;
    const homeClub = isHumanHome ? humanClub : activeOpponent;
    const seed = worldSeed + humanClub.wins + humanClub.losses + 1;
    const full = simFullGame(
      awayClub,
      homeClub,
      seed,
      gameLength,
      pendingLivePlayoff?.pressureLevel ?? 'regular',
      isHumanHome ? 'balanced' : activeGameplan,
      isHumanHome ? activeGameplan : 'balanced',
    );
    setLiveSession(full.finalState);
    setRecentEvents(full.events.slice(-8).reverse());
    finalizeSessionIfComplete(full.finalState, full.events, activeOpponent.id);
    setWatchMode('paused');
    soundEngine.play('crowd_cheer');
  };

  const handleInstantSimPreGame = () => {
    if (!humanClub || !scheduledOpponent) return;
    const opp = scheduledOpponent;
    const isHumanHome = scheduledIsHome;
    const awayClub = isHumanHome ? opp : humanClub;
    const homeClub = isHumanHome ? humanClub : opp;
    const seed = worldSeed + humanClub.wins + humanClub.losses + 1;
    const full = simFullGame(
      awayClub,
      homeClub,
      seed,
      gameLength,
      pendingLivePlayoff?.pressureLevel ?? 'regular',
      isHumanHome ? 'balanced' : activeGameplan,
      isHumanHome ? activeGameplan : 'balanced',
    );
    finalizeSessionIfComplete(full.finalState, full.events, opp.id);
    soundEngine.play('crowd_cheer');
  };

  const handleBullpenSwap = (relieverId: string) => {
    if (!liveSession) return;
    const sideKey = liveSession.home.isHuman ? 'home' : 'away';
    const warmup = evaluateBullpenWarmup(relieverId, warmupCounts[relieverId] ?? 0);
    const swapped = manualSwapPitcher(liveSession, sideKey, relieverId);
    if (swapped.event) {
      setSelectedPitchType(null);
      setShakeOffCount(0);
      setDismissedBullpenKey(null);
      setActiveRelieverWarmupBonus(
        warmup.status === 'hot' ? { pitcherId: relieverId, controlBonus: 2 } : null,
      );
      applyStepResult(swapped.nextSession, [swapped.event], activeOpponentId);
    }
  };

  useEffect(() => {
    if (
      pendingRelief || (watchMode !== 'live' && watchMode !== 'smart') ||
      !liveSession ||
      liveSession.status === 'completed'
    ) {
      return undefined;
    }
    const humanKey: 'away' | 'home' = liveSession.home.isHuman ? 'home' : 'away';
    if (bullpenMode === 'semi_auto') {
      const pendingCall = evaluateBullpenCall(liveSession, humanKey);
      if (pendingCall && pendingCall.snoozeKey !== dismissedBullpenKey) {
        setWatchMode('paused');
        setSmartPauseReason(`${pendingCall.shortTag} — Coach Pops has a bullpen call!`);
        return undefined;
      }
    }
    if (watchMode === 'smart') {
      const cueNow = computeLiveActionCue({
        session: liveSession,
        tacticalCall,
        armedPowerId,
        moundVisitUsed,
        bullpenMode,
      });
      const decision = shouldSmartAutoPause(liveSession, playbackEvent, cueNow);
      const reason = watchChoice === 'highlights' ? (playbackEvent && decision.reason) : personalWatchStop(liveSession, watchChoice);
      const stopKey = watchChoice === 'highlights' ? String(playbackEvent?.seq)
        : [watchChoice,reason,liveSession.inning,liveSession.half].join('/');
      if (!reason) lastStop.current = null;
      if (reason && stopKey !== lastStop.current) {
        lastStop.current = stopKey;
        setWatchMode('paused');
        setSmartPauseReason(reason);
        return undefined;
      }
    }
    const delayMs =
      watchMode === 'smart'
        ? Math.min(lastChoreo?.durationMs ?? Math.round(580 / speed), Math.round(580 / speed))
        : (lastChoreo?.durationMs ?? Math.round(900 / speed));
    const timer = window.setTimeout(() => {
      handleNextPitch();
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [
    armedPowerId,
    bullpenMode,
    dismissedBullpenKey,
    handleNextPitch,
    pendingRelief,
    lastChoreo,
    liveSession,
    moundVisitUsed,
    playbackEvent,
    speed,
    tacticalCall,
    watchMode, watchChoice,
  ]);

  if (!humanClub) return null;

  const modalOpponentClub = modalSummary
    ? (opponents.find((c) => c.id === modalSummary.opponentClubId) ?? activeOpponent ?? null)
    : null;

  const computePostGameNextAction = (isLiveContext: boolean): { label: string; onClick: () => void } => {
    if (pendingLivePlayoff) {
      return {
        label: `🏆 Play ${pendingLivePlayoff.seriesLabel} Game ${pendingLivePlayoff.gameNumber}`,
        onClick: () => handleStartLiveGame(false),
      };
    }
    if (currentSeriesIndex >= 7 && onJumpToTab) {
      return {
        label: '🏆 Enter League Playoffs!',
        onClick: () => {
          setModalSummary(null);
          if (isLiveContext) setLiveSession(null);
          onJumpToTab('league');
        },
      };
    }
    if (currentGameInSeries === 0 && lastSeriesRecap) {
      return {
        label: '📰 View Series Recap',
        onClick: () => {
          setModalSummary(null);
          if (isLiveContext) setLiveSession(null);
          safeScrollTop();
        },
      };
    }
    return {
      label: `Play Game ${currentGameInSeries + 1}/3 · Rematch with ${scheduledOpponent?.name ?? 'your rival'}`,
      onClick: () => handleStartLiveGame(false),
    };
  };

  if (!liveSession || !activeOpponent) {
    const inbox = buildManagerActionInbox({
      club: humanClub,
      manager,
      currentSeriesIndex,
      unopenedPackCount: unopenedPacks.length,
    });

    const handleManagerJump = (target: ManagerJumpTarget) => {
      soundEngine.play('ui_pop');
      if (target === 'foil_packs') {
        setFoilModalOpen(true);
        return;
      }
      onJumpToTab?.(target);
    };

    const handleFastSimSeries = () => {
      const res = simNextSeriesRound(gameLength);
      if (useUserPreferencesStore.getState().frontOfficeMode === 'auto') {
        runHumanRoutineFrontOfficePass();
      }
      soundEngine.play(res.winsGained && res.winsGained >= 2 ? 'level_up' : 'ui_pop');
      if (res.winsGained && res.winsGained >= 2) {
        awardFoilPack('sandlot_foil', `Series ${res.seriesCompleted} Victory!`);
      }
      const lvText =
        res.levelUps && res.levelUps.length > 0
          ? ` • ⬆️ ${res.levelUps.length} auto level-up${res.levelUps.length === 1 ? '' : 's'} (+SP ready!)`
          : '';
      const cashText = res.cashEarned ? ` • +$${res.cashEarned.toLocaleString()} cash` : '';
      setGmQuickFeedback(
        `Series ${res.seriesCompleted}/7 complete (${res.winsGained ?? 0}-${res.lossesGained ?? 0})${cashText}${lvText}`,
      );
    };

    const handleQuickPractice = (focusId: TeamPracticeFocusId) => {
      const res = runQuickTeamPracticeAction(focusId);
      if (!res) return;
      soundEngine.play(res.levelUps.length > 0 ? 'level_up' : 'ui_pop');
      setGmQuickFeedback(res.summary);
    };

    const recommendedPractice = recommendTeamPracticeFocus(humanClub);
    const promotionChase = evaluatePromotionChase(
      leagues[humanClub.leagueTier],
      humanClub.id,
      currentSeriesIndex,
    );
    const tiredStarter = detectTiredScheduledStarter(humanClub);
    const rosterSpotlight = evaluateRosterSpotlight(humanClub);
    const currentSeriesRec = seriesResults[currentSeriesIndex] ?? { wins: 0, losses: 0 };
    const currentSeriesStakes = evaluateSeriesStakes(
      currentSeriesRec.wins,
      currentSeriesRec.losses,
    );
    const probableMatchup = scheduledOpponent
      ? buildPreGameProbableMatchup(humanClub, scheduledOpponent)
      : null;
    const lineupCheck = probableMatchup
      ? evaluatePreGameLineupCheck(humanClub, probableMatchup.opponentStarter)
      : null;
    const recapMvpPlayer = lastSeriesRecap
      ? humanClub.roster.find((p) => p.id === lastSeriesRecap.seriesMvp.playerId) ?? null
      : null;
    const isOpeningDay = humanClub.wins + humanClub.losses === 0;
    const clubStars = selectClubSpotlightTrio(humanClub);
    const spotlightTrio = isOpeningDay ? clubStars : [];
    const captainStar = clubStars[0]?.player ?? humanClub.roster[0] ?? null;
    const skillsUnlockedCount = humanClub.roster.reduce(
      (sum, p) => sum + p.unlockedSkillIds.length + p.heritageTierUnlocked,
      0,
    );
    const welcomeChecklist = evaluateWelcomeChecklist({
      packsOpenedCount,
      gamesPlayed: humanClub.wins + humanClub.losses,
      skillsUnlockedCount,
      rewardClaimed: welcomeChecklistClaimed,
    });
    const nextStoryBeat = getNextAvailableStoryChapter(storyState, {
      gamesPlayed: humanClub.wins + humanClub.losses,
      seasonNumber,
    });
    const preGameScoutEntries: InspectableCardEntry[] = [];
    if (probableMatchup && scheduledOpponent) {
      preGameScoutEntries.push(
        {
          player: probableMatchup.humanStarter,
          club: humanClub,
          roleTag: 'YOUR PROBABLE STARTER',
        },
        {
          player: probableMatchup.opponentStarter,
          club: scheduledOpponent,
          roleTag: 'RIVAL PROBABLE STARTER',
        },
        {
          player: probableMatchup.opponentStarHitter,
          club: scheduledOpponent,
          roleTag: 'RIVAL STAR SLUGGER',
        },
      );
    }
    for (const star of clubStars) {
      if (!preGameScoutEntries.some((entry) => entry.player.id === star.player.id)) {
        preGameScoutEntries.push({
          player: star.player,
          club: humanClub,
          roleTag: star.roleBadge,
        });
      }
    }
    if (
      recapMvpPlayer &&
      !preGameScoutEntries.some((entry) => entry.player.id === recapMvpPlayer.id)
    ) {
      preGameScoutEntries.push({
        player: recapMvpPlayer,
        club: humanClub,
        roleTag: `SERIES ${lastSeriesRecap!.seriesNumber} MVP • ${lastSeriesRecap!.seriesMvp.tagLine}`,
      });
    }
    if (openingMoment) {
      const s = openingMoment.session;
      const hero = (s.half === 'BOT') === s.home.isHuman ? getCurrentBatter(s) : getCurrentPitcher(s);
      if (!preGameScoutEntries.some(e => e.player.id === hero.id)) preGameScoutEntries.push({player: hero, club: humanClub, roleTag: 'Opening Day'});
    }
    const activePreGameScoutEntry = preGameScoutPlayerId
      ? (preGameScoutEntries.find((e) => e.player.id === preGameScoutPlayerId) ?? null)
      : null;

    const showFullSeasonHub = !isOpeningDay || openingSeasonExpanded;
    const openingOpponentLabel = scheduledOpponent
      ? `${scheduledIsHome ? 'vs' : '@'} ${scheduledOpponent.city} ${scheduledOpponent.name}`
      : undefined;
    const totalUnspentSp =
      humanClub.roster.reduce((sum, p) => sum + p.skillPoints, 0) + (manager?.skillPoints ?? 0);
    const betweenGameSpotlight = !isOpeningDay
      ? selectBetweenGameSpotlight({
          canClaimStarterReward: welcomeChecklist.canClaimReward,
          unopenedPackCount: unopenedPacks.length,
          hasUnreadStoryBeat: Boolean(nextStoryBeat && onOpenStory),
          storyBeatTitle: nextStoryBeat?.title,
          hasGmDilemma: Boolean(activeGmInboxEvent),
          gmDilemmaHeadline: activeGmInboxEvent?.title,
          totalUnspentSp,
          hasSeriesRecap: Boolean(lastSeriesRecap),
          seriesRecapHeadline: lastSeriesRecap?.headline,
          needsFavoritePick: favoritePlayerIds.length === 0,
          needsUniformStudio: !hasCustomizedUniform && Boolean(onOpenUniforms),
        })
      : null;

    const handleSpotlightAction = (id: NonNullable<typeof betweenGameSpotlight>['primary'] extends infer T ? T extends { id: infer K } ? K : never : never) => {
      if (id === 'starter_reward') {
        const res = claimWelcomeChecklistReward();
        if (res.claimed) {
          awardFoilPack('sandlot_foil', 'Sandlot Starter Goals Complete!');
          soundEngine.play('trophy_fanfare');
          setGmQuickFeedback(`🎉 Starter Goals complete! +$${res.cashBonus.toLocaleString()} Cash + 🎁 Foil Pack!`);
        }
        return;
      }
      if (id === 'foil_pack') {
        setFoilModalOpen(true);
        soundEngine.play('ui_pop');
        return;
      }
      if (id === 'story_chapter' && onOpenStory) {
        soundEngine.play('ui_pop');
        onOpenStory();
        return;
      }
      if (id === 'skill_points' && onJumpToTab) {
        soundEngine.play('ui_pop');
        onJumpToTab('skills');
        return;
      }
      if (id === 'favorite_player' && captainStar) {
        setPreGameScoutPlayerId(captainStar.id);
        soundEngine.play('card_flip');
        return;
      }
      if (id === 'uniform_studio' && onOpenUniforms) {
        markUniformCustomized();
        soundEngine.play('ui_pop');
        onOpenUniforms();
        return;
      }
      if (id === 'derby_invite') {
        setDerbyOpen(true);
        soundEngine.play('organ_charge');
        return;
      }
      if (id === 'series_recap' && typeof document !== 'undefined') {
        document.querySelector('[data-testid="series-recap-card"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (id === 'gm_dilemma' && typeof document !== 'undefined') {
        document.querySelector('[data-testid="manager-clipboard-banner"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      soundEngine.play('ui_pop');
    };

    return (
      <div className="space-y-4">
        {openingMoment && (
          <OpeningDayPrint
            session={openingMoment.session}
            opponentLabel={openingOpponentLabel}
            onStart={() => handleStartClutchMoment(true)}
            onInspect={(player) => setPreGameScoutPlayerId(player.id)}
          />
        )}
        {betweenGameSpotlight?.primary ? (
          <div
            data-testid="between-game-spotlight"
            className="p-2.5 sm:p-3 rounded-2xl border-[2.5px] border-[#192735] bg-[#FFF7E4] shadow-[3px_3px_0_#192735] flex items-center justify-between gap-2"
          >
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex flex-wrap items-center gap-1.5 text-[9.5px] sm:text-[10px] font-extrabold uppercase tracking-wider text-[#83601F]">
                <span>{betweenGameSpotlight.primary.eyebrow}</span>
                {betweenGameSpotlight.secondaryCount > 0 ? (
                  <span className="px-1.5 py-0.5 rounded bg-[#E0FBFC] border border-[#192735]/30 text-[#1D3557]">
                    +{betweenGameSpotlight.secondaryCount} more
                  </span>
                ) : null}
              </div>
              <div className="font-display text-xs sm:text-sm text-[#193D37] leading-snug">
                {betweenGameSpotlight.primary.title}
              </div>
              <div className="hidden sm:block text-[11px] font-bold text-[#4A5068]">
                {betweenGameSpotlight.primary.detail}
              </div>
            </div>
            <ComicButton
              size="sm"
              variant={betweenGameSpotlight.primary.tone}
              icon={<Sparkles className="w-3.5 h-3.5" />}
              onClick={() => handleSpotlightAction(betweenGameSpotlight.primary!.id)}
              className="shrink-0 whitespace-nowrap"
            >
              {betweenGameSpotlight.primary.ctaLabel}
            </ComicButton>
          </div>
        ) : null}

        {/* Opening Day Cute "Meet Your 3 Stars" Manga Card Showcase (Compact 3-col strip on mobile!) */}
        {spotlightTrio.length > 0 ? (
          <div
            data-testid="meet-your-squad-card"
            className="p-2.5 sm:p-3.5 rounded-2xl border-[3px] border-[#181B2C] bg-[#FFF8E7] shadow-[4px_4px_0_#181B2C] space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="font-display text-[11px] sm:text-sm text-[#181B2C] leading-tight">
                🌟 MEET YOUR {humanClub.name.toUpperCase()} STARS! (Tap to Flip)
              </div>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-[#FFC300] border border-[#181B2C] text-[10px] font-extrabold text-[#181B2C] shrink-0">
                OPENING DAY SQUAD
              </span>
            </div>
            <div data-testid="squad-star-grid" className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {spotlightTrio.map((star) => (
                <button
                  key={star.player.id}
                  type="button"
                  data-testid="squad-star-btn"
                  onClick={() => {
                    setPreGameScoutPlayerId(star.player.id);
                    soundEngine.play('card_flip');
                  }}
                  className="p-1.5 sm:p-2.5 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] hover:bg-[#FFF3BF] flex flex-col sm:flex-row items-center text-center sm:text-left gap-1 sm:gap-2.5 cursor-pointer shadow-[2px_2px_0_#181B2C] min-w-0"
                >
                  <PlayerPortraitBadge
                    player={star.player}
                    primaryColor={humanClub.colors.primary}
                    accentColor={humanClub.colors.accent}
                    size="sm"
                  />
                  <div className="min-w-0 w-full">
                    <div className="text-[8.5px] sm:text-[9px] font-extrabold uppercase text-[#7209B7] truncate">
                      {star.roleBadge}
                    </div>
                    <div className="font-display text-[10.5px] sm:text-xs text-[#181B2C] leading-tight truncate">
                      {star.player.name}
                      <span className="hidden sm:inline"> ({star.player.position})</span>
                    </div>
                    <div className="hidden sm:block text-[10px] font-bold text-[#4A5068] truncate">
                      {star.tagline}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* Calm Opening Day Progressive Disclosure Toggle (Auto-scrolls newly revealed options into view on mobile!) */}
        {isOpeningDay ? (
          <button
            type="button"
            data-testid="opening-day-more-toggle"
            aria-expanded={openingSeasonExpanded}
            onClick={() => {
              setOpeningSeasonExpanded((v) => !v);
              soundEngine.play('ui_pop');
            }}
            className="w-full p-2.5 sm:p-3 rounded-2xl border-[3px] border-[#181B2C] bg-[#FFFDF7] hover:bg-[#FFF3BF] shadow-[3px_3px_0_#181B2C] flex items-center justify-between gap-2 text-left cursor-pointer min-h-[48px] transition"
          >
            <div className="min-w-0">
              <div className="font-display text-xs sm:text-sm text-[#181B2C]">
                📋 Full Season &amp; GM Options {openingSeasonExpanded ? '▴' : '▾'}
              </div>
              <div className="text-[10.5px] sm:text-[11px] font-bold text-[#4A5068] truncate sm:whitespace-normal">
                5/7/9-Inn Game • 7-Series Schedule • HR Derby • GM Clipboard
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-xl border-2 border-[#181B2C] bg-[#E0FBFC] text-[#1D3557] font-display text-[10.5px] sm:text-[11px] shrink-0">
              {openingSeasonExpanded ? 'Hide' : 'Show Options'}
            </span>
          </button>
        ) : null}

        {showFullSeasonHub ? (
          <div ref={fullSeasonSectionRef} className="space-y-4 scroll-mt-20">
        {frontOfficeMode === 'semi_auto' ? (
          <FrontOfficeModeBar
            compact
            club={humanClub}
            opponentStarterThrows={probableMatchup?.opponentStarter.throws}
            onApplied={(msg) => setGmQuickFeedback(msg)}
          />
        ) : null}
        {lastSeriesRecap ? (
          <div
            data-testid="series-recap-card"
            className="p-3.5 rounded-2xl border-[3px] border-[#181B2C] bg-[#FFF8E7] shadow-[4px_4px_0_#181B2C] space-y-2.5"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#9D0208]">
                  📰 SANDLOT SPORTS EXTRA — SERIES {lastSeriesRecap.seriesNumber} FINAL
                </div>
                <div className="font-display text-sm sm:text-base text-[#181B2C]">
                  {lastSeriesRecap.headline}
                </div>
              </div>
              <button
                type="button"
                aria-label="Dismiss series recap"
                onClick={() => {
                  clearLastSeriesRecap();
                  soundEngine.play('ui_pop');
                }}
                className="px-2.5 py-1 rounded-lg border-2 border-[#181B2C] bg-[#FFFDF7] text-xs font-extrabold text-[#181B2C] cursor-pointer"
              >
                ✕ Dismiss
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {lastSeriesRecap.gameLines.map((g) => (
                <span
                  key={g.gameNumber}
                  data-testid="series-recap-game-chip"
                  className={`px-2 py-0.5 rounded-lg border-2 border-[#181B2C] font-mono-tabular text-[11px] font-extrabold ${
                    g.won ? 'bg-[#D8F3DC] text-[#1B4332]' : 'bg-[#FFE5EC] text-[#9D0208]'
                  }`}
                >
                  {g.label}
                </span>
              ))}
              <span className="px-2 py-0.5 rounded-lg border border-[#181B2C] bg-[#FFF3BF] text-[11px] font-extrabold text-[#181B2C]">
                {lastSeriesRecap.standingsShiftText}
              </span>
              {lastSeriesRecap.cashEarned > 0 ? (
                <span className="px-2 py-0.5 rounded-lg border border-[#181B2C] bg-[#E0FBFC] text-[11px] font-extrabold text-[#1D3557]">
                  +${lastSeriesRecap.cashEarned.toLocaleString()} Cash
                  {lastSeriesRecap.sweepBonusAwarded ? ' (incl. Sweep Bonus!)' : ''}
                </span>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-dashed border-[#181B2C]/25">
              <button
                type="button"
                data-testid="series-recap-mvp-btn"
                onClick={() => {
                  setPreGameScoutPlayerId(lastSeriesRecap.seriesMvp.playerId);
                  soundEngine.play('card_flip');
                }}
                className="px-2.5 py-1.5 rounded-xl border-2 border-[#181B2C] bg-[#FFC300] hover:bg-[#FFD166] text-xs font-extrabold text-[#181B2C] cursor-pointer flex items-center gap-2"
              >
                {recapMvpPlayer ? (
                  <PlayerPortraitBadge
                    player={recapMvpPlayer}
                    primaryColor={humanClub.colors.primary}
                    accentColor={humanClub.colors.accent}
                    size="xs"
                  />
                ) : null}
                <span>
                  🃏 Series MVP: {lastSeriesRecap.seriesMvp.playerName} (
                  {lastSeriesRecap.seriesMvp.tagLine})
                </span>
              </button>
              {lastSeriesRecap.levelUps.length > 0 && onJumpToTab ? (
                <ComicButton
                  size="sm"
                  variant="violet"
                  onClick={() => {
                    soundEngine.play('ui_pop');
                    onJumpToTab('skills');
                  }}
                >
                  ⚡ {lastSeriesRecap.levelUps.length} Level-Up
                  {lastSeriesRecap.levelUps.length === 1 ? '' : 's'} — Spend SP
                </ComicButton>
              ) : null}
            </div>
          </div>
        ) : null}
        <div data-testid="scheduled-matchup-card">
          <ComicCard
            title={
              pendingLivePlayoff
                ? `🏆 ${pendingLivePlayoff.seriesLabel.toUpperCase()} — GAME ${pendingLivePlayoff.gameNumber}`
                : nextScheduled
                  ? `SERIES ${nextScheduled.seriesNumber} OF 7 • GAME ${currentGameInSeries + 1} OF 3`
                  : '🏆 REGULAR SEASON COMPLETE (21/21 GAMES)'
            }
            subtitle={
              pendingLivePlayoff && scheduledOpponent
                ? `${humanClub.city} ${humanClub.name} vs ${scheduledOpponent.city} ${scheduledOpponent.name} • POSTSEASON PRESSURE ON!`
                : nextScheduled
                  ? `${nextScheduled.isHome ? '🏠 HOME STAND vs' : '✈️ ROAD TRIP @'} ${nextScheduled.opponent.city} ${nextScheduled.opponent.name} • 🏟️ ${getBallparkPreset(nextScheduled.hostBallparkId).name}`
                  : `${humanClub.city} ${humanClub.name} (${humanClub.wins}-${humanClub.losses}) • Ready for Best-of-3 League Playoffs!`
            }
            headerBg={
              pendingLivePlayoff
                ? '#9D0208'
                : nextScheduled && !nextScheduled.isHome
                  ? '#1D3557'
                  : '#1B4332'
            }
          >
            <div className="space-y-4">
              {pendingLivePlayoff ? (
                <div
                  data-testid="playoff-matchup-banner"
                  className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFF3BF] flex flex-wrap items-center justify-between gap-2 text-xs font-extrabold text-[#181B2C]"
                >
                  <span className="flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-[#E63946]" />
                    Postseason Series Queued: {pendingLivePlayoff.seriesLabel} Game{' '}
                    {pendingLivePlayoff.gameNumber} ({pendingLivePlayoff.pressureLevel.toUpperCase()} Stakes)
                  </span>
                  <span>Tap “Start Live 3D Game” to take the field!</span>
                </div>
              ) : null}

              {scheduledOpponent ? (
                <div className="p-2.5 sm:p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <ClubMascotBuddy
                      mascot={humanClub.mascot}
                      primaryColor={humanClub.colors.primary}
                      secondaryColor={humanClub.colors.secondary}
                      accentColor={humanClub.colors.accent}
                      mood={
                        currentSeriesStakes.isSweepOpportunity || currentSeriesStakes.isRubberMatch
                          ? 'rally'
                          : 'happy'
                      }
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-display text-xs sm:text-sm text-[#181B2C] flex items-center gap-1.5 flex-wrap leading-tight">
                        <span
                          className="w-3 h-3 rounded-full border border-[#181B2C] inline-block shrink-0"
                          style={{ backgroundColor: scheduledOpponent.colors.primary }}
                        />
                        <span>
                          {scheduledIsHome ? 'vs' : '@'} {scheduledOpponent.city}{' '}
                          {scheduledOpponent.name}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded-md border border-[#181B2C] font-display text-[9.5px] shrink-0 ${
                            scheduledIsHome
                              ? 'bg-[#D8F3DC] text-[#1B4332]'
                              : 'bg-[#E0FBFC] text-[#1D3557]'
                          }`}
                        >
                          {scheduledIsHome ? '🏠 HOME' : '✈️ AWAY'}
                        </span>
                      </div>
                      <div className="text-[10.5px] sm:text-[11px] font-bold text-[#4A5068] truncate">
                        {scheduledOpponent.aiArchetype.replace('_', ' ')} • {scheduledOpponent.wins}-{scheduledOpponent.losses} •{' '}
                        {scheduledIsHome ? 'You bat BOT' : 'You bat TOP'}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    {nextScheduled ? (
                      <span
                        data-testid="series-stakes-badge"
                        className={`px-2 py-0.5 rounded-lg border-2 border-[#181B2C] text-[10px] font-extrabold ${
                          currentSeriesStakes.isSweepOpportunity || currentSeriesStakes.isRubberMatch
                            ? 'bg-[#FFC300] text-[#181B2C]'
                            : 'bg-[#FFF3BF] text-[#181B2C]'
                        }`}
                      >
                        {currentSeriesStakes.badgeText}
                      </span>
                    ) : null}
                    <div className="text-[10.5px] font-extrabold text-[#1D3557] px-2 py-0.5 rounded-lg border border-[#181B2C]/30 bg-[#FBF4E4]">
                      🏟️{' '}
                      {
                        getBallparkPreset(
                          (scheduledIsHome ? humanClub : scheduledOpponent).stadium.ballparkId,
                        ).name
                      }
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Calm 1-Hero Play CTA + Tidy Secondary Modes (Always Above the Fold on Mobile!) */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  {!pendingLivePlayoff && !nextScheduled && onJumpToTab ? (
                    <ComicButton
                      variant="gold"
                      size="lg"
                      icon={<Trophy className="w-4 h-4" />}
                      onClick={() => {
                        soundEngine.play('level_up');
                        onJumpToTab('league');
                      }}
                    >
                      Enter League Playoffs
                    </ComicButton>
                  ) : null}
                  <ComicButton
                    variant="turf"
                    size="lg"
                    icon={<Play className="w-4 h-4" />}
                    onClick={() => handleStartLiveGame(false)}
                    className="flex-1 sm:flex-none"
                  >
                    Start Live 3D Game
                  </ComicButton>
                </div>

                <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-center gap-1.5">
                  <ComicButton
                    variant="violet"
                    size="sm"
                    data-testid="start-smart-watch-btn"
                    icon={<Sparkles className="w-3.5 h-3.5" />}
                    onClick={() => handleStartLiveGame('smart')}
                    className="w-full sm:w-auto px-1.5 sm:px-3 text-[10.5px] sm:text-xs"
                  >
                    <span className="hidden sm:inline">✨ Smart Watch 3D</span>
                    <span className="sm:hidden">Smart 3D</span>
                  </ComicButton>
                  <ComicButton
                    variant="coral"
                    size="sm"
                    data-testid="start-clutch-moment-btn"
                    icon={<Flame className="w-3.5 h-3.5" />}
                    onClick={() => handleStartClutchMoment()}
                    className="w-full sm:w-auto px-1.5 sm:px-3 text-[10.5px] sm:text-xs"
                  >
                    <span className="hidden sm:inline">Play Clutch Moment</span>
                    <span className="sm:hidden">Clutch</span>
                  </ComicButton>
                  <ComicButton
                    variant="gold"
                    size="sm"
                    icon={<Zap className="w-3.5 h-3.5" />}
                    onClick={handleInstantSimPreGame}
                    className="w-full sm:w-auto px-1.5 sm:px-3 text-[10.5px] sm:text-xs"
                  >
                    <span className="hidden sm:inline">Instant Sim Game</span>
                    <span className="sm:hidden">Sim Game</span>
                  </ComicButton>
                </div>
              </div>

              {scheduledOpponent && <ParkLineupCard club={humanClub} park={getBallparkPreset((scheduledIsHome ? humanClub : scheduledOpponent).stadium.ballparkId)}
                onSwap={useGameStore.getState().swapLineupSlots}/>}
              {probableMatchup && scheduledOpponent ? (
                <div
                  data-testid="probable-matchup-strip"
                  className="p-2 sm:p-2.5 rounded-xl border-2 border-[#181B2C] bg-[#FBF4E4] space-y-2"
                >
                  {/* Unified Cute 90s Manga Portrait Face-Off + Rival Slugger (Compact 3-col strip on Mobile!) */}
                  <div
                    data-testid="matchup-faceoff-portraits"
                    className="grid grid-cols-3 gap-1.5 sm:gap-2"
                  >
                    <button
                      type="button"
                      data-testid="scout-human-starter-btn"
                      onClick={() => {
                        setPreGameScoutPlayerId(probableMatchup.humanStarter.id);
                        soundEngine.play('card_flip');
                      }}
                      className="p-1.5 sm:p-2 rounded-xl border-2 border-[#181B2C] bg-[#D8F3DC] hover:bg-[#FFF3BF] flex flex-col sm:flex-row items-center text-center sm:text-left gap-1 sm:gap-2 cursor-pointer min-w-0"
                    >
                      <PlayerPortraitBadge
                        player={probableMatchup.humanStarter}
                        primaryColor={humanClub.colors.primary}
                        accentColor={humanClub.colors.accent}
                        size="sm"
                      />
                      <div className="min-w-0 w-full">
                        <div className="text-[8.5px] sm:text-[9px] font-extrabold uppercase text-[#1B4332] truncate">
                          Your SP ({probableMatchup.humanStarter.throws})
                        </div>
                        <div className="font-display text-[10.5px] sm:text-xs text-[#181B2C] truncate">
                          {probableMatchup.humanStarter.name}
                        </div>
                        <div className="text-[9.5px] sm:text-[10px] font-bold text-[#1B4332]">
                          OVR {computePlayerOverall(probableMatchup.humanStarter)}
                          {probableMatchup.humanStarter.formState === 'hot' ||
                          probableMatchup.humanStarter.formState === 'blazing'
                            ? ' 🔥'
                            : ''}
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      data-testid="scout-rival-starter-btn"
                      onClick={() => {
                        setPreGameScoutPlayerId(probableMatchup.opponentStarter.id);
                        soundEngine.play('card_flip');
                      }}
                      className="p-1.5 sm:p-2 rounded-xl border-2 border-[#181B2C] bg-[#E0FBFC] hover:bg-[#FFF3BF] flex flex-col sm:flex-row items-center text-center sm:text-left gap-1 sm:gap-2 cursor-pointer min-w-0"
                    >
                      <PlayerPortraitBadge
                        player={probableMatchup.opponentStarter}
                        primaryColor={scheduledOpponent.colors.primary}
                        accentColor={scheduledOpponent.colors.accent}
                        size="sm"
                      />
                      <div className="min-w-0 w-full">
                        <div className="text-[8.5px] sm:text-[9px] font-extrabold uppercase text-[#1D3557] truncate">
                          Rival SP ({probableMatchup.opponentStarter.throws})
                        </div>
                        <div className="font-display text-[10.5px] sm:text-xs text-[#181B2C] truncate">
                          {probableMatchup.opponentStarter.name}
                        </div>
                        <div className="text-[9.5px] sm:text-[10px] font-bold text-[#1D3557]">
                          OVR {computePlayerOverall(probableMatchup.opponentStarter)}
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      data-testid="scout-rival-star-btn"
                      onClick={() => {
                        setPreGameScoutPlayerId(probableMatchup.opponentStarHitter.id);
                        soundEngine.play('card_flip');
                      }}
                      className="p-1.5 sm:p-2 rounded-xl border-2 border-[#181B2C] bg-[#FFE5EC] hover:bg-[#FFF3BF] flex flex-col sm:flex-row items-center text-center sm:text-left gap-1 sm:gap-2 cursor-pointer min-w-0"
                    >
                      <PlayerPortraitBadge
                        player={probableMatchup.opponentStarHitter}
                        primaryColor={scheduledOpponent.colors.primary}
                        accentColor={scheduledOpponent.colors.accent}
                        size="sm"
                      />
                      <div className="min-w-0 w-full">
                        <div className="text-[8.5px] sm:text-[9px] font-extrabold uppercase text-[#9D0208] truncate">
                          Rival {probableMatchup.opponentStarHitter.position}
                        </div>
                        <div className="font-display text-[10.5px] sm:text-xs text-[#181B2C] truncate">
                          {probableMatchup.opponentStarHitter.name}
                        </div>
                        <div className="text-[9.5px] sm:text-[10px] font-bold text-[#9D0208]">
                          OVR {computePlayerOverall(probableMatchup.opponentStarHitter)}
                        </div>
                      </div>
                    </button>
                  </div>

                  <div className="text-[11px] font-bold text-[#4A5068]">
                    ⚾{' '}
                    {currentSeriesStakes.gamesPlayed > 0
                      ? currentSeriesStakes.summaryLine
                      : probableMatchup.matchupNote}
                  </div>

                  {lineupCheck ? (
                    <div
                      data-testid="pregame-lineup-check"
                      className="pt-1.5 border-t border-dashed border-[#181B2C]/20 space-y-1.5 text-[11px]"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span
                          className={`font-extrabold ${
                            lineupCheck.needsAttention ? 'text-[#9D0208]' : 'text-[#1B4332]'
                          }`}
                        >
                          {lineupCheck.badgeText}
                          {lineupCheck.tips.length > 0 ? `: ${lineupCheck.tips.join(' • ')}` : ''}
                        </span>
                        {(() => {
                          const isTuned =
                            autoTuneStatus?.starterId === probableMatchup.opponentStarter.id;
                          return (
                            <ComicButton
                              size="sm"
                              variant={
                                isTuned ? 'turf' : lineupCheck.needsAttention ? 'gold' : 'cream'
                              }
                              data-testid="auto-tune-lineup-btn"
                              data-confirmed={isTuned ? 'true' : undefined}
                              icon={<Sparkles className="w-3.5 h-3.5" />}
                              onClick={() => {
                                const beforeLineup = humanClub.lineup;
                                autoTuneHumanLineupForStarter(lineupCheck.starterThrows);
                                const afterLineup =
                                  useGameStore.getState().getHumanClub()?.lineup ?? beforeLineup;
                                const diff = summarizeLineupChange(
                                  beforeLineup,
                                  afterLineup,
                                  `vs ${lineupCheck.starterThrows}HP`,
                                );
                                soundEngine.play('level_up');
                                setAutoTuneStatus({
                                  starterId: probableMatchup.opponentStarter.id,
                                  message: diff.message,
                                });
                                setGmQuickFeedback(`✓ ${diff.message}`);
                              }}
                            >
                              {isTuned
                                ? `✓ Tuned vs ${lineupCheck.starterThrows}HP!`
                                : `Auto-Tune vs ${lineupCheck.starterThrows}HP`}
                            </ComicButton>
                          );
                        })()}
                      </div>
                      {autoTuneStatus?.starterId === probableMatchup.opponentStarter.id ? (
                        <div
                          role="status"
                          data-testid="auto-tune-feedback"
                          className="px-2.5 py-1.5 rounded-lg border-2 border-[#1B4332] bg-[#D8F3DC] text-[#1B4332] text-[11px] font-extrabold"
                        >
                          ✓ {autoTuneStatus.message}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* Fun Side Toys: 30s HR Derby, Uniform Studio & Trophy Sticker Album */}
              <div className="flex flex-wrap items-center gap-2">
                <ComicButton
                  size="sm"
                  variant="coral"
                  data-testid="open-arcade-derby-btn"
                  icon={<Flame className="w-3.5 h-3.5" />}
                  onClick={() => {
                    setDerbyOpen(true);
                    soundEngine.play('organ_charge');
                  }}
                >
                  30s HR Derby
                </ComicButton>
                {onOpenUniforms ? (
                  <ComicButton
                    size="sm"
                    variant="sky"
                    data-testid="open-uniform-studio-btn"
                    icon={<Palette className="w-3.5 h-3.5" />}
                    onClick={() => {
                      soundEngine.play('ui_pop');
                      onOpenUniforms();
                    }}
                  >
                    Uniform Studio
                  </ComicButton>
                ) : null}
                <ComicButton
                  size="sm"
                  variant="gold"
                  data-testid="open-trophy-case-btn"
                  icon={<Trophy className="w-3.5 h-3.5" />}
                  onClick={() => {
                    setTrophyOpen(true);
                    soundEngine.play('ui_pop');
                  }}
                >
                  Trophy &amp; Sticker Album
                </ComicButton>
              </div>

              {/* Compact Collapsible Game Length & Play Style Strip */}
              <div className="p-2 rounded-xl border-2 border-[#181B2C]/25 bg-[#FBF4E4] space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-extrabold text-[#181B2C] flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-[#1B4332]" />
                    <span>
                      {gameLength} Innings • {controlMode === 'simple' ? 'Arcade Mode' : 'Pro Manager'}
                      {arcadeTimingEnabled ? ' • 🎯 Timing ON' : ''}
                    </span>
                  </span>
                  <button
                    type="button"
                    data-testid="game-settings-toggle"
                    aria-expanded={gameSettingsOpen}
                    onClick={() => {
                      setGameSettingsOpen((v) => !v);
                      soundEngine.play('ui_pop');
                    }}
                    className="px-2.5 py-1 min-h-[44px] rounded-lg border-2 border-[#181B2C] bg-[#FFFDF7] hover:bg-[#FFF3BF] text-[11px] font-extrabold text-[#181B2C] cursor-pointer"
                  >
                    {gameSettingsOpen ? 'Done ▴' : 'Length & Style ▾'}
                  </button>
                </div>

                {gameSettingsOpen ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-dashed border-[#181B2C]/20">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-extrabold uppercase text-[#181B2C]">
                        Length:
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

                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-extrabold uppercase text-[#181B2C]">
                        Style:
                      </span>
                      <ComicButton
                        size="sm"
                        variant={controlMode === 'simple' ? 'turf' : 'cream'}
                        active={controlMode === 'simple'}
                        onClick={() => setControlMode('simple')}
                      >
                        🎮 Arcade Mode (Simple)
                      </ComicButton>
                      <ComicButton
                        size="sm"
                        variant={controlMode === 'advanced' ? 'violet' : 'cream'}
                        active={controlMode === 'advanced'}
                        onClick={() => setControlMode('advanced')}
                      >
                        🧠 Pro Manager (All Controls)
                      </ComicButton>
                      <ComicButton
                        size="sm"
                        variant={arcadeTimingEnabled ? 'gold' : 'cream'}
                        active={arcadeTimingEnabled}
                        onClick={() => {
                          toggleArcadeTiming();
                          soundEngine.play('ui_pop');
                        }}
                      >
                        {arcadeTimingEnabled ? '🎯 Timing Bar ON' : '🎯 Timing Bar OFF'}
                      </ComicButton>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Predetermined 7-Series Home & Away Season Schedule Strip (Horizontal Scroll on Phones!) */}
              <div className="space-y-1.5 pt-2 border-t-2 border-dashed border-[#181B2C]/20">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-extrabold uppercase text-[#181B2C]">
                  <span>📅 Season Schedule (7 Predetermined 3-Game Series • Home &amp; Away)</span>
                  <span className="text-[#4A5068]">
                    {seasonSchedule.entries.filter((e) => e.isHome).length} Home •{' '}
                    {seasonSchedule.entries.filter((e) => !e.isHome).length} Road
                  </span>
                </div>
                <div
                  data-testid="season-schedule-strip"
                  className="flex overflow-x-auto pb-1 sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-2"
                >
                  {seasonSchedule.entries.map((entry) => {
                    const rec = seriesResults[entry.seriesIndex];
                    const badgeLabel = (() => {
                      if (entry.status === 'current') {
                        return rec && rec.wins + rec.losses > 0
                          ? `${rec.wins}-${rec.losses} LIVE`
                          : 'NEXT';
                      }
                      if (entry.status === 'completed') {
                        if (!rec) return '✓ DONE';
                        if (rec.wins >= 3 && rec.losses === 0) return '🧹 3-0 SWEEP';
                        return `${rec.wins > rec.losses ? 'W' : 'L'} ${rec.wins}-${rec.losses}`;
                      }
                      return '3G';
                    })();
                    return (
                    <div
                      key={entry.seriesIndex}
                      data-testid="schedule-series-pill"
                      className={`min-w-[165px] shrink-0 sm:min-w-0 p-2 rounded-xl border-2 border-[#181B2C] text-left transition ${
                        entry.status === 'current'
                          ? 'bg-[#FFF3BF] shadow-[3px_3px_0_#181B2C]'
                          : entry.status === 'completed'
                            ? 'bg-[#E9F5EC] opacity-85'
                            : 'bg-[#FFFDF7]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 text-[10px] font-extrabold">
                        <span className="text-[#1D3557]">
                          S{entry.seriesNumber} • {entry.isHome ? '🏠 HOME' : '✈️ AWAY'}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded border border-[#181B2C] ${
                            entry.status === 'current'
                              ? 'bg-[#FFC300] text-[#181B2C]'
                              : entry.status === 'completed'
                                ? rec && rec.losses > rec.wins
                                  ? 'bg-[#E63946] text-white'
                                  : 'bg-[#2FB356] text-white'
                                : 'bg-[#F1E4C8] text-[#4A5068]'
                          }`}
                        >
                          {badgeLabel}
                        </span>
                      </div>
                      <div className="font-display text-xs text-[#181B2C] mt-1 flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-[#181B2C] shrink-0"
                          style={{ backgroundColor: entry.opponent.colors.primary }}
                        />
                        <span className="truncate">
                          {entry.isHome ? 'vs' : '@'} {entry.opponent.city} {entry.opponent.name}
                        </span>
                      </div>
                      <div className="text-[10px] font-bold text-[#4A5068] truncate mt-0.5">
                        {entry.opponent.wins}-{entry.opponent.losses} •{' '}
                        {getBallparkPreset(entry.hostBallparkId).name}
                      </div>
                    </div>
                  );
                  })}
                </div>
              </div>
            </div>
          </ComicCard>
        </div>

        {/* Friendly 3-Step Sandlot Welcome Checklist (Disappears Forever Once Claimed!) */}
        {welcomeChecklist.showStrip ? (
          <div
            data-testid="welcome-checklist-strip"
            className="p-3 rounded-2xl border-2 border-[#181B2C] bg-[#D8F3DC] flex flex-wrap items-center justify-between gap-2 shadow-[3px_3px_0_#181B2C]"
          >
            <div className="space-y-1">
              <div className="font-display text-xs text-[#1B4332]">
                🌟 SANDLOT STARTER GOALS ({welcomeChecklist.completedCount}/3) — Complete for +$1,000 &amp; Bonus Foil Pack!
              </div>
              <div className="flex flex-wrap gap-1.5 text-[11px] font-extrabold">
                {welcomeChecklist.steps.map((st) => (
                  <span
                    key={st.id}
                    className={`px-2 py-0.5 rounded-lg border border-[#181B2C] ${
                      st.done ? 'bg-[#2FB356] text-white' : 'bg-[#FFFDF7] text-[#181B2C]'
                    }`}
                  >
                    {st.done ? '✓ ' : ''}
                    {st.label}
                  </span>
                ))}
              </div>
            </div>
            {welcomeChecklist.canClaimReward &&
            betweenGameSpotlight?.primary?.id !== 'starter_reward' ? (
              <ComicButton
                size="sm"
                variant="gold"
                icon={<Gift className="w-3.5 h-3.5" />}
                onClick={() => {
                  const res = claimWelcomeChecklistReward();
                  if (res.claimed) {
                    awardFoilPack('sandlot_foil', 'Sandlot Starter Goals Complete!');
                    soundEngine.play('trophy_fanfare');
                    setGmQuickFeedback(`🎉 Starter Goals complete! +$${res.cashBonus.toLocaleString()} Cash + 🎁 Foil Pack!`);
                  }
                }}
              >
                🎁 Claim Starter Reward!
              </ComicButton>
            ) : welcomeChecklist.canClaimReward ? (
              <span className="px-2 py-1 rounded-lg border border-[#181B2C]/30 bg-[#FFF3BF] text-[10px] font-extrabold text-[#181B2C]">
                ✨ Ready to claim above ↑
              </span>
            ) : !welcomeChecklist.steps[2].done && onJumpToTab ? (
              <ComicButton
                size="sm"
                variant="violet"
                onClick={() => {
                  soundEngine.play('ui_pop');
                  onJumpToTab('skills');
                }}
              >
                ⚡ Spend Day-1 SP
              </ComicButton>
            ) : null}
          </div>
        ) : null}

        {/* Gentle Story & Origins Comic Adventure Nudge (avoid duplicating when Spotlight already leads with it) */}
        {nextStoryBeat && onOpenStory && betweenGameSpotlight?.primary?.id !== 'story_chapter' ? (
          <div
            data-testid="story-chapter-nudge"
            className="p-3 rounded-2xl border-2 border-[#181B2C] bg-[#F5EEFF] flex flex-wrap items-center justify-between gap-2 shadow-[3px_3px_0_#181B2C]"
          >
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-extrabold uppercase text-[#7209B7]">
                📖 COMIC STORY BEAT READY — ACT {nextStoryBeat.act} OF 3
              </div>
              <div className="font-display text-xs sm:text-sm text-[#181B2C] truncate">
                {nextStoryBeat.title} — Make a fun dugout choice to shape your team’s legend!
              </div>
            </div>
            <ComicButton
              size="sm"
              variant="violet"
              data-testid="story-chapter-nudge-btn"
              onClick={() => {
                soundEngine.play('ui_pop');
                onOpenStory();
              }}
            >
              📖 Read Story Chapter
            </ComicButton>
          </div>
        ) : null}

        <ManagerClipboardBanner
          clubName={`${humanClub.city} ${humanClub.name}`}
          recordLabel={`${humanClub.wins}-${humanClub.losses}`}
          cash={humanClub.economy.cash}
          seriesIndex={currentSeriesIndex}
          inbox={inbox}
          promotionChase={promotionChase}
          activeGameplan={activeGameplan}
          tiredStarter={tiredStarter}
          gmInboxEvent={activeGmInboxEvent}
          rosterSpotlight={rosterSpotlight}
          spotlightUsedThisSeries={spotlightUsedThisSeries}
          practiceAvailable={practiceAvailable}
          lastPracticeFocusLabel={lastPracticeFocusLabel}
          recommendedPractice={recommendedPractice}
          quickFeedback={gmQuickFeedback}
          onSimNextSeries={handleFastSimSeries}
          onSelectPractice={handleQuickPractice}
          onSelectGameplan={(plan) => {
            setSeriesGameplan(plan);
            soundEngine.play('ui_pop');
            setGmQuickFeedback(`✓ Series Gameplan active: ${plan.replace(/_/g, ' ')}!`);
          }}
          onSwapFreshStarter={(freshId) => {
            if (swapTiredStarterToFresh(freshId)) {
              soundEngine.play('bullpen_phone');
              setGmQuickFeedback('Rotation updated — fresh arm scheduled to start next!');
            }
          }}
          onResolveGmInboxChoice={(choiceIdx) => {
            const res = resolveActiveGmInboxDecision(choiceIdx);
            if (res) {
              soundEngine.play('cash_chime');
              setGmQuickFeedback(res.summary);
            }
          }}
          onSpotlightBreakout={(playerId) => {
            const res = spotlightBreakoutPlayer(playerId);
            if (res.applied) {
              soundEngine.play('level_up');
              setGmQuickFeedback(res.summary);
            }
          }}
          onActionClick={handleManagerJump}
        />
          </div>
        ) : null}

        <FoilPackModal
          open={foilModalOpen}
          onClose={() => setFoilModalOpen(false)}
          backLabel={
            humanClub.wins + humanClub.losses === 0
              ? '⚾ Back to Opening Day'
              : '⚾ Back to Game Day'
          }
          onBackToGame={() => setFoilModalOpen(false)}
          onViewRelics={
            onOpenRelics
              ? () => {
                  setFoilModalOpen(false);
                  onOpenRelics();
                }
              : onJumpToTab
                ? () => {
                    setFoilModalOpen(false);
                    onJumpToTab('economy');
                  }
                : undefined
          }
        />

        <ArcadeDerbyModal
          open={derbyOpen}
          club={humanClub}
          worldSeed={worldSeed}
          onHomeRun={(sluggerName) => {
            const unlock = detectDerbyCelebrationSticker({
              homeRuns: 1,
              sluggerName,
              earnedStickerIds: humanClub.earnedStickerIds ?? [],
              mascotName: humanClub.mascot,
            });
            if (unlock && unlockCelebrationSticker(unlock.sticker.id)) {
              setStickerToast(unlock);
            }
          }}
          onClose={() => setDerbyOpen(false)}
        />

        <CelebrationStickerToast
          unlock={stickerToast}
          club={humanClub}
          onOpenAlbum={() => {
            setStickerToast(null);
            setDerbyOpen(false);
            setTrophyOpen(true);
          }}
          onDismiss={() => setStickerToast(null)}
        />

        <TrophyCaseModal
          open={trophyOpen}
          onClose={() => setTrophyOpen(false)}
          onInspectPlayerId={(id) => {
            setTrophyOpen(false);
            setPreGameScoutPlayerId(id);
          }}
        />

        <PlayerCardModal
          open={preGameScoutPlayerId !== null}
          entry={activePreGameScoutEntry}
          allEntries={preGameScoutEntries}
          isFavorite={
            activePreGameScoutEntry
              ? favoritePlayerIds.includes(activePreGameScoutEntry.player.id)
              : false
          }
          onToggleFavorite={
            activePreGameScoutEntry && activePreGameScoutEntry.club.id === humanClub.id
              ? () => toggleFavoritePlayer(activePreGameScoutEntry.player.id)
              : undefined
          }
          onCustomizePlayer={
            activePreGameScoutEntry && activePreGameScoutEntry.club.id === humanClub.id
              ? (patch) => customizePlayerProfile(activePreGameScoutEntry.player.id, patch)
              : undefined
          }
          onSelectPlayerId={(id) => setPreGameScoutPlayerId(id)}
          onClose={() => setPreGameScoutPlayerId(null)}
        />

        <PostGameSummaryModal
          summary={modalSummary}
          humanClub={humanClub}
          opponentClub={modalOpponentClub}
          managerLevel={manager?.level ?? 1}
          unopenedPackCount={unopenedPacks.length}
          playAgainLabel={computePostGameNextAction(false).label}
          onPlayAgain={computePostGameNextAction(false).onClick}
          onOpenFoilPacks={() => {
            setModalSummary(null);
            setFoilModalOpen(true);
            soundEngine.play('ui_pop');
          }}
          onClose={() => {
            setModalSummary(null);
            safeScrollTop();
          }}
          onSpendSkillPoints={
            onJumpToTab
              ? () => {
                  setModalSummary(null);
                  onJumpToTab('skills');
                }
              : undefined
          }
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
  const pitcherFatigueParts: string[] = [];
  if (enduranceFx.mphDrop < 0) pitcherFatigueParts.push(`${enduranceFx.mphDrop} mph`);
  if (enduranceFx.controlDrop < 0) pitcherFatigueParts.push(`${enduranceFx.controlDrop} CTL`);
  if (enduranceFx.breakDrop < 0) pitcherFatigueParts.push(`${enduranceFx.breakDrop} BRK`);
  const pitcherFatigueDropTag =
    pitcherFatigueParts.length > 0 ? pitcherFatigueParts.join(' · ') : null;
  const livePitcherSignOptions = (currentPitcher.pitchArsenal?.repertoire ?? []).map((slot) => ({
    pitchType: slot.pitchType,
    label: PITCH_TYPE_SHORT_LABELS[slot.pitchType],
    mastery: slot.mastery,
    isFavorite: slot.pitchType === currentPitcher.pitchArsenal?.favoritePitch,
    isWeak: slot.pitchType === currentPitcher.pitchArsenal?.weakestPitch,
  }));
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
  const humanSideKey: 'away' | 'home' = liveSession.home.isHuman ? 'home' : 'away';
  const humanIsBatting = (liveSession.half === 'BOT') === (humanSideKey === 'home');
  const humanHypeNow = liveSession[humanSideKey].hypeGauge;
  const humanActorNow = humanIsBatting ? currentBatter : currentPitcher;
  const humanAvailNow = humanIsBatting ? batterSpecial : pitcherSpecial;
  const humanPowersNow = getActivatablePowersForPlayer(humanActorNow, humanIsBatting ? 'batter' : 'pitcher');
  const readyPowerOption = humanAvailNow.allowed ? (humanPowersNow[0] ?? null) : null;
  const firstPitchTip = buildFirstPitchCoachTip({
    isOpeningDay: humanClub.wins + humanClub.losses === 0,
    isBatting: humanIsBatting,
    hasThrownPitch: recentEvents.length > 0,
  });
  const liveBattingSide = getBattingSide(liveSession);
  const liveFieldingSide = getFieldingSide(liveSession);
  const thirdBaseRunnerNow = liveSession.bases[2]
    ? (liveBattingSide.playersById[liveSession.bases[2]] ?? null)
    : null;
  const leadRunnerIdNow = liveSession.bases[2] ?? liveSession.bases[1] ?? liveSession.bases[0];
  const leadRunnerNow = leadRunnerIdNow
    ? (liveBattingSide.playersById[leadRunnerIdNow] ?? null)
    : null;
  const buntPreviewLine = humanIsBatting
    ? formatBuntPreviewSummary(
        evaluateBuntOdds({
          batter: currentBatter,
          pitcher: currentPitcher,
          catcher: getDefenderAtPosition(liveFieldingSide, 'C'),
          leadRunner: leadRunnerNow,
          thirdBaseRunner: thirdBaseRunnerNow,
          pitchType: currentPitcher.pitchArsenal?.favoritePitch ?? 'four_seam',
          pitchQuality: Math.round(
            (currentPitcher.ratings.velocity + currentPitcher.ratings.movement) * 0.5 +
              enduranceFx.mphDrop +
              enduranceFx.breakDrop,
          ),
          pitchTarget: 'attack_zone',
          defenseShift: chooseAiDefensiveShift(liveSession),
          charger: getDefenderAtPosition(liveFieldingSide, '3B') ?? currentPitcher,
          firstBaseBonus: platoon.firstBaseStepBonus,
          extraBuntBonus: 0,
          outs: liveSession.outs,
          hasRunners: liveSession.bases.some(Boolean),
        }),
      )
    : null;
  const quickStealCandidates = humanIsBatting
    ? getEligibleStealPlays(
        liveSession.bases,
        liveBattingSide.playersById,
        currentPitcher,
        getDefenderAtPosition(liveFieldingSide, 'C'),
        liveFieldingSide.pitcherFatigue,
        liveFieldingSide.catcherPopTimeBonus,
      )
    : [];
  const bestCandidate = quickStealCandidates.reduce<(typeof quickStealCandidates)[number] | undefined>(
    (best, play) => !best || play.successPct > best.successPct ? play : best, undefined);
  const bestQuickSteal = bestCandidate
    ? {
        label: bestCandidate.label,
        runnerName: bestCandidate.runnerName,
        successPct: bestCandidate.successPct,
        call: (
          bestCandidate.playType === 'steal_2b'
            ? 'steal'
            : bestCandidate.playType
        ) as TacticalCall,
      }
    : null;
  const liveAwayClub = humanSideKey === 'home' ? activeOpponent : humanClub;
  const liveHomeClub = humanSideKey === 'home' ? humanClub : activeOpponent;
  const rankedBullpenCandidates = rankBullpenCandidates(liveSession, humanSideKey);
  const liveCue = computeLiveActionCue({
    session: liveSession,
    tacticalCall,
    armedPowerId,
    moundVisitUsed,
    bullpenMode,
  });
  const pendingDecision = Boolean(lastChoreo && revealedPlay !== lastChoreo);
  const playing = Boolean(lastChoreo && finishedPlay !== lastChoreo);
  const pitchingChange = playbackEvent?.type === 'pitching_change';
  const nextDefensivePitcher = pitchingChange && playbackEvent.pitcherId && playbackEvent.pitcherId !== currentPitcher.id
    ? liveSession[humanSideKey].playersById[playbackEvent.pitcherId] : undefined;
  const bullpenMessage = nextDefensivePitcher
    ? `${nextDefensivePitcher.name} will pitch when your club takes the field.`
    : playing ? `Pitching change · ${currentPitcher.name} takes the mound.` : `${currentPitcher.name} is ready to pitch.`;
  const shown = !pitchingChange && prePlaySession && (pendingDecision || (handoff && changedSides)) ? prePlaySession : liveSession;
  const resultShown = handoff && !pendingDecision ? playbackEvent : null;
  const shownBases = resultShown?.basesAfter ?? shown.bases;
  const guidedBatting = (shown.half === 'BOT') === shown.home.isHuman;
  const atBatSide = playbackEvent?.half === 'TOP' ? liveSession.away : liveSession.home;
  const onMoundSide = playbackEvent?.half === 'TOP' ? liveSession.home : liveSession.away;
  const picturedBatter = ((playing || handoff) && playbackEvent?.batterId && atBatSide.playersById[playbackEvent.batterId]) || currentBatter;
  const picturedPitcher = ((playing || handoff) && playbackEvent?.pitcherId && onMoundSide.playersById[playbackEvent.pitcherId]) || currentPitcher;
  const showNextMatchup = !handoff && (!playing || nextDefensivePitcher) && liveSession.status === 'in_progress' && playbackEvent && (
    pitchingChange || (playbackEvent.batterId && playbackEvent.batterId !== currentBatter.id) ||
    (playbackEvent.pitcherId && playbackEvent.pitcherId !== currentPitcher.id)
  );
  const buntAdvance = lastChoreo?.play?.buntAdvances;
  const buntCall = buntAdvance && `Out at first · ${describeBuntAdvance(buntAdvance)}`;
  const readout = pendingDecision || showNextMatchup ? null : playReadout(playbackEvent);
  const liveCallout = pendingDecision || showNextMatchup ? null : buildComicPopArtBanner(playbackEvent, liveSession);
  const scoredOnPlay = playbackEvent && prePlaySession && (prePlaySession.home.isHuman
    ? playbackEvent.homeScore > prePlaySession.home.score
    : playbackEvent.awayScore > prePlaySession.away.score);
  const celebrateScore = Boolean(liveCallout?.confetti && scoredOnPlay);
  const replayable = Boolean(!pitchingChange && lastChoreo?.play && !playing && watchMode === 'paused' &&
    playbackEvent && (stole || (!['called_pitch','missed_pitch','ball_pitch','foul_back'].includes(lastChoreo.play.kind))));
  const liveNemesis = evaluateNemesisMatchup(
    nemesisHistory,
    currentBatter.id,
    currentPitcher.id,
    currentBatter.name,
    currentPitcher.name,
  );

  const handleSuggestedAction = (action: SuggestedQuickAction) => {
    if (action.type === 'arm_power' && action.powerId) {
      setArmedPowerId(action.powerId);
      soundEngine.play('clutch_stinger');
      return;
    }
    if (action.type === 'steal' && action.tacticalCall) {
      setTacticalCall(action.tacticalCall);
      soundEngine.play('steal_burst');
      return;
    }
    if (action.type === 'mound_visit' && !moundVisitUsed) {
      const res = applyMoundVisit(liveSession, humanSideKey, 'calm_breath');
      if (res.applied && res.event) {
        setMoundVisitUsed(true);
        applyStepResult(res.nextSession, [res.event], activeOpponent.id);
      }
      return;
    }
    if (action.type === 'bullpen_swap' && action.relieverId) {
      handleBullpenSwap(action.relieverId);
      return;
    }
    if (action.type === 'pinch_hit' && action.pinchHitterId) {
      const res = applyPinchHitter(liveSession, humanSideKey, action.pinchHitterId);
      if (res.applied && res.event) {
        soundEngine.play('organ_charge');
        applyStepResult(res.nextSession, [res.event], activeOpponent.id);
      }
    }
  };

  const formatTodayStatLine = (playerId: string, isAway: boolean): string | undefined => {
    const batLine = isAway
      ? liveSession.boxScore.awayBatters[playerId]
      : liveSession.boxScore.homeBatters[playerId];
    const pitLine = isAway
      ? liveSession.boxScore.awayPitchers[playerId]
      : liveSession.boxScore.homePitchers[playerId];
    if (pitLine && (pitLine.pitchesThrown > 0 || pitLine.outsRecorded > 0)) {
      const ip = `${Math.floor(pitLine.outsRecorded / 3)}.${pitLine.outsRecorded % 3}`;
      return `${ip} IP • ${pitLine.strikeouts} K • ${pitLine.earnedRuns} ER • ${pitLine.hitsAllowed} H • ${pitLine.pitchesThrown} P`;
    }
    if (batLine) {
      const parts = [`${batLine.hits}-for-${batLine.atBats}`];
      if (batLine.homeRuns > 0) parts.push(`${batLine.homeRuns} HR`);
      if (batLine.rbis > 0) parts.push(`${batLine.rbis} RBI`);
      if (batLine.walks > 0) parts.push(`${batLine.walks} BB`);
      if (batLine.stolenBases > 0) parts.push(`${batLine.stolenBases} SB`);
      return parts.join(' • ');
    }
    return undefined;
  };

  const gameCardEntries: InspectableCardEntry[] = [];
  const seenCardIds = new Set<string>();
  const addGameCardEntry = (
    playerId: string | null | undefined,
    isAway: boolean,
    roleTag?: string,
  ) => {
    if (!playerId || seenCardIds.has(playerId)) return;
    const side = isAway ? liveSession.away : liveSession.home;
    const club = isAway ? liveAwayClub : liveHomeClub;
    const player = side.playersById[playerId];
    if (!player) return;
    seenCardIds.add(playerId);
    gameCardEntries.push({
      player,
      club,
      roleTag,
      liveStatLine: formatTodayStatLine(playerId, isAway),
    });
  };

  const battingIsAway = liveSession.half === 'TOP';
  addGameCardEntry(currentBatter.id, battingIsAway, 'AT BAT');
  addGameCardEntry(currentPitcher.id, !battingIsAway, 'PITCHING');
  liveSession.bases.forEach((runnerId, idx) => {
    addGameCardEntry(runnerId, battingIsAway, `ON ${idx + 1}B`);
  });
  addGameCardEntry(liveSession.away.activePitcherId, true, `${liveAwayClub.colors.monogram} PITCHER`);
  liveSession.away.lineup.forEach((slot, idx) => {
    addGameCardEntry(slot.playerId, true, `${liveAwayClub.colors.monogram} #${idx + 1} ${slot.defensivePosition}`);
  });
  addGameCardEntry(liveSession.home.activePitcherId, false, `${liveHomeClub.colors.monogram} PITCHER`);
  liveSession.home.lineup.forEach((slot, idx) => {
    addGameCardEntry(slot.playerId, false, `${liveHomeClub.colors.monogram} #${idx + 1} ${slot.defensivePosition}`);
  });
  const activeInspectedEntry = inspectedGamePlayerId
    ? (gameCardEntries.find((e) => e.player.id === inspectedGamePlayerId) ?? gameCardEntries[0] ?? null)
    : null;
  const liveLowerThird = buildLiveBroadcastLowerThird(liveSession);
  const liveRunnerIds = liveSession.bases.filter((id): id is string => Boolean(id));
  const upcomingBatters = getUpcomingBatters(liveSession, humanSideKey, 3);
  const arcadeBullpenOptions = rankedBullpenCandidates.map((candidate) => ({
    id: candidate.player.id,
    name: candidate.player.name,
    throws: candidate.player.throws,
    roleLabel: candidate.roleLabel,
    ovr: candidate.ovr,
    isRecommended: candidate.isRecommended,
    fitTag: candidate.fitTag,
    platoonEdge: candidate.platoonEdge,
    freshnessPct: candidate.freshnessPct,
    pitchMixLabels: candidate.pitchMixLabels,
  }));
  const humanScoreNow = liveSession[humanSideKey].score;
  const oppScoreNow = (humanSideKey === 'home' ? liveSession.away : liveSession.home).score;
  const latestEv = recentEvents[0] ?? null;
  const liveMascotMood: 'happy' | 'cheering' | 'rally' | 'determined' =
    latestEv?.outcome === 'home_run' ||
    (humanIsBatting && (latestEv?.outcome === 'double' || latestEv?.outcome === 'triple' || latestEv?.outcome === 'single')) ||
    (!humanIsBatting && latestEv?.outcome === 'strikeout')
      ? 'cheering'
      : currentLeverage.leverageIndex >= 1.4 || liveSession.bases.some(Boolean)
        ? 'rally'
        : humanScoreNow < oppScoreNow
          ? 'determined'
          : 'happy';
  const cheerEvent = !playing && playbackEvent ? playbackEvent : null;
  const cheerMatchesHuman = (() => {
    if (!cheerEvent) return false;
    const eventBattingHuman = (cheerEvent.half === 'BOT') === liveSession.home.isHuman;
    if (cheerEvent.specialPowerTriggered) {
      return humanClub.roster.some(
        (p) => p.id === cheerEvent.batterId || p.id === cheerEvent.pitcherId,
      );
    }
    if (
      cheerEvent.type === 'stolen_base_attempt' ||
      cheerEvent.outcome === 'home_run' ||
      cheerEvent.outcome === 'triple' ||
      cheerEvent.outcome === 'double' ||
      cheerEvent.outcome === 'single' ||
      cheerEvent.outcome === 'walk' ||
      cheerEvent.outcome === 'bunt_single' ||
      cheerEvent.outcome === 'bunt_out' ||
      cheerEvent.outcome === 'sac_fly'
    ) {
      return eventBattingHuman;
    }
    return !eventBattingHuman;
  })();
  const liveDugoutCheer = cheerMatchesHuman
    ? buildTeammateDugoutCheer(
        cheerEvent,
        humanClub.roster,
        favoritePlayerIds,
        worldSeed + seasonNumber * 97,
      )
    : null;
  const rawBullpenRec =
    !humanIsBatting && bullpenMode === 'semi_auto' && !playing && !handoff
      ? evaluateBullpenCall(liveSession, humanSideKey)
      : null;
  const activeBullpenSuggestion =
    rawBullpenRec && rawBullpenRec.snoozeKey !== dismissedBullpenKey ? rawBullpenRec : null;
  const handleSelectBullpenMode = (mode: BullpenMode) => {
    setBullpenMode(mode);
    if (mode !== 'semi_auto') setDismissedBullpenKey(null);
    soundEngine.play('ui_pop');
  };
  const handleDismissBullpenSuggestion = (snoozeKey: string) => {
    setDismissedBullpenKey(snoozeKey);
    soundEngine.play('ui_pop');
  };
  const catcherCallSeq = !humanIsBatting ? buildCatcherCallSequence(liveSession) : [];
  const activeCatcherCall =
    catcherCallSeq.length > 0 ? catcherCallSeq[shakeOffCount % catcherCallSeq.length] : null;
  const guidedCatcherSeq = !guidedBatting ? buildCatcherCallSequence(shown) : [];
  const guidedCatcherCall =
    guidedCatcherSeq.length > 0 ? guidedCatcherSeq[shakeOffCount % guidedCatcherSeq.length] : null;
  const repeatPitchWarning = Boolean(
    !humanIsBatting &&
      pitchingMode === 'advanced' &&
      selectedPitchType &&
      liveSession.atBatPitchHistory.length >= 2 &&
      liveSession.atBatPitchHistory.slice(-2).every((p) => p === selectedPitchType),
  );
  const handleSelectPitchingMode = (mode: PitchingMode) => {
    setPitchingMode(mode);
    setShakeOffCount(0);
    if (mode !== 'advanced') setSelectedPitchType(null);
    soundEngine.play('ui_pop');
  };
  const handleShakeOffCatcher = () => {
    setEntranceCue(null);
    setLastChoreo(null);
    setPlaybackEvent(null);
    setShakeOffCount((c) => c + 1);
    soundEngine.play('ui_pop');
  };
  const sign = !humanIsBatting && pitchingMode !== 'simple' ? catcherSign(liveSession) : null;
  const acceptSign = sign && <button className="catcher-sign" onClick={()=>{
    if (pitchingMode === 'advanced') setSelectedPitchType(sign.pitch);
    setPitchTarget(sign.target);
    setLastChoreo(null);
    setPlaybackEvent(null);
    setEntranceCue(null);
  }}>Catcher’s sign · {sign.text}</button>;
  const firstLook = liveSession.status === 'in_progress' && liveSession.balls + liveSession.strikes === 0 &&
    !gameLog.current.some(e=>e.batterId === currentBatter.id && e.pitchThrown);
  const formerPitcher = currentPitcher.formerClubIds.includes(getBattingSide(liveSession).clubId);
  const caption = firstLook && formerPitcher ? gazetteCaption(currentPitcher, getBattingSide(liveSession)) : firstLook && (currentBatter.formerClubIds.includes(getFieldingSide(liveSession).clubId) || getBattingSide(liveSession).lineupIndex === 0)
    ? gazetteCaption(currentBatter, getFieldingSide(liveSession)) : null;
  const advancedFrom = handoff && !playing ? lastChoreo?.play?.buntAdvances?.at(-1) : undefined;
  const offerOpeningPack = eventInGuide && !playing && (changedSides || liveSession.status === 'completed') &&
    unopenedPacks.some(pack => pack.id === 'pack-opening-day');
  const openBetweenInningsPack = () => {
    setWatchMode('paused');
    setFoilModalOpen(true);
  };
  const openGamePlayerCard = (playerId: string) => {
    if (watchMode === 'live' || watchMode === 'smart') setWatchMode('paused');
    setInspectedGamePlayerId(playerId);
    soundEngine.play('card_flip');
  };

  const scoreboard = (
        <ScoreboardStrip
          clubs={{ away: liveAwayClub.name, home: liveHomeClub.name, humanHome: shown.home.isHuman }}
          desktopFull={!(guiding && !showMore)}
          flash={readout ? { ...readout, seq: playbackEvent!.seq } : null}
          awayAbbr={liveAwayClub.colors.monogram}
          awayScore={resultShown?.awayScore ?? shown.away.score}
          awayHits={shown.away.hits}
          awayErrors={shown.away.errors}
          awayColor={liveAwayClub.colors.primary}
          homeAbbr={liveHomeClub.colors.monogram}
          homeScore={resultShown?.homeScore ?? shown.home.score}
          homeHits={shown.home.hits}
          homeErrors={shown.home.errors}
          homeColor={liveHomeClub.colors.primary}
          inning={shown.inning}
          half={shown.half}
          balls={shown.balls}
          strikes={shown.strikes}
          outs={resultShown?.outsAfter ?? shown.outs}
          bases={[
            Boolean(shownBases[0]),
            Boolean(shownBases[1]),
            Boolean(shownBases[2]),
          ]}
        />
  );
  const changeCamera = (mode: LiveCameraMode) => {
    setCameraMode(mode);
    soundEngine.play('ui_pop');
  };
  const replayFromPitch = () => {
    if (!lastChoreo) return;
    const { play, startAt, durationMs } = lastChoreo;
    setLastChoreo({...lastChoreo, startAt:undefined, durationMs:startAt && play ? Math.round(durationMs * play.duration / (play.duration-startAt)) : durationMs});
  };
  if (thirdDecision) {
    const {event,film,options,hold,call} = thirdDecision;
    const choice = event.thirdBase!;
    const runner = getBattingSide(liveSession).playersById[choice.runnerId];
    const resolve = (send:boolean) => {
      const result = send ? stepPitch(liveSession,call,{...options,thirdBaseCall:'send'}) : hold;
      if (guiding && !showMore) result.events.forEach(e=>guidedPitchEvents.current.add(e.seq));
      setThirdDecision(null);
      setArmedPowerId(null);
      applyStepResult(result.nextSession,result.events,activeOpponentId,options?.pitchTarget,film.freezeAt);
    };
    return <ThirdBaseDecision key={event.seq} portrait={<PlayerPrint player={runner}/>} runner={runner.name} arm={choice.arm} position={choice.position}
      arrivalMs={film.durationMs * film.freezeAt! / film.play!.duration} onResolve={resolve}>
      {scoreboard}
      <LiveGameCanvas guided awayClub={liveAwayClub} homeClub={liveHomeClub} session={liveSession}
        weather={gameWeather}
        choreo={film} lastEvent={event} cameraMode={cameraMode} onChangeCameraMode={changeCamera} />
    </ThirdBaseDecision>;
  }
  const showFullHud = !guiding || showMore;
  const closeTactics = () => {
    setSheetOpen(false);
    if (!wideStudio) setShowMore(false);
  };
  liveKeysRef.current = (event: KeyboardEvent) => {
    if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target as HTMLElement | null;
    const tag = target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return;
    if (modalSummary || boxScoreOpen || inspectedGamePlayerId || foilModalOpen) return;
    if (event.key === 'Escape') {
      if (sheetOpen) closeTactics();
      return;
    }
    if (event.key === 't' || event.key === 'T') {
      event.preventDefault();
      setSheetOpen((open) => {
        const next = !open;
        if (next) setShowMore(true);
        return next;
      });
      return;
    }
    if (playing || handoff || pendingDecision || thirdDecision) return;
    if (event.key === ' ') {
      if (tag === 'BUTTON' || tag === 'A' || tag === 'SUMMARY') return;
      event.preventDefault();
      handleNextPitch(tacticalCall);
      return;
    }
    const key = event.key.toLowerCase();
    if (key === '1' || key === '2' || key === '3') {
      event.preventDefault();
      const index = Number(key) - 1;
      if (humanIsBatting) {
        const approach = (['contact', 'normal', 'power'] as const)[index];
        setTacticalCall(approach);
      } else {
        const spot = (['attack_zone', 'paint_corners', 'bury_offspeed'] as const)[index];
        setPitchTarget(spot);
      }
      return;
    }
    if (key === 'b' && humanIsBatting) {
      event.preventDefault();
      setTacticalCall((call) => (call === 'bunt' ? 'normal' : 'bunt'));
      return;
    }
    if (key === 's' && bestQuickSteal) {
      event.preventDefault();
      setTacticalCall(bestQuickSteal.call);
      return;
    }
    if (key === 'h' && readyPowerOption) {
      event.preventDefault();
      setArmedPowerId((prev) => (prev === readyPowerOption.id ? null : readyPowerOption.id));
      soundEngine.play('clutch_stinger');
    }
  };
  return (
    <div className={`live-game studio-layout${guiding && !showMore ? ' guided-game' : ''}${sheetOpen ? ' tactics-open' : ''}`}>
      <div className="live-studio">
        <div className="live-stage">
            <LiveGameCanvas
              playFinished={Boolean(lastChoreo && !playing)}
              guided={Boolean(guiding && !showMore)}
              onEntranceEnd={finishEntrance}
              entranceCue={guiding && !showMore ? entranceCue : null}
              preview={guiding && !showMore && !lastChoreo ? (humanIsBatting ? (tacticalCall === 'power' || tacticalCall === 'bunt' ? tacticalCall : 'contact') : pitchingMode === 'simple' ? (guidedCatcherCall?.target ?? 'attack_zone') : pitchTarget) : null}
              awayClub={liveAwayClub}
              homeClub={liveHomeClub}
              weather={gameWeather}
              session={!pitchingChange && prePlaySession && lastChoreo && !showNextMatchup ? prePlaySession : liveSession}
              choreo={showNextMatchup ? null : lastChoreo}
              lastEvent={showNextMatchup ? null : playbackEvent}
              cameraMode={cameraMode}
              onChangeCameraMode={changeCamera}
              entrance={<>
                {leagueBoard && !pendingDecision ? <div className="field-wire"><LeagueWire game={leagueBoard} club={humanClub} venueTier={liveHomeClub.leagueTier}/></div>
                  : caption && !playing && !entranceCue ? <div className="field-wire"><GazetteCall key={caption} caption={caption} onCrowd={playGazetteCrowd}/></div> : null}
                {liveDugoutCheer && !entranceCue && !handoff ? (
                  <div className="pointer-events-none absolute bottom-2 left-2 right-14 z-20 flex justify-start">
                    <DugoutCheerBubble
                      cheer={liveDugoutCheer}
                      primaryColor={humanClub.colors.primary}
                      accentColor={humanClub.colors.accent}
                      className="pointer-events-auto"
                    />
                  </div>
                ) : null}
                {guiding ? entranceCue && !showMore &&
                <BatterEntrance guided key={entranceCue.role === 'pitcher' ? picturedPitcher.id : picturedBatter.id}
                  player={entranceCue.role === 'pitcher' ? picturedPitcher : picturedBatter} pitching={entranceCue.role === 'pitcher'} />
                : <BatterEntrance key={picturedBatter.id} player={picturedBatter} />}</>}
              celebrateConfetti={celebrateScore && !(handoff && !playing)}
              overlay={
                guiding && !showMore && advancedFrom && prePlaySession ? (
                  <RunnerCue session={prePlaySession} advancedFrom={advancedFrom} />
                ) : guiding && !showMore && guidedBatting && !playing && !lastChoreo && shown.bases.some(Boolean) ? (
                  <RunnerCue session={shown} />
                ) : pitchingChange && liveSession.status === 'in_progress' ? (
                  <div className="flex max-w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border-2 border-[#172C29] bg-[#FFF7E4] px-3 py-1.5 text-sm font-bold text-[#172C29] shadow-sm">
                    <span role="status">{bullpenMessage}</span>
                    {(!playing || nextDefensivePitcher) && watchMode === 'paused' && (
                      <button type="button" className="pointer-events-auto min-h-11 rounded-lg bg-[#FFCC49] px-3 font-display cursor-pointer"
                        onClick={() => handleNextPitch(tacticalCall)}>
                        {humanIsBatting ? 'Face next pitch' : 'Throw next pitch'}
                      </button>
                    )}
                  </div>
                ) : lastChoreo?.play?.holdForceCall ? (
                  <div className="flex items-center gap-2">
                  <ClubMascotBuddy mascot={humanClub.mascot} primaryColor={humanClub.colors.primary}
                    secondaryColor={humanClub.colors.secondary} accentColor={humanClub.colors.accent} size="sm"
                    mood={pendingDecision ? 'watching' : 'peeking'} />
                  {!pendingDecision && playing && <span className="plate-verdict" role="status">{buntCall ?? 'Out at first'}</span>}
                  </div>
                ) : handoff && !playing ? null : liveCallout ? (
                  <div
                    role="status"
                    data-testid="comic-callout-banner"
                    className="px-3 py-1.5 rounded-xl border-[3px] border-[#181B2C] shadow-[4px_4px_0_#181B2C] flex items-center justify-center gap-2 max-w-[95%] text-center"
                    style={{ backgroundColor: liveCallout.bg, color: liveCallout.text }}
                  >
                    {celebrateScore ? (
                      <ClubMascotBuddy
                        mascot={humanClub.mascot}
                        primaryColor={humanClub.colors.primary}
                        secondaryColor={humanClub.colors.secondary}
                        accentColor={humanClub.colors.accent}
                        mood="cheering"
                        size="sm"
                        testId="live-celebration-mascot"
                      />
                    ) : null}
                    <div className="flex flex-col items-center justify-center gap-0.5">
                      <span className="font-display text-xs sm:text-sm tracking-wide">
                        {liveCallout.title}
                      </span>
                      <span className="hidden sm:inline text-[10px] font-extrabold opacity-95">
                        {liveCallout.coachQuip}
                      </span>
                    </div>
                  </div>
                ) : readout ? <div key={playbackEvent?.seq} className="flex items-center gap-1" role="status">
                  {playbackEvent?.outcome === 'foul' && <span className="foul-peek" aria-hidden="true"><ClubMascotBuddy mascot={humanClub.mascot}
                    primaryColor={humanClub.colors.primary} secondaryColor={humanClub.colors.secondary} accentColor={humanClub.colors.accent} size="sm" /></span>}
                  <span className="plate-verdict">
                    {buntCall ?? readout.label}
                    {!buntCall && playbackEvent?.pitchThrown
                      ? ` · ${playbackEvent.pitchThrown.mph} mph ${PITCH_TYPE_SHORT_LABELS[playbackEvent.pitchThrown.pitchType]}`
                      : ''}
                  </span>
                </div> : null
              }
            />
        </div>
        <div className="live-right">
          <div
            data-testid="sticky-live-scoreboard"
            className="live-score-row sticky z-20"
          >
            {scoreboard}
            {onOpenDugout && <button type="button" className="dugout-launch" onClick={() => {
              setWatchMode('paused');
              onOpenDugout();
            }}>Dugout</button>}
          </div>
          <p className="studio-shortcuts" data-testid="studio-shortcuts">
            Space swing or throw · 1 2 3 approach · B bunt · S steal · H hype · T tactics · Esc close
          </p>
          <div className="live-dock">
            {(() => {
              const scoutLine = buildMatchupScoutLine(picturedBatter, picturedPitcher, shown);
              return (
                <MatchupPrints guided={guiding && !showMore}
                  nextBatterName={handoff && !playing && !stole && !changedSides && liveSession.status === 'in_progress' ? currentBatter.name : undefined}
                  memories={humanClub.keepsakes}
                  batter={picturedBatter}
                  pitcher={picturedPitcher}
                  batterScoutLine={scoutLine.batterLine}
                  pitcherScoutLine={scoutLine.pitcherLine}
                  pitcherEndurance={pitcherEndurance}
                  pitcherEnduranceTier={enduranceFx.tier}
                  pitcherFatigueDropTag={pitcherFatigueDropTag}
                  batterFavorite={favoritePlayerIds.includes(picturedBatter.id)}
                  pitcherFavorite={favoritePlayerIds.includes(picturedPitcher.id)}
                  batterPowerReady={
                    humanIsBatting &&
                    Boolean(readyPowerOption) &&
                    picturedBatter.id === currentBatter.id
                  }
                  pitcherPowerReady={
                    !humanIsBatting &&
                    Boolean(readyPowerOption) &&
                    picturedPitcher.id === currentPitcher.id
                  }
                  batterPowerArmed={
                    humanIsBatting && Boolean(armedPowerId) && picturedBatter.id === currentBatter.id
                  }
                  pitcherPowerArmed={
                    !humanIsBatting && Boolean(armedPowerId) && picturedPitcher.id === currentPitcher.id
                  }
                  latestEvent={pendingDecision || showNextMatchup || (handoff && !playing) || lastChoreo?.play?.holdForceCall ? null : playbackEvent}
                  onInspect={openGamePlayerCard}
                />
              );
            })()}

            {smartPauseReason && watchMode === 'paused' && <p role="status" className="gazette-wire">Smart Watch paused · {smartPauseReason}</p>}
            {guiding && !showMore && !playing && !handoff && acceptSign}
            {handoff && !playing && playbackEvent && prePlaySession && lastChoreo ?
              <RallyResult detail={scoringDetail(playbackEvent, lastChoreo.play)} gameOver={liveSession.status === 'completed'} before={prePlaySession} event={playbackEvent}
                nextLabel={liveSession.status === 'completed' ? 'Box score' : changedSides ? 'Change sides' : stole ? 'Back to the batter' : 'Next batter'}
                onOpenPack={offerOpeningPack ? openBetweenInningsPack : undefined}
                onReplay={replayFromPitch}
                onContinue={() => {
                  setEntranceCue(!changedSides && !stole && liveSession.status !== 'completed' && guidedBatting
                    ? {role:'batter', outgoingId:playbackEvent.outsAfter > playbackEvent.outsBefore && !playbackEvent.basesAfter.includes(playbackEvent.batterId ?? '') ? playbackEvent.batterId : undefined} : null);
                  setLastChoreo(null);
                  setPlaybackEvent(null);
                  if (delayedSummary) { setModalSummary(delayedSummary.summary); setDelayedSummary(null); }
                }} /> : guiding && <FirstAtBat session={shown} batting={guidedBatting} target={pitchTarget} call={tacticalCall}
              locked={playing} expanded={showMore} powerArmed={Boolean(armedPowerId)}
              readyPowerName={readyPowerOption?.name ?? null}
              arcadeTimingEnabled={arcadeTimingEnabled}
              pitchingMode={pitchingMode}
              bullpenMode={bullpenMode}
              bullpenSuggestion={activeBullpenSuggestion}
              activePitcherFirstName={currentPitcher.name.split(' ')[0]}
              catcherCall={guidedCatcherCall}
              shakeOffTotal={guidedCatcherSeq.length}
              pitcherArsenal={guidedBatting ? [] : livePitcherSignOptions}
              selectedPitchType={selectedPitchType}
              onShakeOff={handleShakeOffCatcher}
              onSelectPitchType={(pt) => {
                setSelectedPitchType(pt);
                soundEngine.play('ui_pop');
              }}
              onSelectPitchingMode={handleSelectPitchingMode}
              onSelectBullpenMode={handleSelectBullpenMode}
              onAcceptBullpenSuggestion={(relId) => {
                soundEngine.play('bullpen_phone');
                handleBullpenSwap(relId);
              }}
              onDismissBullpenSuggestion={handleDismissBullpenSuggestion}
              onToggleArcadeTiming={() => {
                toggleArcadeTiming();
                soundEngine.play('ui_pop');
              }}
              onArmPower={
                readyPowerOption
                  ? () => {
                      setArmedPowerId((prev) =>
                        prev === readyPowerOption.id ? null : readyPowerOption.id,
                      );
                      soundEngine.play('clutch_stinger');
                    }
                  : undefined
              }
              cue={liveCue} onExpand={() => {
                setShowMore((open) => {
                  const next = !open;
                  if (!wideStudio) setSheetOpen(next);
                  else if (!next) setSheetOpen(false);
                  return next;
                });
              }}
              mascotName={(!guiding || showMore) && (wideStudio || sheetOpen) ? null : humanClub.mascot}
              mascotColors={humanClub.colors}
              mascotMood={liveMascotMood}
              onTarget={target=>{setEntranceCue(null);setLastChoreo(null);setPlaybackEvent(null);setPitchTarget(target);}}
              onSwing={call=>{setEntranceCue(null);setLastChoreo(null);setPlaybackEvent(null);setTacticalCall(call);}}
              onPitch={(grade) => handleNextPitch(tacticalCall, grade)} onSuggested={()=>{
                const action = liveCue.suggestedAction;
                if (action?.type === 'steal' && action.tacticalCall) handleNextPitch(action.tacticalCall);
                else if (action) handleSuggestedAction(action);
              }} />}
            {offerOpeningPack && !handoff && liveSession.status === 'in_progress' &&
              <aside className="rally-gift">
                <span>Opening Day foil pack</span><button onClick={openBetweenInningsPack}>Open foil pack</button>
              </aside>}
            {(!guiding || showMore) && replayable && lastChoreo && <button className="atbat-tip"
              onClick={replayFromPitch}>Watch again · {playReadout(playbackEvent)?.label}</button>}
            {showFullHud && !sheetOpen && (wideStudio || !guiding) && <LiveActionBar
              density={wideStudio ? 'full' : 'dock'}
              onOpenTactics={() => {
                setSheetOpen(true);
                setShowMore(true);
              }}
              watchSettings={<WatchSettings open={watchMode === 'smart'} side={{...humanClub,lineup:[...liveSession[humanSideKey].lineup]}} value={watchChoice} onChange={v=>{lastStop.current=null; setWatchChoice(v)}}/>}
              catcherSuggestion={acceptSign}
              cue={liveCue}
              matchupLabel={`${currentBatter.name} vs ${currentPitcher.name}`}
              basesLabel={`Bases: ${liveSession.bases.map((b, idx) => (b ? `${idx + 1}B` : '·')).join(' ')}`}
              batterName={currentBatter.name}
              pitcherName={currentPitcher.name}
              lowerThird={liveLowerThird}
              clutchRecap={clutchRecap}
              firstPitchTip={firstPitchTip}
              bullpenOptions={humanIsBatting ? [] : arcadeBullpenOptions}
              upcomingBatters={humanIsBatting ? [] : upcomingBatters}
              clubMascot={humanClub.mascot}
              clubColors={humanClub.colors}
              mascotMood={liveMascotMood}
              buntPreviewLine={buntPreviewLine}
              defensiveShift={defensiveShift}
              onSelectDefensiveShift={(shift) => {
                setDefensiveShift(shift);
                soundEngine.play('ui_pop');
              }}
              aiDefenseShiftLabel={
                humanIsBatting
                  ? (DEFENSIVE_SHIFTS.find((s) => s.id === chooseAiDefensiveShift(liveSession))
                      ?.shortLabel ?? null)
                  : null
              }
              pitcherArsenal={humanIsBatting ? [] : livePitcherSignOptions}
              selectedPitchType={selectedPitchType}
              onSelectPitchType={(pt) => {
                setSelectedPitchType(pt);
                soundEngine.play('ui_pop');
              }}
              pitcherEndurance={pitcherEndurance}
              pitcherEnduranceTier={enduranceFx.tier}
              pitcherStamina={currentPitcher.ratings.stamina}
              pitcherFatigueDropTag={pitcherFatigueDropTag}
              latestEvent={recentEvents[0] ?? null}
              controlMode={controlMode}
              pitchingMode={pitchingMode}
              onSelectPitchingMode={handleSelectPitchingMode}
              bullpenMode={bullpenMode}
              onSelectBullpenMode={handleSelectBullpenMode}
              bullpenSuggestion={activeBullpenSuggestion}
              onAcceptBullpenSuggestion={(relId) => {
                soundEngine.play('bullpen_phone');
                handleBullpenSwap(relId);
              }}
              onDismissBullpenSuggestion={handleDismissBullpenSuggestion}
              catcherCall={activeCatcherCall}
              shakeOffTotal={catcherCallSeq.length}
              onShakeOff={handleShakeOffCatcher}
              repeatPitchWarning={repeatPitchWarning}
              batterWeakPitch={currentBatter.batterPitchProfile.weakPitch}
              batterFavoritePitch={currentBatter.batterPitchProfile.favoritePitch}
              watchMode={watchMode}
              smartPauseReason={smartPauseReason}
              tacticalCall={tacticalCall}
              pitchTarget={pitchTarget}
              isBatting={humanIsBatting}
              gameCompleted={liveSession.status === 'completed'}
              humanHype={humanHypeNow}
              hypeCost={SPECIAL_ABILITY_HYPE_COST}
              readyPowerLabel={readyPowerOption?.name ?? null}
              powerArmed={Boolean(armedPowerId)}
              speed={speed}
              onCycleSpeed={() => {
                setSpeed((s) => (s === 1 ? 2 : s === 2 ? 4 : 1));
                soundEngine.play('ui_pop');
              }}
              arcadeTimingEnabled={arcadeTimingEnabled}
              onToggleArcadeTiming={() => {
                toggleArcadeTiming();
                soundEngine.play('ui_pop');
              }}
              quickStealOption={bestQuickSteal}
              isBatterFavorite={favoritePlayerIds.includes(currentBatter.id)}
              onArmReadyPower={
                readyPowerOption
                  ? () => {
                      setArmedPowerId((prev) =>
                        prev === readyPowerOption.id ? null : readyPowerOption.id,
                      );
                      soundEngine.play('clutch_stinger');
                    }
                  : undefined
              }
              onNextPitch={(grade) => {
                setSmartPauseReason(null);
                handleNextPitch(tacticalCall, grade);
              }}
              onToggleWatchMode={() => {
                setSmartPauseReason(null);
                setWatchMode((w) => (w === 'live' ? 'paused' : 'live'));
              }}
              onToggleSmartWatch={() => {
                setSmartPauseReason(null);
                setWatchMode((w) => (w === 'smart' ? 'paused' : 'smart'));
                soundEngine.play('ui_pop');
              }}
              onSimAtBat={handleSimAtBat}
              onSimHalfInning={handleSimHalfInning}
              onClutchSim={handleClutchSim}
              onSimToEnd={() => {
                setSheetOpen(false);
                handleSimToEnd();
              }}
              onSelectTacticalCall={(call) => {
                setTacticalCall(call);
                soundEngine.play('ui_pop');
              }}
              onSelectPitchTarget={(intent) => {
                setPitchTarget(intent);
                soundEngine.play('ui_pop');
              }}
              onSuggestedAction={handleSuggestedAction}
              onToggleControlMode={() => {
                toggleControlMode();
                soundEngine.play('ui_pop');
              }}
              onSelectBullpenReliever={(relId) => {
                soundEngine.play('bullpen_phone');
                handleBullpenSwap(relId);
              }}
              onInspectBatter={() => openGamePlayerCard(currentBatter.id)}
              onInspectPitcher={() => openGamePlayerCard(currentPitcher.id)}
              onInspectPlayers={() => openGamePlayerCard(currentBatter.id)}
              onOpenBoxScore={() => {
                setBoxScoreOpen(true);
                soundEngine.play('ui_pop');
              }}
            />}

            {liveNemesis ? (
              <div
                data-testid="nemesis-matchup-banner"
                className="px-2.5 py-1.5 rounded-xl border-2 border-[#181B2C] bg-[#FFE5EC] text-[#9D0208] text-[11px] font-extrabold flex flex-wrap items-center justify-between gap-1"
              >
                <span>{liveNemesis.badgeText}</span>
                <span className="text-[#181B2C]">{liveNemesis.bannerText}</span>
              </div>
            ) : null}
          </div>

          <LiveBottomSheet
            presentation={sheetOpen || !wideStudio ? 'sheet' : 'inline'}
            open={
              liveSession.status !== 'completed' &&
              !modalSummary &&
              (sheetOpen || (wideStudio && showFullHud))
            }
            title="Tactics"
            onClose={closeTactics}
          >
            {showFullHud && (sheetOpen || !wideStudio) && <LiveActionBar
              defaultTacticsOpen={sheetOpen}
              watchSettings={<WatchSettings open={watchMode === 'smart'} side={{...humanClub,lineup:[...liveSession[humanSideKey].lineup]}} value={watchChoice} onChange={v=>{lastStop.current=null; setWatchChoice(v)}}/>}
              catcherSuggestion={acceptSign}
              cue={liveCue}
              matchupLabel={`${currentBatter.name} vs ${currentPitcher.name}`}
              basesLabel={`Bases: ${liveSession.bases.map((b, idx) => (b ? `${idx + 1}B` : '·')).join(' ')}`}
              batterName={currentBatter.name}
              pitcherName={currentPitcher.name}
              lowerThird={liveLowerThird}
              clutchRecap={clutchRecap}
              firstPitchTip={firstPitchTip}
              bullpenOptions={humanIsBatting ? [] : arcadeBullpenOptions}
              upcomingBatters={humanIsBatting ? [] : upcomingBatters}
              clubMascot={humanClub.mascot}
              clubColors={humanClub.colors}
              mascotMood={liveMascotMood}
              buntPreviewLine={buntPreviewLine}
              defensiveShift={defensiveShift}
              onSelectDefensiveShift={(shift) => {
                setDefensiveShift(shift);
                soundEngine.play('ui_pop');
              }}
              aiDefenseShiftLabel={
                humanIsBatting
                  ? (DEFENSIVE_SHIFTS.find((s) => s.id === chooseAiDefensiveShift(liveSession))
                      ?.shortLabel ?? null)
                  : null
              }
              pitcherArsenal={humanIsBatting ? [] : livePitcherSignOptions}
              selectedPitchType={selectedPitchType}
              onSelectPitchType={(pt) => {
                setSelectedPitchType(pt);
                soundEngine.play('ui_pop');
              }}
              pitcherEndurance={pitcherEndurance}
              pitcherEnduranceTier={enduranceFx.tier}
              pitcherStamina={currentPitcher.ratings.stamina}
              pitcherFatigueDropTag={pitcherFatigueDropTag}
              latestEvent={recentEvents[0] ?? null}
              controlMode={controlMode}
              pitchingMode={pitchingMode}
              onSelectPitchingMode={handleSelectPitchingMode}
              bullpenMode={bullpenMode}
              onSelectBullpenMode={handleSelectBullpenMode}
              bullpenSuggestion={activeBullpenSuggestion}
              onAcceptBullpenSuggestion={(relId) => {
                soundEngine.play('bullpen_phone');
                handleBullpenSwap(relId);
              }}
              onDismissBullpenSuggestion={handleDismissBullpenSuggestion}
              catcherCall={activeCatcherCall}
              shakeOffTotal={catcherCallSeq.length}
              onShakeOff={handleShakeOffCatcher}
              repeatPitchWarning={repeatPitchWarning}
              batterWeakPitch={currentBatter.batterPitchProfile.weakPitch}
              batterFavoritePitch={currentBatter.batterPitchProfile.favoritePitch}
              watchMode={watchMode}
              smartPauseReason={smartPauseReason}
              tacticalCall={tacticalCall}
              pitchTarget={pitchTarget}
              isBatting={humanIsBatting}
              gameCompleted={liveSession.status === 'completed'}
              humanHype={humanHypeNow}
              hypeCost={SPECIAL_ABILITY_HYPE_COST}
              readyPowerLabel={readyPowerOption?.name ?? null}
              powerArmed={Boolean(armedPowerId)}
              speed={speed}
              onCycleSpeed={() => {
                setSpeed((s) => (s === 1 ? 2 : s === 2 ? 4 : 1));
                soundEngine.play('ui_pop');
              }}
              arcadeTimingEnabled={arcadeTimingEnabled}
              onToggleArcadeTiming={() => {
                toggleArcadeTiming();
                soundEngine.play('ui_pop');
              }}
              quickStealOption={bestQuickSteal}
              isBatterFavorite={favoritePlayerIds.includes(currentBatter.id)}
              onArmReadyPower={
                readyPowerOption
                  ? () => {
                      setArmedPowerId((prev) =>
                        prev === readyPowerOption.id ? null : readyPowerOption.id,
                      );
                      soundEngine.play('clutch_stinger');
                    }
                  : undefined
              }
              onNextPitch={(grade) => {
                setSmartPauseReason(null);
                handleNextPitch(tacticalCall, grade);
              }}
              onToggleWatchMode={() => {
                setSmartPauseReason(null);
                setWatchMode((w) => (w === 'live' ? 'paused' : 'live'));
              }}
              onToggleSmartWatch={() => {
                setSmartPauseReason(null);
                setWatchMode((w) => (w === 'smart' ? 'paused' : 'smart'));
                soundEngine.play('ui_pop');
              }}
              onSimAtBat={handleSimAtBat}
              onSimHalfInning={handleSimHalfInning}
              onClutchSim={handleClutchSim}
              onSimToEnd={() => {
                setSheetOpen(false);
                handleSimToEnd();
              }}
              onSelectTacticalCall={(call) => {
                setTacticalCall(call);
                soundEngine.play('ui_pop');
              }}
              onSelectPitchTarget={(intent) => {
                setPitchTarget(intent);
                soundEngine.play('ui_pop');
              }}
              onSuggestedAction={handleSuggestedAction}
              onToggleControlMode={() => {
                toggleControlMode();
                soundEngine.play('ui_pop');
              }}
              onSelectBullpenReliever={(relId) => {
                soundEngine.play('bullpen_phone');
                handleBullpenSwap(relId);
              }}
              onInspectBatter={() => openGamePlayerCard(currentBatter.id)}
              onInspectPitcher={() => openGamePlayerCard(currentPitcher.id)}
              onInspectPlayers={() => openGamePlayerCard(currentBatter.id)}
              onOpenBoxScore={() => {
                setBoxScoreOpen(true);
                soundEngine.play('ui_pop');
              }}
            />}

          {/* Quiet Guided Mode: keep Weather, Rivalry & Broadcast HUD hidden until More Controls or full game */}
          {(!guiding || showMore) ? (() => {
            const park = getBallparkPreset(liveSession.ballparkId);
            const weatherImpact = gameWeather ? evaluateWeatherSimulationImpact(gameWeather) : null;
            const hasParkTilt =
              park.factors.hrFactor !== 1 ||
              Boolean(weatherImpact && weatherImpact.hrCarryMultiplier !== 1);
            return (
              <div className="space-y-2">
                <StrikeZoneOverlay
                  events={atBatEvents}
                  batterHand={currentBatter.bats}
                  countLabel={`${liveSession.balls}-${liveSession.strikes}`}
                  initialMode={wideStudio ? 'expanded' : 'compact'}
                />
                <div
                  data-testid="game-weather-banner"
                  className="px-3 py-2 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] flex flex-wrap items-center justify-between gap-2 text-xs"
                >
                  <div className="flex flex-wrap items-center gap-2 font-extrabold text-[#181B2C]">
                    {gameWeather?.condition === 'drizzle' ? (
                      <CloudRain className="w-4 h-4 text-[#1D3557]" />
                    ) : (
                      <Sun className="w-4 h-4 text-[#F77F00]" />
                    )}
                    <span>🏟️ {park.name}</span>
                    <span className="px-2 py-0.5 rounded bg-[#E0FBFC] border border-[#181B2C] text-[10px] text-[#1D3557]">
                      {weatherImpact ? weatherImpact.hudLabel : 'Clear Ballpark Skies'}
                    </span>
                    {hasParkTilt ? (
                      <span
                        data-testid="park-factor-pill"
                        className="px-2 py-0.5 rounded bg-[#FFF3BF] border border-[#181B2C] text-[10px]"
                      >
                        {park.factors.hrFactor !== 1 ? `Park HR ${park.factors.hrFactor.toFixed(2)}x` : ''}
                        {park.factors.hrFactor !== 1 && weatherImpact && weatherImpact.hrCarryMultiplier !== 1
                          ? ' • '
                          : ''}
                        {weatherImpact && weatherImpact.hrCarryMultiplier !== 1
                          ? `Wind Carry ${weatherImpact.hrCarryMultiplier.toFixed(2)}x`
                          : ''}
                      </span>
                    ) : null}
                  </div>
                  <ComicButton
                    size="sm"
                    variant="sky"
                    icon={<ClipboardList className="w-3.5 h-3.5" />}
                    onClick={() => {
                      setBoxScoreOpen(true);
                      soundEngine.play('ui_pop');
                    }}
                  >
                    Live Box Score
                  </ComicButton>
                </div>

                {rivalryPreview ? (
                  <div
                    data-testid="rivalry-showdown-banner"
                    className="px-3 py-2 rounded-xl border-2 border-[#181B2C] bg-gradient-to-r from-[#FF4D6D] via-[#FFC300] to-[#1D3557] text-[#181B2C] flex flex-wrap items-center justify-between gap-2 text-xs shadow-[3px_3px_0_#181B2C]"
                  >
                    <div className="flex items-center gap-1.5 font-display text-[#FFFDF7] drop-shadow-[1px_1px_0_#181B2C]">
                      <Flame className="w-4 h-4 text-[#FFD166] shrink-0" />
                      <span>{rivalryPreview.vsBannerTitle}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 text-[10px] font-extrabold">
                      <span className="px-2 py-0.5 rounded bg-[#FFFDF7] border border-[#181B2C]">
                        🏆 {rivalryPreview.cupName}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#FFF3BF] border border-[#181B2C]">
                        Heat {rivalryPreview.heat}/100 • +
                        {Math.round((rivalryPreview.modifiers.hypeGainMultiplier - 1) * 100)}% Hype
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })() : null}

          {(!guiding || showMore) ? (
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
              atBatEvents={atBatEvents}
            />
          ) : null}

          {controlMode === 'advanced' ? (
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
                    Batter Crushes:{' '}
                    {PITCH_TYPE_SHORT_LABELS[currentBatter.batterPitchProfile.favoritePitch]}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#FFE5EC] border border-[#181B2C] text-[#9D0208]">
                    Batter Weak:{' '}
                    {PITCH_TYPE_SHORT_LABELS[currentBatter.batterPitchProfile.weakPitch]}
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
                    ⚡ Hype {fieldingHype}/{SPECIAL_ABILITY_HYPE_COST} • Pitcher{' '}
                    {pitcherSpecial.chargesLeft}/{pitcherSpecial.maxCharges}
                    {pitcherSpecial.cooldownRemaining > 0
                      ? ` (CD ${pitcherSpecial.cooldownRemaining})`
                      : ''}{' '}
                    • Batter {batterSpecial.chargesLeft}/{batterSpecial.maxCharges}
                  </span>
                </div>

                {/* Active National Heritage & Individual Capstone Matchup Badges + Unleash Power Dock */}
                {(() => {
                  const batHer = evaluateHeritageGameplayProfile(
                    currentBatter,
                    currentLeverage.leverageIndex,
                  );
                  const pitHer = evaluateHeritageGameplayProfile(
                    currentPitcher,
                    currentLeverage.leverageIndex,
                  );
                  const batCaps = evaluateCapstoneGameplayProfile(
                    currentBatter,
                    currentLeverage.leverageIndex,
                  );
                  const pitCaps = evaluateCapstoneGameplayProfile(
                    currentPitcher,
                    currentLeverage.leverageIndex,
                  );
                  const humanRole: 'pitcher' | 'batter' =
                    humanIsBatting ? 'batter' : 'pitcher';
                  const humanActor = humanRole === 'batter' ? currentBatter : currentPitcher;
                  const humanAvail = humanRole === 'batter' ? batterSpecial : pitcherSpecial;
                  const humanHypeNow = liveSession[humanSideKey].hypeGauge;
                  const activatable = getActivatablePowersForPlayer(humanActor, humanRole);

                  return (
                    <div className="space-y-2">
                      <div
                        data-testid="matchup-power-badges"
                        className="flex flex-wrap gap-1.5 text-[10px] font-extrabold"
                      >
                        <span
                          className="px-2 py-0.5 rounded border border-[#181B2C] bg-[#F5EEFF] text-[#4C1D95]"
                          title={batHer.ability.shortEffect}
                        >
                          Batter Nation: {batHer.summaryTag}
                          {batCaps.equippedPowerNames.length > 0
                            ? ` + ${batCaps.equippedPowerNames.join(', ')}`
                            : ''}
                        </span>
                        <span
                          className="px-2 py-0.5 rounded border border-[#181B2C] bg-[#E0FBFC] text-[#1D3557]"
                          title={pitHer.ability.shortEffect}
                        >
                          Pitcher Nation: {pitHer.summaryTag}
                          {pitCaps.equippedPowerNames.length > 0
                            ? ` + ${pitCaps.equippedPowerNames.join(', ')}`
                            : ''}
                        </span>
                      </div>

                      <div
                        data-testid="active-powers-dock"
                        className="p-2 rounded-xl border-2 border-[#181B2C] bg-[#F5EEFF] space-y-1.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] font-extrabold uppercase text-[#4C1D95]">
                          <span className="flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5" />
                            {humanActor.name} — National &amp; Individual Powers ({humanRole})
                          </span>
                          <span>
                            {humanAvail.allowed
                              ? `READY! (${humanAvail.chargesLeft}/${humanAvail.maxCharges} left)`
                              : `Charging Hype ${humanHypeNow}/${SPECIAL_ABILITY_HYPE_COST} (${humanAvail.reason ?? 'Locked'})`}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {activatable.map((pwr) => {
                            const armed = armedPowerId === pwr.id;
                            return (
                              <ComicButton
                                key={pwr.id}
                                size="sm"
                                variant={
                                  armed ? 'coral' : pwr.source === 'capstone' ? 'gold' : 'violet'
                                }
                                active={armed}
                                disabled={!humanAvail.allowed || liveSession.status === 'completed'}
                                onClick={() => {
                                  setArmedPowerId((prev) => (prev === pwr.id ? null : pwr.id));
                                  soundEngine.play('clutch_stinger');
                                }}
                              >
                                {armed ? `🔥 ARMED: ${pwr.name}` : `⚡ ${pwr.name}`}
                              </ComicButton>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Pitcher/Batter Cat-and-Mouse Mind Games Bar */}
                <div
                  data-testid="mind-games-bar"
                  className="p-2 rounded-xl border-2 border-[#181B2C] bg-[#E0FBFC] space-y-1.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#1D3557]">
                      {!humanIsBatting
                        ? pitchingMode === 'simple'
                          ? 'Pitching Mode: Simple (Catcher calls pitch & location)'
                          : 'Pitch Target Location (Over Plate / Corner / Low Chase)'
                        : 'Guess Pitch Mind-Game (Guess Right: +14 CON/+12 PWR • Wrong: -8)'}
                    </div>
                    {!humanIsBatting ? (
                      <div
                        data-testid="pitching-mode-switcher"
                        role="group"
                        aria-label="Pitching mode"
                        className="inline-flex items-center rounded-lg border border-[#181B2C] bg-[#FFFDF7] p-0.5 gap-0.5"
                      >
                        {(
                          [
                            { id: 'simple', label: 'Simple' },
                            { id: 'normal', label: 'Normal' },
                            { id: 'advanced', label: 'Adv' },
                          ] as const
                        ).map((modeOpt) => (
                          <button
                            key={modeOpt.id}
                            type="button"
                            aria-pressed={pitchingMode === modeOpt.id}
                            onClick={() => handleSelectPitchingMode(modeOpt.id)}
                            className={`px-2 py-0.5 rounded font-extrabold text-[10px] cursor-pointer ${
                              pitchingMode === modeOpt.id
                                ? 'bg-[#1D3557] text-[#FFD166]'
                                : 'text-[#181B2C] hover:bg-[#FFF3BF]'
                            }`}
                          >
                            {modeOpt.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {!humanIsBatting ? (
                      pitchingMode === 'simple' ? (
                        <div className="flex flex-wrap items-center justify-between gap-2 w-full">
                          <span
                            data-testid="arcade-catcher-call"
                            className="text-xs font-extrabold text-[#181B2C]"
                          >
                            🧤 Catcher:{' '}
                            {activeCatcherCall
                              ? `${activeCatcherCall.targetLabel} · ${activeCatcherCall.pitchShortLabel} (${activeCatcherCall.reason})`
                              : 'Over Plate · 4-Seam'}
                          </span>
                          {catcherCallSeq.length > 1 ? (
                            <ComicButton
                              size="sm"
                              variant="gold"
                              data-testid="arcade-shake-off-btn"
                              disabled={liveSession.status === 'completed'}
                              onClick={handleShakeOffCatcher}
                            >
                              Shake off
                            </ComicButton>
                          ) : null}
                        </div>
                      ) : (
                        PITCH_TARGET_OPTIONS.map((opt) => (
                          <ComicButton
                            key={opt.id}
                            size="sm"
                            variant={pitchTarget === opt.id ? 'sky' : 'cream'}
                            active={pitchTarget === opt.id}
                            onClick={() => {
                              setPitchTarget(opt.id);
                              soundEngine.play('ui_pop');
                            }}
                          >
                            {opt.label}
                          </ComicButton>
                        ))
                      )
                    ) : (
                      BATTER_GUESS_OPTIONS.map((opt) => (
                        <ComicButton
                          key={opt.id}
                          size="sm"
                          variant={batterGuess === opt.id ? 'gold' : 'cream'}
                          active={batterGuess === opt.id}
                          onClick={() => {
                            setBatterGuess(opt.id);
                            soundEngine.play('ui_pop');
                          }}
                        >
                          {opt.label}
                        </ComicButton>
                      ))
                    )}
                  </div>
                </div>

                {!humanIsBatting && pitchingMode === 'advanced' && currentPitcher.pitchArsenal ? (
                  <div
                    data-testid="pitch-selector-bar"
                    className="p-2 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-1.5"
                  >
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#4A5068]">
                      Call Pitch ({currentPitcher.position} Arsenal:{' '}
                      {currentPitcher.pitchArsenal.repertoire.length} Pitches)
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
                        const hitsWeak =
                          slot.pitchType === currentBatter.batterPitchProfile.weakPitch;
                        const hitsFav =
                          slot.pitchType === currentBatter.batterPitchProfile.favoritePitch;
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
                      Manager Skipper Power Dock{' '}
                      {managerEjected
                        ? '(🚨 EJECTED — LOCKED THIS GAME!)'
                        : '(1 Charge / Game Each)'}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {manager.activePowerIds.map((powerId: ManagerPowerId) => {
                        const meta = MANAGER_POWER_CATALOG[powerId];
                        const used = powerTracker.usedPowerIds.includes(powerId);
                        return (
                          <ComicButton
                            key={powerId}
                            size="sm"
                            variant={used || managerEjected ? 'cream' : 'gold'}
                            disabled={used || managerEjected || liveSession.status === 'completed'}
                            onClick={() => {
                              const res = triggerInGameManagerPower(
                                powerTracker,
                                manager,
                                powerId,
                                liveSession,
                                humanSideKey,
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
              </div>
            </ComicCard>
          ) : null}

        {(!guiding || showMore) ? (
        <div className="space-y-3">
          <ComicCard
            title="PLAY-BY-PLAY TICKER"
            headerBg="#1B4332"
            badge={
              <ComicButton
                size="sm"
                variant={showPitchMath ? 'gold' : 'cream'}
                onClick={() => {
                  setShowPitchMath((prev) => !prev);
                  soundEngine.play('ui_pop');
                }}
              >
                {showPitchMath ? 'Hide Math' : 'Show Math'}
              </ComicButton>
            }
          >
            <ul
              data-testid="play-by-play-ticker"
              className="space-y-1.5 text-xs font-bold text-[#181B2C] max-h-64 overflow-y-auto"
            >
              {recentEvents.length === 0 ? (
                <li className="text-[#4A5068]">Step onto the mound or tap Next Pitch!</li>
              ) : (
                recentEvents.map((ev) => (
                  <li
                    key={ev.seq}
                    className="p-2 rounded-lg border border-[#181B2C]/20 bg-[#FFFDF7] space-y-1"
                  >
                    <div>
                      <span className="text-[#1B4332] font-extrabold mr-1">
                        [{ev.half} {ev.inning}]
                      </span>
                      {ev.commentary}
                    </div>
                    {showPitchMath && ev.mathBreakdown ? (
                      <div
                        data-testid="pitch-math-breakdown"
                        className="p-1.5 rounded bg-[#181B2C] text-[#FFD166] font-mono-tabular text-[10px] leading-snug space-y-0.5"
                      >
                        <div>
                          CON {ev.mathBreakdown.effContact} / PWR {ev.mathBreakdown.effPower} vs STU{' '}
                          {ev.mathBreakdown.effStuff} / CTL {ev.mathBreakdown.effControl}
                        </div>
                        <div className="text-[#E0FBFC]">
                          Zone {ev.mathBreakdown.zonePct}%
                          {ev.mathBreakdown.hitPct !== undefined
                            ? ` • Hit ${ev.mathBreakdown.hitPct}%`
                            : ''}
                          {ev.mathBreakdown.hrPct !== undefined
                            ? ` • HR ${ev.mathBreakdown.hrPct}%`
                            : ''}
                          {` • d100 Roll: ${ev.mathBreakdown.diceRoll}`}
                        </div>
                        {ev.mathBreakdown.activeModifiers.length > 0 ? (
                          <div className="text-white/80">
                            {ev.mathBreakdown.activeModifiers.join(' • ')}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                ))
              )}
            </ul>
          </ComicCard>

          {controlMode === 'advanced' ? (
            <>
              <ComicCard title="DUGOUT CHESS & BENCH" headerBg="#7209B7">
                <div data-testid="dugout-chess-card" className="space-y-2.5">
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-extrabold uppercase text-[#4C1D95]">
                      Mound Visit (1/Game) &amp; Umpire Drama
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <ComicButton
                        size="sm"
                        variant={moundVisitUsed ? 'cream' : 'sky'}
                        disabled={moundVisitUsed || liveSession.status === 'completed'}
                        onClick={() => {
                          const res = applyMoundVisit(liveSession, humanSideKey, 'calm_breath');
                          if (res.applied && res.event) {
                            setMoundVisitUsed(true);
                            applyStepResult(res.nextSession, [res.event], activeOpponent.id);
                          }
                        }}
                      >
                        Mound Visit: Calm Breath
                      </ComicButton>
                      <ComicButton
                        size="sm"
                        variant={moundVisitUsed ? 'cream' : 'gold'}
                        disabled={moundVisitUsed || liveSession.status === 'completed'}
                        onClick={() => {
                          const res = applyMoundVisit(liveSession, humanSideKey, 'fire_up_crowd');
                          if (res.applied && res.event) {
                            setMoundVisitUsed(true);
                            applyStepResult(res.nextSession, [res.event], activeOpponent.id);
                          }
                        }}
                      >
                        Mound Visit: Fire Crowd
                      </ComicButton>
                      <ComicButton
                        size="sm"
                        variant={argueUsed ? 'cream' : 'coral'}
                        disabled={argueUsed || liveSession.status === 'completed'}
                        onClick={() => {
                          const rng = createSeededRng(
                            liveSession.rngSeed + liveSession.stepCounter * 71 + 19,
                          );
                          const gamble = resolveArgueCallGamble(rng, liveSession, humanSideKey);
                          setArgueUsed(true);
                          if (gamble.ejected) setManagerEjected(true);
                          applyStepResult(gamble.nextSession, [gamble.event], activeOpponent.id);
                        }}
                      >
                        {managerEjected ? '🚨 Skipper Ejected' : '🔥 Kick Dirt! (Argue Call)'}
                      </ComicButton>
                    </div>
                  </div>

                  {(() => {
                    const bench = getAvailableBenchPlayers(liveSession, humanSideKey);
                    const occupiedBaseIdx = liveSession.bases.findIndex((b) => b !== null) as
                      | -1
                      | 0
                      | 1
                      | 2;
                    return (
                      <div className="space-y-1.5 pt-1.5 border-t border-dashed border-[#181B2C]/20">
                        <div className="text-[10px] font-extrabold uppercase text-[#181B2C]">
                          Pinch Hitters &amp; Pinch Runners ({bench.length} Available)
                        </div>
                        {bench.length === 0 ? (
                          <div className="text-[11px] font-bold text-[#4A5068]">
                            Bench empty — all subs used.
                          </div>
                        ) : (
                          bench.slice(0, 3).map((sub) => (
                            <div
                              key={sub.id}
                              className="p-2 rounded-lg border border-[#181B2C]/20 bg-[#FFFDF7] flex flex-wrap items-center justify-between gap-1.5 text-[11px]"
                            >
                              <div className="font-extrabold text-[#181B2C]">
                                {sub.position} {sub.name} ({sub.bats}) • SPD {sub.ratings.speed}
                              </div>
                              <div className="flex gap-1">
                                {humanIsBatting ? (
                                  <ComicButton
                                    size="sm"
                                    variant="gold"
                                    disabled={liveSession.status === 'completed'}
                                    onClick={() => {
                                      const res = applyPinchHitter(liveSession, humanSideKey, sub.id);
                                      if (res.applied && res.event) {
                                        applyStepResult(
                                          res.nextSession,
                                          [res.event],
                                          activeOpponent.id,
                                        );
                                      }
                                    }}
                                  >
                                    Pinch Hit
                                  </ComicButton>
                                ) : null}
                                {humanIsBatting && occupiedBaseIdx >= 0 ? (
                                  <ComicButton
                                    size="sm"
                                    variant="turf"
                                    disabled={liveSession.status === 'completed'}
                                    onClick={() => {
                                      const res = applyPinchRunner(
                                        liveSession,
                                        humanSideKey,
                                        occupiedBaseIdx as 0 | 1 | 2,
                                        sub.id,
                                      );
                                      if (res.applied && res.event) {
                                        applyStepResult(
                                          res.nextSession,
                                          [res.event],
                                          activeOpponent.id,
                                        );
                                      }
                                    }}
                                  >
                                    Pinch Run {occupiedBaseIdx + 1}B
                                  </ComicButton>
                                ) : null}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    );
                  })()}
                </div>
              </ComicCard>

              <ComicCard
                title="BULLPEN PHONE"
                headerBg="#2B2D42"
                badge={
                  <div
                    role="group"
                    aria-label="Pro bullpen mode"
                    className="inline-flex items-center rounded-lg border border-[#181B2C] bg-[#FFFDF7] p-0.5 gap-0.5"
                  >
                    {BULLPEN_MODE_OPTIONS.map((modeOpt) => (
                      <button
                        key={modeOpt.id}
                        type="button"
                        aria-pressed={bullpenMode === modeOpt.id}
                        onClick={() => handleSelectBullpenMode(modeOpt.id)}
                        className={`px-2 py-0.5 rounded font-extrabold text-[10px] cursor-pointer ${
                          bullpenMode === modeOpt.id
                            ? 'bg-[#1D3557] text-[#FFD166]'
                            : 'text-[#181B2C] hover:bg-[#FFF3BF]'
                        }`}
                      >
                        {modeOpt.shortLabel}
                      </button>
                    ))}
                  </div>
                }
              >
                {rankedBullpenCandidates.length === 0 ? (
                  <p className="text-xs font-bold text-[#4A5068]">No fresh relievers remaining.</p>
                ) : (
                  <div className="space-y-2">
                    {upcomingBatters.length > 0 ? (
                      <div
                        data-testid="pro-bullpen-due-up-strip"
                        className="px-2 py-1 rounded-lg border border-[#181B2C]/30 bg-[#E0FBFC] text-[10.5px] font-extrabold text-[#1D3557]"
                      >
                        Due Up: {upcomingBatters.map((b) => b.bats).join(' · ')} (
                        {upcomingBatters.map((b) => `${b.name.split(' ').at(-1)} ${b.bats}`).join(', ')})
                      </div>
                    ) : null}
                    {rankedBullpenCandidates.map((candidate) => {
                      const rel = candidate.player;
                      const warmup = evaluateBullpenWarmup(rel.id, warmupCounts[rel.id] ?? 0);
                      const isWarming = warmingRelieverIds.includes(rel.id);
                      return (
                        <div
                          key={rel.id}
                          className={`space-y-1 p-2 rounded-xl border ${
                            candidate.isRecommended
                              ? 'border-[#181B2C] bg-[#FFF8DC]'
                              : 'border-[#181B2C]/20 bg-[#FFFDF7]'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] font-extrabold">
                            <span className="text-[#181B2C]">
                              {rel.name} ({rel.throws}HP • {candidate.roleLabel} • OVR {candidate.ovr})
                            </span>
                            <div className="flex items-center gap-1">
                              {candidate.isRecommended ? (
                                <span className="px-1.5 py-0.5 rounded border border-[#181B2C] bg-[#FFC300] text-[#181B2C]">
                                  ★ Pick{candidate.fitTag ? ` · ${candidate.fitTag}` : ''}
                                </span>
                              ) : null}
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
                                {warmup.status === 'hot' ? '🔥 HOT (+2 CTL)' : warmup.status}
                              </span>
                            </div>
                          </div>
                          {candidate.pitchMixLabels.length > 0 ? (
                            <div className="text-[9.5px] font-bold text-[#1D3557]">
                              ⚾ Mix: {candidate.pitchMixLabels.join(' · ')}
                            </div>
                          ) : null}
                          <div className="flex gap-1.5">
                            <ComicButton
                              size="sm"
                              variant={isWarming ? 'gold' : 'sky'}
                              onClick={() => {
                                soundEngine.play('bullpen_phone');
                                setWarmingRelieverIds((prev) =>
                                  prev.includes(rel.id)
                                    ? prev.filter((id) => id !== rel.id)
                                    : [...prev, rel.id],
                                );
                              }}
                            >
                              {isWarming ? 'Sit Down' : 'Warm Up'}
                            </ComicButton>
                            <ComicButton
                              size="sm"
                              variant={candidate.isRecommended ? 'gold' : 'cream'}
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
            </>
          ) : null}
        </div>
        ) : null}
          </LiveBottomSheet>
        </div>
      </div>

      <LiveBoxScoreModal
        open={boxScoreOpen}
        onClose={() => setBoxScoreOpen(false)}
        session={liveSession}
        awayClub={liveAwayClub}
        homeClub={liveHomeClub}
        onInspectPlayer={(id) => {
          setBoxScoreOpen(false);
          openGamePlayerCard(id);
        }}
      />

      <PlayerCardModal
        open={inspectedGamePlayerId !== null}
        entry={activeInspectedEntry && {...activeInspectedEntry,player:{...activeInspectedEntry.player,
          recentContact: liveSession.status === 'completed' ? activeInspectedEntry.player.recentContact : recentContact(activeInspectedEntry.player,gameLog.current)}}}
        allEntries={gameCardEntries}
        batterId={currentBatter.id}
        pitcherId={currentPitcher.id}
        runnerIds={liveRunnerIds}
        isFavorite={
          activeInspectedEntry
            ? favoritePlayerIds.includes(activeInspectedEntry.player.id)
            : false
        }
        onToggleFavorite={
          activeInspectedEntry && activeInspectedEntry.club.id === humanClub.id
            ? () => toggleFavoritePlayer(activeInspectedEntry.player.id)
            : undefined
        }
        onCustomizePlayer={
          activeInspectedEntry && activeInspectedEntry.club.id === humanClub.id
            ? (patch) => customizePlayerProfile(activeInspectedEntry.player.id, patch)
            : undefined
        }
        onSelectPlayerId={(id) => setInspectedGamePlayerId(id)}
        onClose={() => setInspectedGamePlayerId(null)}
      />

      <PostGameSummaryModal
        summary={modalSummary}
        humanClub={humanClub}
        opponentClub={modalOpponentClub}
        managerLevel={manager?.level ?? 1}
        unopenedPackCount={unopenedPacks.length}
        playAgainLabel={computePostGameNextAction(true).label}
        onClose={() => {
          setModalSummary(null);
          setLiveSession(null);
          safeScrollTop();
        }}
        onPlayAgain={computePostGameNextAction(true).onClick}
        onOpenFoilPacks={() => {
          setModalSummary(null);
          setLiveSession(null);
          setFoilModalOpen(true);
          soundEngine.play('ui_pop');
        }}
        onSpendSkillPoints={
          onJumpToTab
            ? () => {
                setModalSummary(null);
                setLiveSession(null);
                onJumpToTab('skills');
              }
            : undefined
        }
      />

      <CelebrationStickerToast
        unlock={stickerToast}
        club={humanClub}
        onOpenAlbum={() => {
          setStickerToast(null);
          setTrophyOpen(true);
        }}
        onDismiss={() => setStickerToast(null)}
      />

      <TrophyCaseModal
        open={trophyOpen}
        onClose={() => setTrophyOpen(false)}
        onInspectPlayerId={(id) => {
          setTrophyOpen(false);
          setInspectedGamePlayerId(id);
        }}
      />

      <FoilPackModal
        open={foilModalOpen}
        onClose={() => setFoilModalOpen(false)}
        backLabel="⚾ Back to Game Day"
        onBackToGame={() => setFoilModalOpen(false)}
        onViewRelics={
          onOpenRelics
            ? () => {
                setFoilModalOpen(false);
                onOpenRelics();
              }
            : onJumpToTab
              ? () => {
                  setFoilModalOpen(false);
                  onJumpToTab('economy');
                }
              : undefined
        }
      />
    </div>
  );
}
