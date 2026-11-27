import type { DefensiveShiftId } from '../../engine/simulation/winProbability';
import type { Vec3 } from '../camera/cameraRig';
import { CATCHER_HOME, OUTFIELD_STARTS, PITCHING_RUBBER } from './diamondLayout';
import type { DiamondDefenderPos } from './eventChoreographer';

const STANDARD_COORDS: Readonly<Record<DiamondDefenderPos, Vec3>> = {
  P: { ...PITCHING_RUBBER },
  C: { ...CATCHER_HOME },
  '1B': { x: 8.8, y: 0.04, z: -11.4 },
  '2B': { x: 4.6, y: 0.04, z: -17.6 },
  '3B': { x: -8.8, y: 0.04, z: -11.4 },
  SS: { x: -4.6, y: 0.04, z: -17.6 },
  LF: { ...OUTFIELD_STARTS.LF },
  CF: { ...OUTFIELD_STARTS.CF },
  RF: { ...OUTFIELD_STARTS.RF },
};

const SHIFT_OVERRIDES: Readonly<Record<DefensiveShiftId, Partial<Record<DiamondDefenderPos, Vec3>>>> = {
  standard: {},
  infield_in: {
    '1B': { x: 8.2, y: 0.04, z: -8.4 },
    '2B': { x: 4.3, y: 0.04, z: -14.4 },
    SS: { x: -4.3, y: 0.04, z: -14.4 },
    '3B': { x: -8.2, y: 0.04, z: -8.4 },
  },
  no_doubles: {
    '1B': { x: 10.2, y: 0.04, z: -11.4 },
    '3B': { x: -10.2, y: 0.04, z: -11.4 },
    LF: { x: -15.6, y: 0.04, z: OUTFIELD_STARTS.LF.z - 3.6 },
    CF: { x: 0, y: 0.04, z: OUTFIELD_STARTS.CF.z - 3.6 },
    RF: { x: 15.6, y: 0.04, z: OUTFIELD_STARTS.RF.z - 3.6 },
  },
  bunt_defense: {
    '1B': { x: 7.4, y: 0.04, z: -7.0 },
    '3B': { x: -7.4, y: 0.04, z: -7.0 },
    '2B': { x: 6.4, y: 0.04, z: -14.2 },
    SS: { x: -1.6, y: 0.04, z: -18.6 },
  },
};

const HOLD_FIRST_BASE_COORD: Vec3 = { x: 9.2, y: 0.04, z: -10.1 };

const DEFENDER_POSITIONS: readonly DiamondDefenderPos[] = [
  'P',
  'C',
  '1B',
  '2B',
  '3B',
  'SS',
  'LF',
  'CF',
  'RF',
];

/**
 * Pure WebGL-free 3D world coordinates for all 9 fielders under the active
 * defensive alignment, plus 1B runner-hold positioning when first base is occupied.
 */
export function getShiftDefenderCoords(
  shift: DefensiveShiftId,
  bases?: readonly (string | null)[],
): Record<DiamondDefenderPos, Vec3> {
  const overrides = SHIFT_OVERRIDES[shift] ?? SHIFT_OVERRIDES.standard;
  const coords = {} as Record<DiamondDefenderPos, Vec3>;
  for (const pos of DEFENDER_POSITIONS) {
    const vec = overrides[pos] ?? STANDARD_COORDS[pos];
    coords[pos] = { x: vec.x, y: vec.y, z: vec.z };
  }
  if (bases?.[0]) {
    coords['1B'] = { ...HOLD_FIRST_BASE_COORD };
  }
  return coords;
}
