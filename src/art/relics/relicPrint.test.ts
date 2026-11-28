import { describe, expect, it } from 'vitest';
import { RELIC_CATALOG } from '../../engine/rpg/relics';
import { getRelicArtworkUrl } from './relicPrint';

describe('26 90s Collectible Relic WebP Prints (TASK-132)', () => {
  it('bundles a bespoke WebP illustration for every relic in RELIC_CATALOG', () => {
    expect(RELIC_CATALOG).toHaveLength(26);
    for (const relic of RELIC_CATALOG) {
      expect(getRelicArtworkUrl(relic.id), `missing relic print for ${relic.id}`).toBeTruthy();
    }
    expect(getRelicArtworkUrl('../secret')).toBeUndefined();
  });
});
