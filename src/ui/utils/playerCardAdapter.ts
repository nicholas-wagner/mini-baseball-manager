import type { CardRarity, PortraitMood } from '../../art/portraits/types';
import {
  computePlayerOverall,
  isPitcherPosition,
  MARKET_TIER_LABELS,
  PITCH_TYPE_SHORT_LABELS,
  SPECIALIST_LABELS,
  type FormState,
  type Player,
} from '../../engine/models/player';
import type { BaseballCardPlayer } from '../components/FlipBaseballCard';

/** Maps rolling player streak state onto retro portrait facial mood expressions. */
export function formStateToCardMood(formState: FormState): PortraitMood {
  if (formState === 'blazing' || formState === 'hot') return 'fired_up';
  if (formState === 'cold' || formState === 'frozen') return 'sweating';
  return 'happy';
}

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

  const pitchPill = isPitcherPosition(player.position) && player.pitchArsenal
    ? `★ ${PITCH_TYPE_SHORT_LABELS[player.pitchArsenal.favoritePitch]} (${player.pitchArsenal.repertoire.length}P)`
    : `Crush ${PITCH_TYPE_SHORT_LABELS[player.batterPitchProfile.favoritePitch]}`;

  const badgePills =
    player.equippedPowerIds.length > 0
      ? player.equippedPowerIds
      : [SPECIALIST_LABELS[player.specialistArchetype], MARKET_TIER_LABELS[player.marketTier], pitchPill];

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
    specialPowers: badgePills,
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
