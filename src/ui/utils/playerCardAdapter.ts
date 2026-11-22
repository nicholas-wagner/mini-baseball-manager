import type { CardRarity } from '../../art/portraits/types';
import { computePlayerOverall, isPitcherPosition, type Player } from '../../engine/models/player';
import type { BaseballCardPlayer } from '../components/FlipBaseballCard';

/** Adapts a canonical domain `Player` to `<FlipBaseballCard />` props. */
export function toBaseballCardPlayer(
  player: Player,
  rarityOverride?: CardRarity,
): BaseballCardPlayer {
  const overall = computePlayerOverall(player);
  const pitchingStat = isPitcherPosition(player.position)
    ? Math.round(
        player.ratings.velocity * 0.4 +
          player.ratings.movement * 0.35 +
          player.ratings.control * 0.25,
      )
    : player.ratings.velocity;

  return {
    id: player.id,
    name: player.name,
    nickname: player.nickname,
    position: player.position,
    bats: player.bats,
    throws: player.throws,
    jerseyNumber: player.jerseyNumber,
    nationalityId: player.nationalityId,
    hometown: player.hometown,
    overall,
    rarity: rarityOverride ?? player.rarity,
    level: player.level,
    popularity: player.ratings.popularity,
    traits: player.traits,
    specialPowers:
      player.equippedPowerIds.length > 0 ? player.equippedPowerIds : ['Sandlot Grit'],
    stats: {
      contact: player.ratings.contact,
      power: player.ratings.power,
      speed: player.ratings.speed,
      pitching: pitchingStat,
      fielding: player.ratings.fielding,
    },
    bio: player.bio,
  };
}
