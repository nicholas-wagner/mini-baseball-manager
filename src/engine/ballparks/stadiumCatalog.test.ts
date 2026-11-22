import { describe, expect, it } from 'vitest';
import { createClub } from '../gm/rosterFactory';
import { generateSixTierWorld } from '../league/seasonEngine';
import { createSeededRng } from '../rng/seededRng';
import { simFullGame } from '../simulation/baseballEngine';
import {
  BALLPARK_CATALOG,
  commissionHomeBallpark,
  evaluateParkHitMultipliers,
  getBallparkPreset,
  pickBallparkForClub,
} from './stadiumCatalog';

describe('Multiple Distinct Stadiums & Simulation Park Factors (TASK-069)', () => {
  it('provides 10 distinct handcrafted retro ballparks with unique Park Factors and 3D palettes', () => {
    expect(BALLPARK_CATALOG).toHaveLength(10);
    expect(new Set(BALLPARK_CATALOG.map((p) => p.id)).size).toBe(10);

    const mesa = getBallparkPreset('high_altitude_mesa');
    const bay = getBallparkPreset('bayfront_cove');
    const dome = getBallparkPreset('neon_metro_dome');
    const shipyard = getBallparkPreset('harbor_shipyard');

    expect(mesa.factors.hrFactor).toBeGreaterThan(bay.factors.hrFactor + 0.25);
    expect(dome.factors.isDome).toBe(true);
    expect(dome.factors.surface).toBe('fast_turf');
    expect(dome.factors.groundballSpeedFactor).toBeGreaterThan(1.08);

    // Harbor Shipyard short RF porch specifically favors left-handed pull hitters
    const lhbShipyard = evaluateParkHitMultipliers(shipyard.id, 'L');
    const rhbShipyard = evaluateParkHitMultipliers(shipyard.id, 'R');
    expect(lhbShipyard.hrMultiplier).toBeGreaterThan(rhbShipyard.hrMultiplier + 0.2);
  });

  it('assigns varied stadiums across the 48-club pyramid and lets clubs commission new home venues', () => {
    const world = generateSixTierWorld(6901, {
      city: 'Sandlot',
      clubName: 'Comets',
      mascot: 'Rocket Dog',
      monogram: 'SC',
      primaryColor: '#E63946',
      secondaryColor: '#1D3557',
      accentColor: '#FFD166',
    });
    const allClubs = Object.values(world.leagues).flat();
    const uniqueParks = new Set(allClubs.map((c) => c.stadium.ballparkId));
    expect(uniqueParks.size).toBeGreaterThanOrEqual(8);
    expect(pickBallparkForClub('majors', 0)).toBe('grand_cathedral');

    // Commission relocation enforces tier & cash
    const rookieClub = createClub(createSeededRng(6902), {
      id: 'c-rookie',
      city: 'Cedar',
      name: 'Sox',
      mascot: 'Fox',
      colors: { primary: '#E63946', secondary: '#1D3557', accent: '#FFD166', monogram: 'CS' },
      leagueTier: 'rookie',
      isHuman: true,
    });
    const blockedMajorsPark = commissionHomeBallpark(rookieClub, 'grand_cathedral');
    expect(blockedMajorsPark.commissioned).toBe(false);

    const aaaClub = {
      ...rookieClub,
      leagueTier: 'aaa' as const,
      economy: { ...rookieClub.economy, cash: 150_000 },
    };
    const built = commissionHomeBallpark(aaaClub, 'neon_metro_dome');
    expect(built.commissioned).toBe(true);
    expect(built.club.stadium.ballparkId).toBe('neon_metro_dome');
    expect(built.club.economy.cash).toBeLessThan(aaaClub.economy.cash);
  });

  it('visibly shifts simulated Home Run rates between High-Altitude Mesa and Bayfront Cove', () => {
    const away = createClub(createSeededRng(7001), {
      id: 'away-1',
      city: 'Harbor',
      name: 'Hawks',
      mascot: 'Hawk',
      colors: { primary: '#2563EB', secondary: '#0F172A', accent: '#FFD166', monogram: 'HH' },
      leagueTier: 'aa',
      isHuman: false,
    });
    const baseHome = createClub(createSeededRng(7002), {
      id: 'home-1',
      city: 'Mesa',
      name: 'Titans',
      mascot: 'Ram',
      colors: { primary: '#E63946', secondary: '#1D3557', accent: '#FFD166', monogram: 'MT' },
      leagueTier: 'aa',
      isHuman: true,
    });
    const mesaHome = { ...baseHome, stadium: { ...baseHome.stadium, ballparkId: 'high_altitude_mesa' as const } };
    const bayHome = { ...baseHome, stadium: { ...baseHome.stadium, ballparkId: 'bayfront_cove' as const } };

    let mesaHrs = 0;
    let bayHrs = 0;
    for (let g = 0; g < 35; g += 1) {
      const resMesa = simFullGame(away, mesaHome, 9000 + g * 13, 9);
      const resBay = simFullGame(away, bayHome, 9000 + g * 13, 9);
      mesaHrs += resMesa.events.filter((e) => e.outcome === 'home_run').length;
      bayHrs += resBay.events.filter((e) => e.outcome === 'home_run').length;
    }
    expect(mesaHrs).toBeGreaterThan(bayHrs);
  });
});
