import { describe, expect, it } from 'vitest';
import { createClub } from '../gm/rosterFactory';
import { createManagerProfile } from '../models/manager';
import { createSeededRng } from '../rng/seededRng';
import {
  applyBackstoryStartingModifiers,
  getManagerBackstory,
  MANAGER_BACKSTORIES,
} from './backstories';
import {
  DUGOUT_GUIDE_CHAPTERS,
  evaluateRoadToMajorsChecklist,
} from './dugoutGuide';
import {
  buildDynastyEpilogue,
  createInitialStoryState,
  getNextAvailableStoryChapter,
  getStoryChaptersForBackstory,
  resolveManagerEpithet,
  resolveStoryChapterChoice,
  STORY_CHAPTERS_CATALOG,
} from './storyEngine';

describe('Milestone 10: 8 Replayable Backstories, CYOA Story Engine & Coach Pops Guide (TASK-072..073)', () => {
  it('provides 8 distinct balanced backstories that apply real starting perks and trade-offs', () => {
    expect(MANAGER_BACKSTORIES).toHaveLength(8);
    expect(getManagerBackstory(undefined).id).toBe('sandlot_hero');

    const baseClub = createClub(createSeededRng(7301), {
      id: 'story-club',
      isHuman: true,
      city: 'Pineville',
      name: 'Rockets',
      mascot: 'Rocket',
      colors: { primary: '#E63946', secondary: '#1D3557', accent: '#FFC300', monogram: 'PR' },
      leagueTier: 'rookie',
    });
    const baseMgr = createManagerProfile({ name: 'Skipper Sam', avatarSeed: 1994 });

    // Hometown Hero: bigger fanbase & hype, tighter starting cash
    const hero = applyBackstoryStartingModifiers(baseClub, baseMgr, 'sandlot_hero');
    expect(hero.club.economy.fanBase).toBeGreaterThan(baseClub.economy.fanBase);
    expect(hero.club.economy.teamHype).toBeGreaterThan(baseClub.economy.teamHype);
    expect(hero.club.economy.cash).toBeLessThan(baseClub.economy.cash);

    // Ex-Pro Comeback: Manager Lv. 2 + bonus SP
    const exPro = applyBackstoryStartingModifiers(baseClub, baseMgr, 'ex_pro_comeback');
    expect(exPro.manager.level).toBe(2);
    expect(exPro.manager.skillPoints).toBe(baseMgr.skillPoints + 2);

    // Surprise Inheritor: starts with vintage relic equipped on captain!
    const inheritor = applyBackstoryStartingModifiers(baseClub, baseMgr, 'surprise_inheritor');
    expect(inheritor.club.roster[0].equippedRelicIds).toContain('golden_ash_bat');

    // Showbiz Promoter: big starting cash bonus
    const showbiz = applyBackstoryStartingModifiers(baseClub, baseMgr, 'showbiz_promoter');
    expect(showbiz.club.economy.cash).toBe(baseClub.economy.cash + 3_500);
  });

  it('runs a full 3-act Choose-Your-Own-Adventure story arc with alignment titles, flags & epilogue', () => {
    expect(STORY_CHAPTERS_CATALOG).toHaveLength(24);
    for (const backstory of MANAGER_BACKSTORIES) {
      expect(getStoryChaptersForBackstory(backstory.id)).toHaveLength(3);
    }

    const club = createClub(createSeededRng(7302), {
      id: 'cyoa-club',
      isHuman: true,
      city: 'Sandlot',
      name: 'Stars',
      mascot: 'Star',
      colors: { primary: '#2FB356', secondary: '#1B4332', accent: '#FFC300', monogram: 'SS' },
      leagueTier: 'rookie',
    });

    let story = createInitialStoryState('sandlot_hero');
    expect(story.storyFlags).toContain('origin:sandlot_hero');

    // Act I unlocks immediately on Opening Day
    const act1 = getNextAvailableStoryChapter(story, { gamesPlayed: 0, seasonNumber: 1 });
    expect(act1?.act).toBe(1);

    const step1 = resolveStoryChapterChoice(
      createSeededRng(7310),
      story,
      club,
      act1!.id,
      act1!.choices[0].id,
      1,
    );
    expect(step1.resolved).toBe(true);
    expect(step1.storyState.storyFlags).toContain('sandlot_hero_chose_heart');
    expect(step1.storyState.scrapbook).toHaveLength(1);
    expect(step1.boostedPlayerName).toBeTruthy();

    // Act II gated until 3 games played
    expect(getNextAvailableStoryChapter(step1.storyState, { gamesPlayed: 1, seasonNumber: 1 })).toBeNull();
    const act2 = getNextAvailableStoryChapter(step1.storyState, { gamesPlayed: 4, seasonNumber: 1 });
    expect(act2?.act).toBe(2);

    const step2 = resolveStoryChapterChoice(
      createSeededRng(7311),
      step1.storyState,
      step1.club,
      act2!.id,
      act2!.choices[1].id,
      1,
    );
    expect(step2.resolved).toBe(true);
    expect(resolveManagerEpithet(step2.storyState.alignment).title).toBe("The People's Skipper");

    // Act III unlocks after 8 games (or Season 2)
    const act3 = getNextAvailableStoryChapter(step2.storyState, { gamesPlayed: 9, seasonNumber: 1 });
    expect(act3?.act).toBe(3);
    const step3 = resolveStoryChapterChoice(
      createSeededRng(7312),
      step2.storyState,
      step2.club,
      act3!.id,
      act3!.choices[0].id,
      1,
    );
    story = step3.storyState;
    expect(getNextAvailableStoryChapter(story, { gamesPlayed: 20, seasonNumber: 2 })).toBeNull();

    // Invalid chapter/choice rejected safely
    expect(resolveStoryChapterChoice(createSeededRng(1), story, club, 'nope', 'nope', 1).resolved).toBe(false);

    // Check every alignment epithet branch
    expect(resolveManagerEpithet({ heartVsBusiness: 0, showtimeVsOldSchool: 0, analyticsVsGut: 0, charmVsVillain: -35 }).title).toBe('The Sandlot Heel');
    expect(resolveManagerEpithet({ heartVsBusiness: 0, showtimeVsOldSchool: 30, analyticsVsGut: 0, charmVsVillain: 0 }).title).toBe('Neon Showstopper');
    expect(resolveManagerEpithet({ heartVsBusiness: 0, showtimeVsOldSchool: 0, analyticsVsGut: 30, charmVsVillain: 0 }).title).toBe('Floppy-Disk Genius');
    expect(resolveManagerEpithet({ heartVsBusiness: 0, showtimeVsOldSchool: -30, analyticsVsGut: 0, charmVsVillain: 0 }).title).toBe('Old-School Ironman');
    expect(resolveManagerEpithet({ heartVsBusiness: 0, showtimeVsOldSchool: 0, analyticsVsGut: 0, charmVsVillain: 0 }).title).toBe('Rising Sandlot Skipper');

    const epilogue = buildDynastyEpilogue(story, { ...step3.club, wins: 16, losses: 5, leagueTier: 'majors' });
    expect(epilogue.headline).toContain('Save the Sandlot');
    expect(epilogue.summary).toContain('Mini Major League');
  });

  it('delivers 6 upbeat Coach Pops Dugout Handbook chapters and live Road to the Majors checklist', () => {
    expect(DUGOUT_GUIDE_CHAPTERS).toHaveLength(6);
    expect(DUGOUT_GUIDE_CHAPTERS.every((c) => c.coachPopsQuote.length > 20 && c.highlights.length >= 3)).toBe(true);

    const emptySteps = evaluateRoadToMajorsChecklist(null, null);
    expect(emptySteps).toHaveLength(6);
    expect(emptySteps.every((s) => !s.completed)).toBe(true);

    const club = createClub(createSeededRng(7320), {
      id: 'guide-club',
      isHuman: true,
      city: 'Sunny',
      name: 'Slammers',
      mascot: 'Slam',
      colors: { primary: '#E63946', secondary: '#1D3557', accent: '#FFC300', monogram: 'SS' },
      leagueTier: 'low_a',
    });
    club.wins = 3;
    club.stadium.hasNightLights = true;
    const story = {
      ...createInitialStoryState('ragtag_movie_coach'),
      completedChapterIds: ['ragtag_movie_coach_act_1'],
    };

    const doneSteps = evaluateRoadToMajorsChecklist(club, story);
    expect(doneSteps.filter((s) => s.completed).length).toBeGreaterThanOrEqual(5);
  });
});
