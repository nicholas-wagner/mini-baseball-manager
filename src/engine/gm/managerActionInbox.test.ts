import { describe, expect, it } from 'vitest';
import { createManagerProfile } from '../models/manager';
import { createSeededRng } from '../rng/seededRng';
import { createClub } from './rosterFactory';
import {
  applySeriesAutoProgression,
  buildManagerActionInbox,
  runQuickTeamPractice,
} from './managerActionInbox';

const COLORS = { primary: '#E63946', secondary: '#1D3557', accent: '#FFC300', monogram: 'SC' };

describe('Manager Action Inbox, Series Auto-Progression & Quick Team Practice', () => {
  const makeClubAndManager = () => {
    const rng = createSeededRng(1994);
    const club = createClub(rng, {
      id: 'home',
      city: 'Sandlot',
      name: 'Comets',
      mascot: 'Rocket',
      colors: COLORS,
      leagueTier: 'rookie',
      isHuman: true,
    });
    const manager = createManagerProfile({ name: 'Coach Skip', avatarSeed: 1994 });
    return { club, manager };
  };

  it('surfaces prioritized GM action alerts and nav tab badges for injuries, skill points, foil packs, playoffs, and ballpark upgrades', () => {
    const { club, manager } = makeClubAndManager();

    // Clean baseline with zero packs and low cash -> all set!
    const cleanClub = {
      ...club,
      roster: club.roster.map((p) => ({ ...p, skillPoints: 0 })),
      economy: { ...club.economy, cash: 500 },
    };
    const cleanManager = { ...manager, skillPoints: 0 };
    const baseline = buildManagerActionInbox({
      club: cleanClub,
      manager: cleanManager,
      currentSeriesIndex: 2,
      unopenedPackCount: 0,
    });
    expect(baseline.items).toHaveLength(0);
    expect(baseline.tabBadges).toEqual({});
    expect(baseline.headline).toMatch(/all set|ready/i);

    // Add an injured player, 2 player SP + 1 manager SP, 1 foil pack, postseason ready, and upgrade cash
    const busyClub = {
      ...cleanClub,
      economy: { ...cleanClub.economy, cash: 20_000 },
      roster: cleanClub.roster.map((p, idx) =>
        idx === 0
          ? {
              ...p,
              skillPoints: 2,
              activeHealthStatus: {
                conditionId: 'hamstring_tightness',
                name: 'Hamstring Tightness',
                kind: 'injury' as const,
                rarity: 'common' as const,
                category: 'legs_soft_tissue' as const,
                gamesRemaining: 3,
                seasonEnding: false,
                canPlayThrough: true,
                playingThrough: false,
                careerEndingTriggered: false,
                statPenalties: { speed: -8 },
              },
            }
          : p,
      ),
    };
    const busyManager = { ...cleanManager, skillPoints: 1 };

    const inbox = buildManagerActionInbox({
      club: busyClub,
      manager: busyManager,
      currentSeriesIndex: 7,
      unopenedPackCount: 1,
    });

    expect(inbox.items[0].kind).toBe('injury_alert');
    expect(inbox.items.some((i) => i.kind === 'skill_points_ready')).toBe(true);
    expect(inbox.items.some((i) => i.kind === 'foil_packs_ready')).toBe(true);
    expect(inbox.items.some((i) => i.kind === 'postseason_ready')).toBe(true);
    expect(inbox.items.some((i) => i.kind === 'ballpark_upgrade')).toBe(true);
    expect(inbox.tabBadges.roster).toBe('🩺 1');
    expect(inbox.tabBadges.skills).toBe('⚡ 3');
    expect(inbox.tabBadges.league).toBe('🏆');
    expect(inbox.tabBadges.economy).toBe('⬆');
  });

  it('automatically awards XP, auto-levels players, grows core ratings, earns Skill Tree SP, and pays gate cash after simmed series', () => {
    const { club, manager } = makeClubAndManager();
    const primedClub = {
      ...club,
      roster: club.roster.map((p, idx) =>
        idx < 2 ? { ...p, xp: 140, level: 1, skillPoints: 0, xpGrowthMultiplier: 1 } : p,
      ),
    };
    const initialCash = primedClub.economy.cash;

    const result = applySeriesAutoProgression(primedClub, manager, 2, 1);

    expect(result.club.economy.cash).toBeGreaterThan(initialCash);
    expect(result.manager.xp + result.manager.level * 120).toBeGreaterThan(
      manager.xp + manager.level * 120,
    );
    expect(result.levelUps.length).toBeGreaterThanOrEqual(2);
    expect(result.club.roster[0].level).toBeGreaterThanOrEqual(2);
    expect(result.club.roster[0].skillPoints).toBeGreaterThanOrEqual(1);
    expect(result.cashEarned).toBeGreaterThan(0);
  });

  it('runs a rewarding 1-tap Quick Team Practice that boosts XP, auto-levels ready players, and lifts team form', () => {
    const { club, manager } = makeClubAndManager();
    const primedClub = {
      ...club,
      roster: club.roster.map((p, idx) =>
        idx === 0
          ? { ...p, xp: 150, level: 1, skillPoints: 0, formScore: -10, xpGrowthMultiplier: 1 }
          : p,
      ),
    };

    const practice = runQuickTeamPractice(primedClub, manager);

    expect(practice.playersBoosted).toBe(primedClub.roster.length);
    expect(practice.club.roster[0].level).toBeGreaterThanOrEqual(2);
    expect(practice.club.roster[0].skillPoints).toBeGreaterThanOrEqual(1);
    expect(practice.club.roster[0].formScore).toBeGreaterThan(-10);
    expect(practice.levelUps.length).toBeGreaterThanOrEqual(1);
    expect(practice.summary).toMatch(/team practice/i);

    // Exercise plural/singular branches, null manager, night_lights upgrade & zero-level-up practice
    const freshClub = {
      ...club,
      stadium: { ...club.stadium, seatingTier: 4 as const, hasNightLights: false },
      economy: { ...club.economy, cash: 50_000 },
      roster: club.roster.map((p, idx) => ({
        ...p,
        xp: 0,
        level: 5,
        skillPoints: idx === 0 ? 1 : 0,
        activeHealthStatus:
          idx < 2
            ? {
                conditionId: 'flu',
                name: 'Flu',
                kind: 'illness' as const,
                rarity: 'common' as const,
                category: 'respiratory_viral' as const,
                gamesRemaining: 2,
                seasonEnding: false,
                canPlayThrough: true,
                playingThrough: false,
                careerEndingTriggered: false,
                statPenalties: { stamina: -6 },
              }
            : null,
      })),
    };
    const multiInbox = buildManagerActionInbox({
      club: freshClub,
      manager: null,
      currentSeriesIndex: 1,
      unopenedPackCount: 2,
    });
    expect(multiInbox.tabBadges.roster).toBe('🩺 2');
    expect(multiInbox.tabBadges.skills).toBe('⚡ 1');
    expect(multiInbox.tabBadges.economy).toBe('⬆');

    const noLvPractice = runQuickTeamPractice(freshClub, manager);
    expect(noLvPractice.levelUps).toHaveLength(0);
    expect(noLvPractice.summary).toMatch(/sharpened form/i);
  });
});
