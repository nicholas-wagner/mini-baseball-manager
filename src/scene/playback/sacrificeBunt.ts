import type { OccupiedBase } from '../../engine/simulation/sacrificeAdvances';

export function describeBuntAdvance(advances: readonly OccupiedBase[]) {
  if (advances.length > 1) return advances.includes(3) ? 'Runners advance, one scores' : 'Runners to second and third';
  return { 1: 'Runner to second', 2: 'Runner to third', 3: 'Runner scores' }[advances[0]];
}
