import type { PlayEvent } from '../models/playEvent';
import { getCurrentLeverage, type GameSessionState } from './gameState';
import type { LiveActionCue } from './liveActionAdvisor';

export interface SmartAutoPauseDecision {
  pause: boolean;
  reason: string | null;
}

export interface ComicPopArtBanner {
  title: string;
  subtitle: string;
  coachQuip: string;
  bg: string;
  text: string;
  confetti: boolean;
}

const BIG_PLAY_OUTCOMES: Readonly<Record<string, string>> = {
  home_run: 'Home Run — enjoy the trot!',
  triple: 'Triple into the gap!',
  double: 'Extra-base double!',
  double_play: 'Inning-shaking double play!',
  strikeout: 'Punch-out strikeout!',
};

const URGENT_CUE_REASONS: Readonly<Record<string, string>> = {
  pitcher_gassed: 'Coach Pops: Pitcher is tired — check your bullpen!',
  power_ready: 'Coach Pops: Special Power is charged!',
  pinch_hit_opportunity: 'Coach Pops: Great pinch-hit spot!',
  steal_opportunity: 'Coach Pops: Green light to steal!',
};

function checkEventAutoPause(event: PlayEvent | null): SmartAutoPauseDecision | null {
  if (!event) return null;
  if (event.specialPowerTriggered) {
    return { pause: true, reason: `Special Power: ${event.specialPowerTriggered.calloutText}` };
  }
  if (event.type === 'stolen_base_attempt') {
    return { pause: true, reason: 'Stolen base attempt!' };
  }
  const bigReason = event.outcome ? BIG_PLAY_OUTCOMES[event.outcome] : undefined;
  if (bigReason) {
    return { pause: true, reason: bigReason };
  }
  return null;
}

/**
 * Decides whether Smart Watch mode should smoothly continue cruising past routine pitches
 * or pause right on big plays, Coach Pops alerts, or late 2-strike clutch pitches.
 */
export function shouldSmartAutoPause(
  session: GameSessionState,
  lastEvent: PlayEvent | null,
  cue: LiveActionCue,
): SmartAutoPauseDecision {
  if (session.status === 'completed') {
    return { pause: true, reason: 'Ballgame complete!' };
  }
  const eventStop = checkEventAutoPause(lastEvent);
  if (eventStop) return eventStop;

  const cueReason = URGENT_CUE_REASONS[cue.kind];
  if (cueReason) {
    return { pause: true, reason: cueReason };
  }
  const { leverageIndex } = getCurrentLeverage(session);
  const isFinalInningClose =
    session.inning >= session.regulationInnings &&
    Math.abs(session.away.score - session.home.score) <= 2;
  if ((leverageIndex >= 1.4 || isFinalInningClose) && session.strikes === 2) {
    return { pause: true, reason: '2-strike clutch pitch — take the wheel!' };
  }
  return { pause: false, reason: null };
}

function isWalkOffWinner(event: PlayEvent, session: GameSessionState): boolean {
  return (
    session.status === 'completed' &&
    event.half === 'BOT' &&
    session.inning >= session.regulationInnings &&
    session.home.score > session.away.score
  );
}

const OUTCOME_POP_ART_TABLE: Readonly<
  Record<string, { title: string; coachQuip: string; bg: string; text: string; confetti: boolean }>
> = {
  home_run: {
    title: '💥 KA-POW!! MOONSHOT HOME RUN!!',
    coachQuip: 'Coach Pops: "Goodnight, baseball! Somebody check the parking lot!"',
    bg: '#FFC300',
    text: '#181B2C',
    confetti: true,
  },
  triple: {
    title: '💨 LIGHTNING TRIPLE!!',
    coachQuip: 'Coach Pops: "Look at those wheels fly around the bases!"',
    bg: '#00E5FF',
    text: '#181B2C',
    confetti: false,
  },
  double_play: {
    title: '🔥 TWIN KILLING! 6-4-3 DOUBLE PLAY!',
    coachQuip: 'Coach Pops: "Silky-smooth leather! Two for the price of one!"',
    bg: '#1D3557',
    text: '#FFD166',
    confetti: false,
  },
  strikeout: {
    title: '⚡ STRIKE THREE — SIT DOWN!',
    coachQuip: 'Coach Pops: "Painted the corner! Grab some pine!"',
    bg: '#FF4D6D',
    text: '#FFFFFF',
    confetti: false,
  },
};

function buildStealBanner(event: PlayEvent): ComicPopArtBanner {
  const caught = event.outsAfter > event.outsBefore;
  return {
    title: caught ? '🚨 CAUGHT STEALING! NABBED!' : '⚡ SAFE! STOLEN BASE!',
    subtitle: event.commentary,
    coachQuip: caught
      ? 'Coach Pops: "Laser throw by the catcher — gunned down!"'
      : 'Coach Pops: "Dust cloud slide! Speed kills in the sandlot!"',
    bg: caught ? '#E63946' : '#2FB356',
    text: '#FFFFFF',
    confetti: false,
  };
}

/** Builds punchy 90s Saturday-morning cartoon pop-art callouts + Coach Pops dugout quips. */
export function buildComicPopArtBanner(
  event: PlayEvent | null,
  session: GameSessionState,
): ComicPopArtBanner | null {
  if (!event) return null;
  if (isWalkOffWinner(event, session)) {
    return {
      title: '🎆 WALK-OFF WINNER!!',
      subtitle: event.commentary,
      coachQuip: 'Coach Pops: "Mob the plate, kids! That’s Sandlot magic!!"',
      bg: '#FFC300',
      text: '#181B2C',
      confetti: true,
    };
  }
  if (event.specialPowerTriggered) {
    return {
      title: `⚡ ${event.specialPowerTriggered.calloutText}`,
      subtitle: event.commentary,
      coachQuip: 'Coach Pops: "WHOA! Pure 1994 Saturday-morning superpower!"',
      bg: event.specialPowerTriggered.vfxColor,
      text: '#181B2C',
      confetti: true,
    };
  }
  if (event.type === 'stolen_base_attempt') {
    return buildStealBanner(event);
  }
  const preset = event.outcome ? OUTCOME_POP_ART_TABLE[event.outcome] : undefined;
  return preset ? { ...preset, subtitle: event.commentary } : null;
}
