import type { Player, PlayerRatings } from '../models/player';
import type { SeededRng } from '../rng/seededRng';

export type RelicRarity = 'common' | 'rare' | 'legendary';
export type RelicSlotCategory = 'bat' | 'glove' | 'cleats' | 'pitching' | 'flair';

export interface BaseballRelic {
  id: string;
  name: string;
  rarity: RelicRarity;
  category: RelicSlotCategory;
  flavor: string;
  bonuses: Partial<Record<keyof PlayerRatings, number>>;
}

export const MAX_RELICS_PER_PLAYER = 2;

/** 26 quirky 90s collectible baseball gear & relics amplified by your Equipment Manager! */
export const RELIC_CATALOG: readonly BaseballRelic[] = [
  { id: 'golden_ash_bat', name: 'Golden Ash Bat', rarity: 'legendary', category: 'bat', flavor: 'Hand-turned 1994 lumber with a loud sweet spot.', bonuses: { power: 5, contact: 2 } },
  { id: 'corked_sandlot_twig', name: 'Lightning-Struck Maple', rarity: 'rare', category: 'bat', flavor: 'Scorched barrel that sends fly balls soaring.', bonuses: { power: 4, gapPower: 3 } },
  { id: 'pine_tar_holo_rag', name: 'Holographic Pine Tar Rag', rarity: 'common', category: 'bat', flavor: 'Sticky 90s grip for zero bat slip.', bonuses: { contact: 3, eye: 1 } },
  { id: 'heavy_donut_ring', name: 'Neon On-Deck Donut', rarity: 'common', category: 'bat', flavor: 'Makes game swings feel weightless.', bonuses: { power: 3 } },
  { id: 'switch_grip_tape', name: 'Zebra-Stripe Grip Tape', rarity: 'common', category: 'bat', flavor: 'Radical neon wrap boosting bat control.', bonuses: { contact: 3, bunt: 3 } },
  { id: 'sweet_spot_mallet', name: 'Bone-Rubbed Barrel', rarity: 'rare', category: 'bat', flavor: 'Compressed grain for screaming line drives.', bonuses: { contact: 4, gapPower: 3 } },
  { id: 'grandpas_leather_mitt', name: "Grandpa's Broken-In Mitt", rarity: 'legendary', category: 'glove', flavor: 'Soft pocket that vacuums hot-shot grounders.', bonuses: { fielding: 5, range: 3 } },
  { id: 'web_gem_lace_kit', name: 'Turbo Web-Gem Laces', rarity: 'common', category: 'glove', flavor: 'Reinforced webbing for diving snow-cone grabs.', bonuses: { fielding: 3, arm: 1 } },
  { id: 'gold_stitch_catchers_mitt', name: 'Gold-Stitch Framing Mitt', rarity: 'rare', category: 'glove', flavor: 'Pops loud enough to steal borderline strikes.', bonuses: { fielding: 4, arm: 3, control: 2 } },
  { id: 'velvet_wrist_guard', name: '90s Terry Wristband', rarity: 'common', category: 'glove', flavor: 'Keeps throwing hands dry in July heat.', bonuses: { arm: 3, fielding: 1 } },
  { id: 'spring_loaded_cleats', name: 'Spring-Loaded Turf Cleats', rarity: 'legendary', category: 'cleats', flavor: 'Explosive first step out of the box and in the gaps.', bonuses: { speed: 5, range: 3 } },
  { id: 'lucky_neon_stirrups', name: 'Lucky Neon Stirrups', rarity: 'rare', category: 'cleats', flavor: 'High socks that charm the baseball gods.', bonuses: { speed: 3, luck: 5 } },
  { id: 'metal_spike_polish', name: 'Chrome Dirt Spikes', rarity: 'common', category: 'cleats', flavor: 'Bites into clay for crisp double-play pivots.', bonuses: { speed: 2, fielding: 2 } },
  { id: 'retro_high_tops', name: 'Pump-Up 90s High-Tops', rarity: 'rare', category: 'cleats', flavor: 'Inflatable tongue support for 9-inning stamina.', bonuses: { speed: 3, stamina: 4 } },
  { id: 'titanium_rosin_bag', name: 'Titanium Rosin Bag', rarity: 'legendary', category: 'pitching', flavor: 'Razor-sharp spin axis on breaking balls.', bonuses: { movement: 5, control: 3 } },
  { id: 'radar_gun_charm', name: 'Pocket Radar Keychain', rarity: 'rare', category: 'pitching', flavor: 'Squeezes extra zip onto late fastballs.', bonuses: { velocity: 4, stamina: 2 } },
  { id: 'knuckle_wax_tin', name: 'Old-Timer Finger Balm', rarity: 'common', category: 'pitching', flavor: 'Zero blisters, extra flutter on offspeed.', bonuses: { movement: 3, control: 1 } },
  { id: 'ice_sleeve_wrap', name: 'Cryo-Chill Arm Sleeve', rarity: 'common', category: 'pitching', flavor: 'Keeps starting pitchers fresh deep into games.', bonuses: { stamina: 4, velocity: 1 } },
  { id: 'painted_corner_chalk', name: 'Chalk-Line Bullpen Plate', rarity: 'rare', category: 'pitching', flavor: 'Surgical edge command in full counts.', bonuses: { control: 4, clutch: 2 } },
  { id: 'iridescent_90s_shades', name: 'Iridescent 90s Wrap Shades', rarity: 'rare', category: 'flair', flavor: 'Blocks high-noon glare and radiates cool.', bonuses: { eye: 4, fielding: 2, popularity: 4 } },
  { id: 'bubblegum_rally_bucket', name: 'Dugout Bubblegum Bucket', rarity: 'common', category: 'flair', flavor: 'Blowing giant pink bubbles eases pressure.', bonuses: { clutch: 3, luck: 3 } },
  { id: 'eye_black_lightning', name: 'Lightning-Bolt Eye Black', rarity: 'common', category: 'flair', flavor: 'Locks eyes onto 98-mph heaters.', bonuses: { eye: 3, contact: 1 } },
  { id: 'lucky_rally_cap', name: 'Inside-Out Rally Cap', rarity: 'rare', category: 'flair', flavor: 'Guaranteed 9th-inning comeback vibes.', bonuses: { clutch: 5, luck: 4 } },
  { id: 'hologram_pendant', name: '1994 Chrome Card Medallion', rarity: 'legendary', category: 'flair', flavor: 'Fan-favorite swagger under bright lights.', bonuses: { popularity: 6, clutch: 4, luck: 4 } },
  { id: 'sunflower_seed_pouch', name: 'Ranch Sunflower Seed Pouch', rarity: 'common', category: 'flair', flavor: 'Keeps bench patience dialed in.', bonuses: { eye: 2, stamina: 2 } },
  { id: 'vintage_batting_gloves', name: 'Neon-Trim Batting Gloves', rarity: 'rare', category: 'bat', flavor: 'Zero sting on inside heaters.', bonuses: { contact: 3, power: 3 } },
];

export function getRelicById(relicId: string): BaseballRelic | undefined {
  return RELIC_CATALOG.find((r) => r.id === relicId);
}

/** Equips a 90s Relic onto a player enforcing the 2-relic cap & duplicate check. */
export function equipRelicOnPlayer(
  player: Player,
  relicId: string,
): { equipped: boolean; reason?: string; player: Player } {
  const relic = getRelicById(relicId);
  if (!relic) return { equipped: false, reason: 'Unknown relic ID.', player };
  const current = player.equippedRelicIds ?? [];
  if (current.includes(relicId)) {
    return { equipped: false, reason: `${relic.name} is already equipped.`, player };
  }
  if (current.length >= MAX_RELICS_PER_PLAYER) {
    return {
      equipped: false,
      reason: `Max ${MAX_RELICS_PER_PLAYER} relics equipped — unequip one first.`,
      player,
    };
  }
  return {
    equipped: true,
    player: {
      ...player,
      equippedRelicIds: [...current, relicId],
    },
  };
}

export function unequipRelicFromPlayer(player: Player, relicId: string): Player {
  return {
    ...player,
    equippedRelicIds: (player.equippedRelicIds ?? []).filter((id) => id !== relicId),
  };
}

export type RelicFoilTier = 1 | 2 | 3;

export const RELIC_FOIL_MULTIPLIERS: Readonly<Record<RelicFoilTier, number>> = {
  1: 1.0,
  2: 1.25,
  3: 1.5,
};

/** Computes total rating bonuses from a player's equipped relics, amplified by Equipment Manager & Foil Tier. */
export function evaluatePlayerRelicBonuses(
  player: Pick<Player, 'equippedRelicIds'>,
  equipmentManagerMultiplier = 1.0,
  foilTierByRelicId?: Readonly<Record<string, RelicFoilTier>>,
): Record<keyof PlayerRatings, number> {
  const totals: Record<keyof PlayerRatings, number> = {
    contact: 0,
    power: 0,
    gapPower: 0,
    eye: 0,
    bunt: 0,
    velocity: 0,
    movement: 0,
    control: 0,
    stamina: 0,
    speed: 0,
    fielding: 0,
    range: 0,
    arm: 0,
    clutch: 0,
    luck: 0,
    popularity: 0,
    potential: 0,
  };
  const scale = Math.max(1.0, equipmentManagerMultiplier);

  for (const relicId of player.equippedRelicIds ?? []) {
    const relic = getRelicById(relicId);
    if (!relic) continue;
    const foilScale = RELIC_FOIL_MULTIPLIERS[foilTierByRelicId?.[relicId] ?? 1];
    for (const [key, delta] of Object.entries(relic.bonuses)) {
      if (typeof delta === 'number') {
        totals[key as keyof PlayerRatings] += Math.round(delta * scale * foilScale);
      }
    }
  }
  return totals;
}

/** Rolls a seeded 90s Relic loot drop (weighted Common 60% / Rare 30% / Legendary 10%). */
export function rollVintageRelicDrop(rng: SeededRng): BaseballRelic {
  const r = rng.next();
  const rarity: RelicRarity = r < 0.6 ? 'common' : r < 0.9 ? 'rare' : 'legendary';
  const pool = RELIC_CATALOG.filter((item) => item.rarity === rarity);
  return rng.pick(pool);
}
