import type { EffectiveBatSide, ThrowsHand } from '../../engine/handedness/types';
import { CLIP_DURATIONS, PITCH_RELEASE_PHASE, type CharacterAnimClip } from '../characters/animationState';
import { getPitchTrailVisual, pitchSeconds, type PitchFlight } from '../playback/pitchFlight';
import { BALL_TRAJECTORY_PRESETS, type BallTrajectorySpec, type BallVfxStyle } from './ballTrajectory';

export interface ShowcaseDelivery {
  pitcherClip: CharacterAnimClip;
  pitch: BallTrajectorySpec;
  hit: BallTrajectorySpec | null;
  releaseAt: number;
  swingAt: number;
  plateAt: number;
}

export const MOUND = { x: 0, y: .24, z: -10.2 };

// Times are seconds from pressing play. The same contact point ends the pitch
// and starts the batted ball, including when the hitter changes boxes.
export function createDelivery(
  style: BallVfxStyle, throws: ThrowsHand, bats: EffectiveBatSide,
  selectedPitcherClip: CharacterAnimClip, batterClip: CharacterAnimClip,
  stature = { pitcher: 1, batter: 1, catcher: 1 },
  pitchInfo?: PitchFlight,
): ShowcaseDelivery {
  const pitcherClip = selectedPitcherClip === 'pitch_super' || selectedPitcherClip === 'practice_bullpen'
    ? selectedPitcherClip : 'pitch_windup';
  const preset = BALL_TRAJECTORY_PRESETS[style];
  const batted = style === 'moonshot_hr' || style === 'line_drive' || style === 'ninja_bunt';
  const handHeight = (y: number, scale: number, ground: number) => y + (y - ground) * (scale - 1);
  const hit = batted ? { ...preset, start: { ...preset.start,
    x: bats === 'R' ? -0.44 : 0.44, y: handHeight(preset.start.y, stature.batter, 0.04) } } : null;
  const incoming = hit ? BALL_TRAJECTORY_PRESETS.fastball : preset;
  const pitch = {
    ...incoming,
    pitchFlight: pitchInfo && { ...pitchInfo, throws },
    durationSec: pitchInfo ? pitchSeconds(pitchInfo.mph) : incoming.durationSec,
    start: { x: throws === 'R' ? -0.36 : 0.36, y: handHeight(1.04, stature.pitcher, 0.24), z: -10.05 },
    end: hit?.start ?? { x: -0.31, y: handHeight(0.54, stature.catcher, 0.04), z: 1.1 },
  };
  const releaseAt = CLIP_DURATIONS[pitcherClip] * PITCH_RELEASE_PHASE;
  const plateAt = releaseAt + pitch.durationSec;
  const swingAt = plateAt - CLIP_DURATIONS[batterClip] * (batterClip === 'bat_bunt' ? 0.5 : 0.45);
  return { pitcherClip, pitch, hit, releaseAt, swingAt, plateAt };
}

export function sampleDeliveryFlight(play: ShowcaseDelivery, time: number, reducedMotion = false) {
  if (time < play.releaseAt) return null;
  if (time < play.plateAt) {
    const pitch = play.pitch.pitchFlight;
    return { spec: play.pitch, progress: (time - play.releaseAt) / play.pitch.durationSec,
      visual: pitch && getPitchTrailVisual(pitch.pitchType, reducedMotion) };
  }
  if (play.hit && time < play.plateAt + play.hit.durationSec) {
    return { spec: play.hit, progress: (time - play.plateAt) / play.hit.durationSec };
  }
  return null;
}
