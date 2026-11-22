import { describe, expect, it } from 'vitest';
import { createClub } from '../gm/rosterFactory';
import { createSeededRng } from '../rng/seededRng';
import {
  buildPlayerCardBio,
  isLegacyGenericBio,
  resolvePlayerCardBio,
} from './playerBio';

const COLORS = {
  primary: '#E63946',
  secondary: '#1D3557',
  accent: '#FFC300',
  monogram: 'SC',
};

describe('Player Card Bio Generator — Role-Authentic, Unique 90s Card Blurbs', () => {
  it('detects the 4 old repetitive generic rosterFactory bios and preserves custom bios', () => {
    const rng = createSeededRng(1994);
    const club = createClub(rng, {
      id: 'c1',
      city: 'Sandlot',
      name: 'Comets',
      mascot: 'Rocket',
      colors: COLORS,
      leagueTier: 'rookie',
      isHuman: true,
    });
    const sample = club.roster[0];
    const oldStub = 'Famous across the circuit for towering pre-game batting practice launches.';

    expect(isLegacyGenericBio(oldStub)).toBe(true);
    expect(isLegacyGenericBio('')).toBe(true);
    expect(isLegacyGenericBio(undefined)).toBe(true);
    expect(resolvePlayerCardBio({ ...sample, bio: oldStub })).not.toBe(oldStub);
    expect(resolvePlayerCardBio({ ...sample, bio: 'Custom hand-crafted hall of fame story.' })).toBe(
      'Custom hand-crafted hall of fame story.',
    );

    const switchBio = buildPlayerCardBio({ ...sample, position: 'SS', bats: 'S', throws: 'R' });
    const leftySpBio = buildPlayerCardBio({
      ...sample,
      position: 'SP',
      throws: 'L',
      pitchArsenal: undefined,
    });
    expect(switchBio.length).toBeGreaterThan(30);
    expect(leftySpBio.length).toBeGreaterThan(30);
  });

  it('generates deterministic, unique bios across an entire 18-player roster with zero duplicates', () => {
    const rng = createSeededRng(2026);
    const club = createClub(rng, {
      id: 'c2',
      city: 'Bayside',
      name: 'Pelicans',
      mascot: 'Pelican',
      colors: COLORS,
      leagueTier: 'aa',
      isHuman: false,
    });

    const bios = club.roster.map((p) => buildPlayerCardBio(p));
    const biosRepeat = club.roster.map((p) => buildPlayerCardBio(p));
    expect(bios).toEqual(biosRepeat);

    const unique = new Set(bios);
    expect(unique.size).toBe(club.roster.length);
  });

  it('keeps pitcher bios strictly mound-authentic (never batting practice launches) and includes player hometown', () => {
    const rng = createSeededRng(777);
    const club = createClub(rng, {
      id: 'c3',
      city: 'Harbor',
      name: 'Otters',
      mascot: 'Otter',
      colors: COLORS,
      leagueTier: 'aaa',
      isHuman: false,
    });

    for (const player of club.roster) {
      const bio = buildPlayerCardBio(player);
      expect(bio.length).toBeGreaterThan(35);
      expect(bio).toContain(player.hometown);
      if (player.position === 'SP' || player.position === 'RP') {
        expect(bio.toLowerCase()).not.toContain('batting practice');
      }
    }
  });
});
