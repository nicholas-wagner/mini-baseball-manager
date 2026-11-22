import { describe, expect, it } from 'vitest';
import type { FieldPosition } from '../handedness/types';
import {
  LEAGUE_TIER_ORDER,
  type Club,
  type LeagueTierId,
} from '../models/club';
import {
  createDefaultCoachStaff,
  createManagerProfile,
} from '../models/manager';
import {
  isScoringOrHitOutcome,
  type AtBatOutcome,
} from '../models/playEvent';
import {
  computePlayerOverall,
  createEmptySeasonStats,
  deriveCardRarity,
  isPitcherPosition,
  rollPlayerPortraitTraits,
} from '../models/player';
import { createSeededRng } from '../rng/seededRng';
import {
  buildOptimalLineup,
  createClub,
  createPlayer,
  validateLineup,
  type CreateClubOptions,
} from './rosterFactory';

const BASE_CLUB_OPTIONS: CreateClubOptions = {
  id: 'club-sandlot-comets',
  city: 'Sandlot',
  name: 'Comets',
  mascot: 'Rocket Dog',
  colors: {
    primary: '#E63946',
    secondary: '#1D3557',
    accent: '#FFD166',
    monogram: 'SC',
  },
  leagueTier: 'rookie',
  isHuman: true,
};

function countByPosition(club: Club): Record<FieldPosition, number> {
  const counts: Record<FieldPosition, number> = {
    SP: 0,
    RP: 0,
    C: 0,
    '1B': 0,
    '2B': 0,
    '3B': 0,
    SS: 0,
    LF: 0,
    CF: 0,
    RF: 0,
  };
  for (const player of club.roster) {
    counts[player.position] += 1;
  }
  return counts;
}

describe('TASK-013 — Canonical Domain Models & Seeded Club/Roster Factory', () => {
  it('produces byte-identical clubs, rosters, traits, lineups, and staffs for the same seed', () => {
    const clubA = createClub(createSeededRng(1994), BASE_CLUB_OPTIONS);
    const clubB = createClub(createSeededRng(1994), BASE_CLUB_OPTIONS);

    expect(clubA).toEqual(clubB);
    expect(clubA.id).toBe('club-sandlot-comets');
    expect(clubA.isHuman).toBe(true);
    expect(clubA.aiArchetype).toBe('moneyball');
    expect(clubA.stadium.name).toContain('Sandlot');
    expect(clubA.stadium.districtTiles.length).toBeGreaterThan(0);
    expect(clubA.economy.cash).toBeGreaterThan(0);

    const otherSeedClub = createClub(createSeededRng(1995), BASE_CLUB_OPTIONS);
    expect(otherSeedClub.roster.map((p) => p.id)).not.toEqual(
      clubA.roster.map((p) => p.id),
    );
  });

  it('builds a balanced 18-man roster with unique jerseys, required positions, rotation, and bullpen', () => {
    const club = createClub(createSeededRng(777), BASE_CLUB_OPTIONS);

    expect(club.roster).toHaveLength(18);

    const uniqueJerseys = new Set(club.roster.map((p) => p.jerseyNumber));
    expect(uniqueJerseys.size).toBe(18);
    for (const num of uniqueJerseys) {
      expect(num).toBeGreaterThanOrEqual(1);
      expect(num).toBeLessThanOrEqual(99);
    }

    const posCounts = countByPosition(club);
    const requiredFielders: FieldPosition[] = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];
    for (const pos of requiredFielders) {
      expect(posCounts[pos]).toBeGreaterThanOrEqual(1);
    }

    expect(posCounts.SP).toBe(3);
    expect(posCounts.RP).toBe(3);
    expect(club.rotationIds).toHaveLength(3);
    expect(club.bullpenIds).toHaveLength(3);

    const positionPlayerCount = club.roster.filter((p) => !isPitcherPosition(p.position)).length;
    expect(positionPlayerCount).toBe(12);

    const spIds = new Set(club.roster.filter((p) => p.position === 'SP').map((p) => p.id));
    const rpIds = new Set(club.roster.filter((p) => p.position === 'RP').map((p) => p.id));
    for (const id of club.rotationIds) expect(spIds.has(id)).toBe(true);
    for (const id of club.bullpenIds) expect(rpIds.has(id)).toBe(true);

    for (const player of club.roster) {
      expect(player.batterPitchProfile.favoritePitch).not.toBe(player.batterPitchProfile.weakPitch);
      expect(player.totalRatingBudget).toBeGreaterThan(300);
      if (player.position === 'SP') {
        expect(player.pitchArsenal!.repertoire.length).toBeGreaterThanOrEqual(4);
        expect(player.pitchArsenal!.repertoire.length).toBeLessThanOrEqual(5);
      } else if (player.position === 'RP') {
        expect(player.pitchArsenal!.repertoire.length).toBeGreaterThanOrEqual(2);
        expect(player.pitchArsenal!.repertoire.length).toBeLessThanOrEqual(3);
      } else {
        expect(player.pitchArsenal).toBeUndefined();
      }
    }
  });

  it('respects forced nationality and position throwing handedness invariants in createPlayer', () => {
    const rng = createSeededRng(2026);
    const jpnAce = createPlayer(rng, {
      position: 'SP',
      tier: 'aa',
      forcedNationalityId: 'JPN',
      jerseyNumber: 18,
    });
    expect(jpnAce.nationalityId).toBe('JPN');
    expect(jpnAce.jerseyNumber).toBe(18);
    expect(jpnAce.seasonStats).toEqual(createEmptySeasonStats());
    expect(jpnAce.careerStats).toEqual(createEmptySeasonStats());
    expect(jpnAce.favoritePosition).toBe('SP');
    expect(['single_position', 'swingman_pitcher']).toContain(jpnAce.flexibilityProfile);

    for (let i = 0; i < 20; i += 1) {
      const ss = createPlayer(createSeededRng(500 + i), { position: 'SS', tier: 'rookie' });
      const secondBase = createPlayer(createSeededRng(600 + i), { position: '2B', tier: 'rookie' });
      const thirdBase = createPlayer(createSeededRng(700 + i), { position: '3B', tier: 'rookie' });
      expect(ss.throws).toBe('R');
      expect(secondBase.throws).toBe('R');
      expect(thirdBase.throws).toBe('R');
    }

    const traitsA = rollPlayerPortraitTraits(createSeededRng(12), 12);
    const traitsB = rollPlayerPortraitTraits(createSeededRng(12), 12);
    expect(traitsA).toEqual(traitsB);
    expect(traitsA.seed).toBe(12);
  });

  it('validates clean lineups and catches invalid lineup configurations', () => {
    const club = createClub(createSeededRng(909), BASE_CLUB_OPTIONS);
    expect(validateLineup(club)).toEqual({ valid: true, errors: [] });

    // Wrong length
    const shortClub = { ...club, lineup: club.lineup.slice(0, 8) };
    const shortResult = validateLineup(shortClub);
    expect(shortResult.valid).toBe(false);
    expect(shortResult.errors.some((e) => /9/i.test(e))).toBe(true);

    // Out-of-sequence orderIndex
    const badIndexClub = {
      ...club,
      lineup: club.lineup.map((slot, idx) =>
        idx === 2 ? { ...slot, orderIndex: 7 } : slot,
      ),
    };
    expect(validateLineup(badIndexClub).valid).toBe(false);

    // Duplicate player ID
    const dupPlayerClub = {
      ...club,
      lineup: club.lineup.map((slot, idx) =>
        idx === 1 ? { ...slot, playerId: club.lineup[0].playerId } : slot,
      ),
    };
    const dupResult = validateLineup(dupPlayerClub);
    expect(dupResult.valid).toBe(false);
    expect(dupResult.errors.some((e) => /duplicate player/i.test(e))).toBe(true);

    // Unknown player ID
    const unknownClub = {
      ...club,
      lineup: club.lineup.map((slot, idx) =>
        idx === 0 ? { ...slot, playerId: 'non-existent-id' } : slot,
      ),
    };
    expect(validateLineup(unknownClub).valid).toBe(false);

    // Pitcher placed into batting lineup
    const pitcher = club.roster.find((p) => p.position === 'SP')!;
    const pitcherInLineup = {
      ...club,
      lineup: club.lineup.map((slot, idx) =>
        idx === 8 ? { ...slot, playerId: pitcher.id } : slot,
      ),
    };
    const pitcherResult = validateLineup(pitcherInLineup);
    expect(pitcherResult.valid).toBe(false);
    expect(pitcherResult.errors.some((e) => /pitcher/i.test(e))).toBe(true);

    // Duplicate/missing defensive position
    const dupDefenseClub = {
      ...club,
      lineup: club.lineup.map((slot, idx) =>
        slot.defensivePosition === 'DH'
          ? { ...slot, defensivePosition: 'C' as const }
          : idx === 99
            ? slot
            : slot,
      ),
    };
    const defenseResult = validateLineup(dupDefenseClub);
    expect(defenseResult.valid).toBe(false);
    expect(defenseResult.errors.some((e) => /defensive/i.test(e))).toBe(true);
  });

  it('orders buildOptimalLineup cleanly with core sluggers in the middle of the order', () => {
    const club = createClub(createSeededRng(3333), {
      ...BASE_CLUB_OPTIONS,
      aiArchetype: 'mashers',
    });
    const rebuilt = buildOptimalLineup(club.roster);
    expect(validateLineup({ roster: club.roster, lineup: rebuilt })).toEqual({
      valid: true,
      errors: [],
    });
    expect(rebuilt.map((s) => s.orderIndex)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('scales average OVR monotonically across league tiers and clamps ratings/rarity', () => {
    const averageTierOvr = (tier: LeagueTierId): number => {
      const rng = createSeededRng(4200 + LEAGUE_TIER_ORDER.indexOf(tier) * 17);
      let sum = 0;
      const count = 40;
      for (let i = 0; i < count; i += 1) {
        const pos: FieldPosition = i % 3 === 0 ? 'SP' : i % 5 === 0 ? 'RP' : 'CF';
        const player = createPlayer(rng, { position: pos, tier });
        sum += computePlayerOverall(player);
      }
      return sum / count;
    };

    const rookieAvg = averageTierOvr('rookie');
    const aaAvg = averageTierOvr('aa');
    const majorsAvg = averageTierOvr('majors');

    expect(rookieAvg).toBeLessThan(aaAvg);
    expect(aaAvg).toBeLessThan(majorsAvg);

    const eliteSpOvr = computePlayerOverall({
      position: 'SP',
      ratings: {
        contact: 20,
        power: 20,
        eye: 20,
        bunt: 20,
        velocity: 99,
        movement: 99,
        control: 99,
        stamina: 99,
        speed: 50,
        fielding: 80,
        arm: 80,
        clutch: 95,
        popularity: 90,
        potential: 99,
      },
    });
    const eliteRpOvr = computePlayerOverall({
      position: 'RP',
      ratings: {
        contact: 20,
        power: 20,
        eye: 20,
        bunt: 20,
        velocity: 98,
        movement: 95,
        control: 92,
        stamina: 35,
        speed: 50,
        fielding: 75,
        arm: 85,
        clutch: 98,
        popularity: 80,
        potential: 95,
      },
    });
    const minHitterOvr = computePlayerOverall({
      position: '1B',
      ratings: {
        contact: -10,
        power: 0,
        eye: 0,
        bunt: 0,
        velocity: 0,
        movement: 0,
        control: 0,
        stamina: 0,
        speed: 0,
        fielding: 0,
        arm: 0,
        clutch: 0,
        popularity: 0,
        potential: 0,
      },
    });

    expect(eliteSpOvr).toBeGreaterThanOrEqual(90);
    expect(eliteRpOvr).toBeGreaterThanOrEqual(90);
    expect(minHitterOvr).toBe(1);

    expect(deriveCardRarity(60)).toBe('rookie');
    expect(deriveCardRarity(74)).toBe('allstar');
    expect(deriveCardRarity(85)).toBe('allstar');
    expect(deriveCardRarity(86)).toBe('mvp');
  });

  it('initializes ManagerProfile, CoachStaffState, Stadium, Economy, and PlayEvent outcome helpers cleanly', () => {
    const manager = createManagerProfile({
      name: 'Coach Skip',
      avatarSeed: 1994,
    });
    expect(manager.level).toBe(1);
    expect(manager.xp).toBe(0);
    expect(manager.skillPoints).toBe(1);
    expect(manager.activePowerIds).toEqual(['pep_talk']);
    expect(manager.wins).toBe(0);
    expect(manager.losses).toBe(0);
    expect(manager.championships).toBe(0);

    const coaches = createDefaultCoachStaff();
    expect(coaches).toEqual({
      pitching: null,
      hitting: null,
      scouting: null,
      stadium: null,
    });

    const majorsClub = createClub(createSeededRng(1999), {
      ...BASE_CLUB_OPTIONS,
      leagueTier: 'majors',
      isHuman: false,
      stadiumName: 'Grand Mega Dome',
    });
    expect(majorsClub.stadium.name).toBe('Grand Mega Dome');
    expect(majorsClub.stadium.hasJumbotron).toBe(true);
    expect(majorsClub.stadium.hasNightLights).toBe(true);
    expect(majorsClub.stadium.hasMascotCannon).toBe(true);

    const hitOutcomes: AtBatOutcome[] = ['single', 'double', 'triple', 'home_run', 'bunt_single'];
    const nonHitOutcomes: AtBatOutcome[] = [
      'ball',
      'called_strike',
      'swinging_strike',
      'foul',
      'walk',
      'strikeout',
      'ground_out',
      'fly_out',
      'line_out',
      'double_play',
      'sac_fly',
      'fielding_error',
      'bunt_out',
    ];
    for (const outcome of hitOutcomes) {
      expect(isScoringOrHitOutcome(outcome)).toBe(true);
    }
    for (const outcome of nonHitOutcomes) {
      expect(isScoringOrHitOutcome(outcome)).toBe(false);
    }
  });
});
