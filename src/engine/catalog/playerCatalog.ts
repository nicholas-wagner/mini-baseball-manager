import type { BatsHand, FieldPosition, ThrowsHand } from '../handedness/types';
import type { NationalityId } from '../nationalities/types';
import type { SeededRng } from '../rng/seededRng';
import type { PortraitTraits } from './appearance';
import entries from './players.json';

export interface CatalogPlayer {
  id: string;
  name: string;
  position: FieldPosition;
  bats: BatsHand;
  throws: ThrowsHand;
  nationalityId: NationalityId;
  hometown: string;
  traits: Required<PortraitTraits>;
}

export const PLAYER_CATALOG: readonly CatalogPlayer[] = entries as CatalogPlayer[];
export const PLAYER_CATALOG_BY_ID: ReadonlyMap<string, CatalogPlayer> = new Map(
  PLAYER_CATALOG.map(player => [player.id, player]),
);
export type DrawCatalogPlayer = (position: FieldPosition) => CatalogPlayer;

/** A private bag per position. Swap-and-pop samples without replacement in constant time. */
export function createCatalogDraw(rng: SeededRng): DrawCatalogPlayer {
  const bags = new Map<FieldPosition, CatalogPlayer[]>();
  for (const player of PLAYER_CATALOG) {
    const bag = bags.get(player.position) ?? [];
    bag.push(player);
    bags.set(player.position, bag);
  }
  return position => {
    const bag = bags.get(position);
    if (!bag?.length) throw new Error('No remaining catalog players at ' + position);
    const index = rng.int(0, bag.length - 1);
    const selected = bag[index];
    bag[index] = bag[bag.length - 1];
    bag.pop();
    return selected;
  };
}
