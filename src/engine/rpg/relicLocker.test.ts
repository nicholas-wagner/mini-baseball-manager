import { describe, expect, it } from 'vitest';
import { createClub } from '../gm/rosterFactory';
import { createSeededRng } from '../rng/seededRng';
import { evaluatePlayerRelicBonuses, RELIC_CATALOG } from './relics';
import {
  addRelicToClubLocker,
  buildRelicFoilTierMap,
  equipRelicFromClubLocker,
  fuseDuplicateRelic,
  getRelicOwnershipUsage,
  getRotatingVintageRelicShop,
  purchaseVintageRelic,
  recycleSpareRelic,
  resolveClubRelicInventory,
  STARTER_CLUB_RELIC_IDS,
} from './relicLocker';

describe('Collectible Club Relic Locker, Role-Aware Slots & Foil Fusion (TASK-131)', () => {
  it('enforces real inventory ownership, role compatibility, teammate swaps, foil fusion, and cash recycling', () => {
    const rng = createSeededRng(13101);
    const club = createClub(rng, {
      id: 'relic-club',
      city: 'Retro',
      name: 'Collectors',
      mascot: 'Pack',
      colors: { primary: '#E63946', secondary: '#1D3557', accent: '#FFD166', monogram: 'RC' },
      leagueTier: 'rookie',
      isHuman: true,
    });

    // Starts with 2 heirloom relics (1 hitter, 1 pitcher)
    const starterInv = resolveClubRelicInventory(club);
    expect(starterInv.map((e) => e.relicId)).toEqual(STARTER_CLUB_RELIC_IDS);

    const hitter = club.roster.find((p) => p.position !== 'SP' && p.position !== 'RP')!;
    const hitter2 = club.roster.find((p) => p.id !== hitter.id && p.position !== 'SP' && p.position !== 'RP')!;
    const pitcher = club.roster.find((p) => p.position === 'SP' || p.position === 'RP')!;

    // Cannot equip unowned relic
    const unowned = equipRelicFromClubLocker(club, hitter.id, 'golden_ash_bat');
    expect(unowned.equipped).toBe(false);
    expect(unowned.reason).toMatch(/do not own/i);

    // Role compatibility: pitcher cannot equip a bat; hitter cannot equip pitching gear
    expect(equipRelicFromClubLocker(club, pitcher.id, 'pine_tar_holo_rag').equipped).toBe(false);
    expect(equipRelicFromClubLocker(club, hitter.id, 'knuckle_wax_tin').equipped).toBe(false);

    // Equip owned pine_tar_holo_rag onto hitter 1
    const eq1 = equipRelicFromClubLocker(club, hitter.id, 'pine_tar_holo_rag');
    expect(eq1.equipped).toBe(true);
    expect(getRelicOwnershipUsage(eq1.club, 'pine_tar_holo_rag').spare).toBe(0);

    // Equipping the same 1-copy relic onto hitter 2 fails unless swapFromHolder is enabled
    expect(equipRelicFromClubLocker(eq1.club, hitter2.id, 'pine_tar_holo_rag').equipped).toBe(false);
    const swapped = equipRelicFromClubLocker(eq1.club, hitter2.id, 'pine_tar_holo_rag', {
      swapFromHolder: true,
    });
    expect(swapped.equipped).toBe(true);
    expect(swapped.swappedFromName).toBe(hitter.name);

    // Add duplicate copy -> Fuse 1★ -> 2★★ boosts evaluated stats cleanly!
    const withDup = addRelicToClubLocker(swapped.club, 'pine_tar_holo_rag', 1);
    const baseBonuses = evaluatePlayerRelicBonuses(
      withDup.roster.find((p) => p.id === hitter2.id)!,
      1.0,
      buildRelicFoilTierMap(withDup),
    );
    const fused = fuseDuplicateRelic(withDup, 'pine_tar_holo_rag');
    expect(fused.fused).toBe(true);
    expect(fused.newFoilTier).toBe(2);
    const fusedBonuses = evaluatePlayerRelicBonuses(
      fused.club.roster.find((p) => p.id === hitter2.id)!,
      1.0,
      buildRelicFoilTierMap(fused.club),
    );
    expect(fusedBonuses.contact).toBeGreaterThan(baseBonuses.contact);

    // Recycle spare copy for cash
    const withExtra = addRelicToClubLocker(fused.club, 'knuckle_wax_tin', 1);
    const recycled = recycleSpareRelic(withExtra, 'knuckle_wax_tin');
    expect(recycled.recycled).toBe(true);
    expect(recycled.cashAwarded).toBeGreaterThan(0);
    expect(recycled.club.economy.cash).toBe(withExtra.economy.cash + recycled.cashAwarded);
  });

  it('provides a deterministic 3-item rotating Vintage Gear Shop and buys directly into Locker', () => {
    expect(RELIC_CATALOG).toHaveLength(26);
    const offers = getRotatingVintageRelicShop(1994, 0, 'aa');
    expect(offers).toHaveLength(3);
    expect(offers).toEqual(getRotatingVintageRelicShop(1994, 0, 'aa'));

    const club = createClub(createSeededRng(13102), {
      id: 'shop-club',
      city: 'Card',
      name: 'Sharks',
      mascot: 'Fin',
      colors: { primary: '#1D3557', secondary: '#00E5FF', accent: '#FFD166', monogram: 'CS' },
      leagueTier: 'aa',
      isHuman: true,
    });
    const rich = { ...club, economy: { ...club.economy, cash: 10_000 } };
    const bought = purchaseVintageRelic(rich, offers[1].relic.id);
    expect(bought.purchased).toBe(true);
    expect(getRelicOwnershipUsage(bought.club, offers[1].relic.id).owned).toBeGreaterThanOrEqual(1);
    expect(bought.club.economy.cash).toBe(10_000 - offers[1].price);
  });
});
