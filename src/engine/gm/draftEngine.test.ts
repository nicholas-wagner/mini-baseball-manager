import { describe, expect, it } from 'vitest';
import { MAX_ACADEMY_ROSTER_SIZE, MAX_ACTIVE_ROSTER_SIZE } from '../models/club';
import { createSeededRng } from '../rng/seededRng';
import {
  beginAmateurDraft,
  draftProspectToClub,
  getScoutedProspectReport,
  scoutDraftProspect,
} from './draftEngine';
import { createClub } from './rosterFactory';

describe('Fog-of-War Scouting & 3-Round Amateur Draft (TASK-025)', () => {
  it('reveals progressive Fog-of-War scouting tiers (unscouted -> grades -> exact caps -> pitch matchups) using scouting budget', () => {
    const rng = createSeededRng(2501);
    const club = createClub(rng, {
      id: 'c-scout',
      city: 'Sandlot',
      name: 'Comets',
      mascot: 'Dog',
      colors: { primary: '#E63946', secondary: '#1D3557', accent: '#FFD166', monogram: 'SC' },
      leagueTier: 'rookie',
      isHuman: true,
    });
    const draft = beginAmateurDraft(rng, [club], club.id, 'rookie');
    expect(draft.prospects.length).toBeGreaterThanOrEqual(24);

    const target = draft.prospects[0];
    const level0 = getScoutedProspectReport(draft, target.id);
    expect(level0?.scoutLevel).toBe(0);
    expect(level0?.exactCapSummary).toBeNull();
    expect(level0?.pitchIntelRevealed).toBe(false);

    // Level 1 reveals letter grade & specialist hint
    const s1 = scoutDraftProspect(draft, club, target.id);
    expect(s1.scouted).toBe(true);
    expect(s1.club.economy.scoutingBudget).toBeLessThan(club.economy.scoutingBudget);
    const level1 = getScoutedProspectReport(s1.draft, target.id);
    expect(level1?.scoutLevel).toBe(1);
    expect(level1?.ceilingGrade).toMatch(/^[A-D][+-]?$/);

    // Level 2 reveals exact statCaps & positional flexibility
    const s2 = scoutDraftProspect(s1.draft, s1.club, target.id);
    const level2 = getScoutedProspectReport(s2.draft, target.id);
    expect(level2?.scoutLevel).toBe(2);
    expect(level2?.exactCapSummary).not.toBeNull();

    // Level 3 reveals full pitch arsenal / batter crush-vs-weak pitch intel
    const s3 = scoutDraftProspect(s2.draft, s2.club, target.id);
    const level3 = getScoutedProspectReport(s3.draft, target.id);
    expect(level3?.scoutLevel).toBe(3);
    expect(level3?.pitchIntelRevealed).toBe(true);
  });

  it('drafts prospects across 3 rounds and routes overflow rookies cleanly to the 6-slot Farm Academy when at 20 active players', () => {
    const rng = createSeededRng(2502);
    const clubA = createClub(rng, {
      id: 'c-a',
      city: 'Sandlot',
      name: 'Comets',
      mascot: 'Dog',
      colors: { primary: '#E63946', secondary: '#1D3557', accent: '#FFD166', monogram: 'SC' },
      leagueTier: 'rookie',
      isHuman: true,
    });
    const clubB = createClub(rng, {
      id: 'c-b',
      city: 'Harbor',
      name: 'Hawks',
      mascot: 'Hawk',
      colors: { primary: '#2563EB', secondary: '#0F172A', accent: '#FFD166', monogram: 'HH' },
      leagueTier: 'rookie',
      isHuman: false,
    });

    // Fill clubA to hard 20-man active roster cap
    const fullActiveClub = {
      ...clubA,
      roster: [...clubA.roster, ...clubB.roster.slice(0, MAX_ACTIVE_ROSTER_SIZE - clubA.roster.length)],
    };
    expect(fullActiveClub.roster).toHaveLength(MAX_ACTIVE_ROSTER_SIZE);

    let draft = beginAmateurDraft(rng, [fullActiveClub, clubB], fullActiveClub.id, 'rookie');
    let club = fullActiveClub;

    for (let round = 0; round < 3; round += 1) {
      const pick = draft.prospects[0];
      const res = draftProspectToClub(draft, club, pick.id, 'auto');
      expect(res.drafted).toBe(true);
      expect(res.destination).toBe('academy');
      draft = res.draft;
      club = res.club;
    }

    expect(draft.roundsRemaining).toBe(0);
    expect(club.roster).toHaveLength(MAX_ACTIVE_ROSTER_SIZE);
    expect(club.academyProspects).toHaveLength(3);
    expect(club.academyProspects.length).toBeLessThanOrEqual(MAX_ACADEMY_ROSTER_SIZE);

    // 4th pick blocked once 3 rounds are done
    const blocked = draftProspectToClub(draft, club, draft.prospects[0].id, 'auto');
    expect(blocked.drafted).toBe(false);
  });
});
