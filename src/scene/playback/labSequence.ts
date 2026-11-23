import { diamondPlay, type DiamondPlayKind } from './diamondPlay';
import { PLATE_AND_STEALS } from './plateAndSteals';
import { finishPlay } from './teamReactions';

export type LabSequence =
  | DiamondPlayKind
  | 'battery_reel'
  | 'plate_reel'
  | 'relay_home'
  | 'third_out'
  | 'walkoff';

export function labSequence(kind: LabSequence) {
  switch (kind) {
    case 'battery_reel':
      return [
        diamondPlay('called_pitch', undefined, undefined, undefined, { pitchType: 'four_seam', mph: 98 }),
        diamondPlay('missed_pitch', undefined, undefined, undefined, { pitchType: 'changeup', mph: 77 }),
        diamondPlay('swinging_third', undefined, undefined, undefined, { pitchType: 'slider', mph: 86 }),
      ];
    case 'plate_reel':
      return PLATE_AND_STEALS.map((k) => diamondPlay(k));
    case 'relay_home':
      return [finishPlay(diamondPlay('double'), false, false, 2)];
    case 'walkoff':
      return [finishPlay(diamondPlay('single'), false, true, 3)];
    case 'third_out':
      return [finishPlay(diamondPlay('ground_out'), true, false)];
    default:
      return [diamondPlay(kind)];
  }
}
