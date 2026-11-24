import type { PlayEvent } from '../models/playEvent';

export type OccupiedBase = 1 | 2 | 3;
const bases = [1, 2, 3] as const;

export function sacrificeAdvances(event: PlayEvent, before?: PlayEvent['basesAfter'], runsScored?: number) {
  if (event.outcome !== 'bunt_out' || event.outsAfter >= 3 || !before) return;
  if (event.batterId && event.basesAfter.includes(event.batterId)) return;
  const moving = bases.filter(from => {
    const id = before[from - 1];
    if (!id) return false;
    return from === 3 ? runsScored !== 0 && !event.basesAfter.includes(id) : event.basesAfter[from] === id;
  });
  return moving.length ? moving : undefined;
}
