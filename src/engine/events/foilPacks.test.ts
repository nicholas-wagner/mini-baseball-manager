import { describe, expect, it } from 'vitest';
import { createClub } from '../gm/rosterFactory';
import { createStaffMember, hireStaffMember } from '../gm/coaches';
import { createSeededRng } from '../rng/seededRng';
import { getRelicOwnershipUsage } from '../rpg/relicLocker';
import {
  applyFoilPackRewardsToClub,
  applyHoloUpgradeToPlayer,
  applyStaffClinicPassToClub,
  applyTrainingPassToPlayer,
  depositFoilPackBaseRewards,
  LEGENDARY_PITY_THRESHOLD,
  openFoilBoosterPack,
  type OpenedFoilPackResult,
} from './foilPacks';

describe('1994 Foil Pack Overhaul — Agency, 6 Card Types, Pity Timer & Trivia (TASK-137)', () => {
  it('guarantees a Legendary pull when pity threshold is reached and always includes gum trivia', () => {
    const opened = openFoilBoosterPack(createSeededRng(1371), 'sandlot_foil', {
      packsSinceLegendary: LEGENDARY_PITY_THRESHOLD,
    });
    expect(opened.pityTriggered).toBe(true);
    expect(opened.cards.some((c) => c.rarity === 'legendary')).toBe(true);
    expect(opened.gumTrivia).toMatch(/1994 Gum Fact/i);
  });

  it('deposits pulled Relics into the Club Relic Locker without silent random auto-equip and supports interactive card claims', () => {
    const rng = createSeededRng(1372);
    let club = createClub(rng, {
      id: 'foil-club',
      city: 'Chrome',
      name: 'Rippers',
      mascot: 'Gum',
      colors: { primary: '#7209B7', secondary: '#1D3557', accent: '#FFD166', monogram: 'CR' },
      leagueTier: 'aa',
      isHuman: true,
    });
    const coach = createStaffMember(rng, 'hitting_coach', 1, 'small_ball_craftsman');
    club = hireStaffMember(club, coach).club;

    const opened = openFoilBoosterPack(createSeededRng(1373), 'rivalry_chrome');
    const relicCard = opened.cards[0];
    expect(relicCard.kind).toBe('relic');
    expect(relicCard.relicId).toBeTruthy();

    const deposited = depositFoilPackBaseRewards(club, opened);
    // Relic landed safely in Club Locker without modifying any player's equippedRelicIds!
    expect(getRelicOwnershipUsage(deposited.club, relicCard.relicId!).owned).toBeGreaterThanOrEqual(1);
    expect(deposited.club.roster.every((p) => p.equippedRelicIds.length === 0)).toBe(true);

    // Interactive player-chosen Prospect Pass, Staff Clinic Pass, and Holo Upgrade
    const chosenPlayer = deposited.club.roster[2];
    const afterPass = applyTrainingPassToPlayer(deposited.club, chosenPlayer.id, 80, 1);
    expect(afterPass.club.roster[2].skillPoints).toBeGreaterThanOrEqual(chosenPlayer.skillPoints + 1);

    const afterClinic = applyStaffClinicPassToClub(afterPass.club, coach.id, 130);
    expect(afterClinic.club.coaches.activeStaff[0].level).toBeGreaterThanOrEqual(2);

    const afterHolo = applyHoloUpgradeToPlayer(afterClinic.club, chosenPlayer.id);
    expect(afterHolo.club.roster[2].ratings.popularity).toBeGreaterThanOrEqual(
      Math.min(99, chosenPlayer.ratings.popularity + 8),
    );

    // Edge cases: empty staff clinic cash fallback, missing player guards, and batch auto-assign for all card kinds
    const noStaffClub = { ...club, coaches: { ...club.coaches, activeStaff: [] } };
    const fallbackClinic = applyStaffClinicPassToClub(noStaffClub, null, 110);
    expect(fallbackClinic.club.economy.cash).toBe(noStaffClub.economy.cash + 900);
    expect(applyHoloUpgradeToPlayer(club, 'missing-id').summary).toMatch(/not found/i);
    expect(applyTrainingPassToPlayer(club, 'missing-id', 50, 1).summary).toMatch(/not found/i);

    const syntheticPack: OpenedFoilPackResult = {
      tier: 'rivalry_chrome',
      tierLabel: 'Synthetic Chrome',
      gumTrivia: '1994 Gum Fact: test',
      pityTriggered: false,
      cards: [
        { slot: 1, kind: 'cash_windfall', rarity: 'common', title: 'Cash', subtitle: '+$500', cashBonus: 500 },
        { slot: 2, kind: 'hype_ticket', rarity: 'common', title: 'Hype', subtitle: '+10', hypeBonus: 10 },
        { slot: 3, kind: 'holo_upgrade', rarity: 'rare', title: 'Holo', subtitle: 'Stamp' },
      ],
    };
    const depSynthetic = depositFoilPackBaseRewards(club, syntheticPack);
    expect(depSynthetic.club.economy.cash).toBe(club.economy.cash + 500);
    expect(depSynthetic.summaryLines).toHaveLength(3);

    const clinicPack: OpenedFoilPackResult = {
      ...syntheticPack,
      cards: [
        syntheticPack.cards[0],
        syntheticPack.cards[1],
        { slot: 3, kind: 'staff_clinic_pass', rarity: 'rare', title: 'Clinic', subtitle: '+110 XP', staffXpBonus: 110 },
      ],
    };
    const batchSynthetic = applyFoilPackRewardsToClub(club, syntheticPack);
    expect(batchSynthetic.summaryLines).toHaveLength(3);
    const batchClinic = applyFoilPackRewardsToClub(club, clinicPack);
    expect(batchClinic.summaryLines).toHaveLength(3);
  });
});
