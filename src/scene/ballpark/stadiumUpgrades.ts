import * as THREE from 'three';
import {
  getBallparkPreset,
  type BallparkPresetId,
} from '../../engine/ballparks/stadiumCatalog';
import {
  getStadiumTierProfile,
  type StadiumFenceStyle,
  type StadiumScoreboardStyle,
} from '../../engine/ballparks/stadiumProgression';
import { PARODY_SPONSORS_CATALOG } from '../../engine/economy/sponsorsTv';
import type { LeagueTierId, StadiumState } from '../../engine/models/club';
import { createToonMaterial } from '../core/toonMaterials';

export interface StadiumBillboardSpec {
  id: string;
  title: string;
  subtitle: string;
  color: string;
}

export interface StadiumVisualSpec {
  tier: LeagueTierId;
  ballparkId: BallparkPresetId;
  architectureLabel: string;
  fenceStyle: StadiumFenceStyle;
  scoreboardStyle: StadiumScoreboardStyle;
  upperDeckCount: 0 | 1 | 2;
  hasLuxurySuites: boolean;
  hasDomeTrusses: boolean;
  hasJumbotron: boolean;
  floodlightTowers: number;
  hasMascotCannon: boolean;
  skylineCount: number;
  crowdScale: number;
  wallColorHex: string;
  skyTintHex: string;
  billboards: StadiumBillboardSpec[];
  retiredNumbers: readonly { jerseyNumber: number; playerName: string }[];
  pennantCount: number;
}

/**
 * Pure architectural blueprint mapping League Tier + Stadium Upgrades + Sponsors + History
 * into exact 3D visual elements (runnable in Node/jsdom without WebGL).
 */
export function computeStadiumVisualSpec(
  tier: LeagueTierId,
  stadium: StadiumState,
  activeSponsorIds: readonly string[] = [],
): StadiumVisualSpec {
  const profile = getStadiumTierProfile(tier);
  const preset = getBallparkPreset(stadium.ballparkId);
  const builtDistrictCount = stadium.districtTiles.filter((t) => Boolean(t.buildingId)).length;

  const upperDeckFromSeating =
    stadium.seatingTier >= 4 ? 2 : stadium.seatingTier >= 3 ? 1 : 0;
  const upperDeckCount = Math.max(profile.upperDeckCount, upperDeckFromSeating) as 0 | 1 | 2;

  const billboards: StadiumBillboardSpec[] = activeSponsorIds
    .map((id) => PARODY_SPONSORS_CATALOG.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => Boolean(s))
    .map((s) => ({
      id: s.id,
      title: s.name,
      subtitle: s.tagline,
      color: s.billboardColor,
    }));

  const floodlightTowers = stadium.hasNightLights
    ? Math.max(4, profile.floodlightTowers)
    : profile.floodlightTowers;

  return {
    tier,
    ballparkId: preset.id,
    architectureLabel: profile.label,
    fenceStyle: profile.fenceStyle,
    scoreboardStyle: stadium.hasJumbotron ? 'hd_cathedral' : profile.scoreboardStyle,
    upperDeckCount,
    hasLuxurySuites: profile.hasLuxurySuites || stadium.seatingTier >= 3,
    hasDomeTrusses: preset.factors.isDome,
    hasJumbotron: stadium.hasJumbotron || profile.scoreboardStyle === 'jumbo_tower' || profile.scoreboardStyle === 'hd_cathedral',
    floodlightTowers,
    hasMascotCannon: stadium.hasMascotCannon,
    skylineCount: builtDistrictCount + (tier === 'majors' ? 4 : tier === 'aaa' ? 2 : 0),
    crowdScale: profile.crowdDensityScale,
    wallColorHex: preset.visualPalette.wallColor,
    skyTintHex: preset.visualPalette.skyTint,
    billboards,
    retiredNumbers: stadium.retiredNumbers,
    pennantCount: stadium.championshipPennants.length,
  };
}

function buildUpperDecks(spec: StadiumVisualSpec, parent: THREE.Group): void {
  if (spec.upperDeckCount <= 0) return;
  const deckMat = createToonMaterial(spec.wallColorHex);
  const railMat = createToonMaterial(0xffc300);

  for (let level = 0; level < spec.upperDeckCount; level += 1) {
    const yBase = 7.4 + level * 4.4;
    // Behind-home upper grandstand deck
    const backDeck = new THREE.Mesh(new THREE.BoxGeometry(22 + level * 4, 2.2, 4.2), deckMat);
    backDeck.position.set(0, yBase, 17.5 + level * 2.2);
    parent.add(backDeck);

    const fascia = new THREE.Mesh(new THREE.BoxGeometry(22.2 + level * 4, 0.35, 0.4), railMat);
    fascia.position.set(0, yBase - 0.9, 15.3 + level * 2.2);
    parent.add(fascia);

    // 1st-base and 3rd-base upper decks
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(20, 2.0, 3.8), deckMat);
      wing.position.set(side * (24.5 + level * 2.2), yBase, -6.5);
      wing.rotation.y = side * -Math.PI * 0.25;
      parent.add(wing);
    }
  }
}

function buildLuxurySuitesAndDome(spec: StadiumVisualSpec, parent: THREE.Group): void {
  if (spec.hasLuxurySuites) {
    const glassMat = createToonMaterial(0x9be7ff);
    const suiteBox = new THREE.Mesh(new THREE.BoxGeometry(18, 1.8, 2.4), glassMat);
    suiteBox.position.set(0, 6.9, 16.4);
    parent.add(suiteBox);
  }

  if (spec.hasDomeTrusses) {
    const trussMat = createToonMaterial(0x334155);
    for (const zOff of [-22, 0, 20]) {
      const arch = new THREE.Mesh(new THREE.TorusGeometry(46, 0.55, 8, 32, Math.PI), trussMat);
      arch.position.set(0, 14, zOff);
      parent.add(arch);
    }
  }
}

function buildJumbotronAndCannon(spec: StadiumVisualSpec, parent: THREE.Group): void {
  if (spec.hasJumbotron) {
    const frameMat = createToonMaterial(0x181b2c);
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(18, 8.8, 1.2), frameMat);
    frame.position.set(0, 15.2, -45.5);
    parent.add(frame);

    const screen = new THREE.Mesh(new THREE.PlaneGeometry(16.6, 7.2), screenMat);
    screen.position.set(0, 15.2, -44.85);
    parent.add(screen);
  }

  if (spec.hasMascotCannon) {
    const cannonMat = createToonMaterial(0xff4d6d);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.2, 1.4, 10), createToonMaterial(0xffc300));
    base.position.set(-19, 4.4, -39.5);
    parent.add(base);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.65, 3.2, 10), cannonMat);
    barrel.position.set(-19, 5.8, -39.1);
    barrel.rotation.x = Math.PI * 0.25;
    parent.add(barrel);
  }
}

function buildSkylineWallPlaquesAndPennants(spec: StadiumVisualSpec, parent: THREE.Group): void {
  // District skyline silhouettes rising behind the outfield!
  if (spec.skylineCount > 0) {
    const towerMat = createToonMaterial(0x2b3a67);
    const count = Math.min(8, spec.skylineCount);
    for (let i = 0; i < count; i += 1) {
      const x = -32 + i * 9.5;
      const h = 10 + (i % 3) * 5;
      const building = new THREE.Mesh(new THREE.BoxGeometry(5.2, h, 4.8), towerMat);
      building.position.set(x, h / 2, -56 - (i % 2) * 4);
      parent.add(building);
    }
  }

  // Retired Jersey Wall Plaques mounted visibly on left-center outfield wall
  const plaqueMat = createToonMaterial(0xffc300);
  spec.retiredNumbers.slice(0, 8).forEach((_, idx) => {
    const plaque = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.22, 16), plaqueMat);
    plaque.rotation.x = Math.PI / 2;
    plaque.position.set(-22 + idx * 2.5, 2.2, -37.2);
    parent.add(plaque);
  });

  // Championship Pennants flying proudly above center field
  const pennantMat = createToonMaterial(0xe63946);
  const poleMat = createToonMaterial(0x181b2c);
  for (let i = 0; i < Math.min(8, spec.pennantCount); i += 1) {
    const px = -12 + i * 3.4;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.2, 8), poleMat);
    pole.position.set(px, 12.2, -44.2);
    parent.add(pole);

    const flag = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.1, 4), pennantMat);
    flag.rotation.z = -Math.PI / 2;
    flag.position.set(px + 1.0, 13.7, -44.2);
    parent.add(flag);
  }
}

export interface StadiumEvolutionOverlay {
  group: THREE.Group;
  spec: StadiumVisualSpec;
  dispose: () => void;
}

/**
 * Builds the live Three.js stadium evolution overlay matching league tier,
 * ballpark architecture, purchased upgrades, sponsors, retired numbers & pennants.
 */
export function createStadiumEvolutionOverlay(
  tier: LeagueTierId,
  stadium: StadiumState,
  activeSponsorIds: readonly string[] = [],
): StadiumEvolutionOverlay {
  const spec = computeStadiumVisualSpec(tier, stadium, activeSponsorIds);
  const group = new THREE.Group();
  group.name = `stadium-evolution-${spec.tier}-${spec.ballparkId}`;

  buildUpperDecks(spec, group);
  buildLuxurySuitesAndDome(spec, group);
  buildJumbotronAndCannon(spec, group);
  buildSkylineWallPlaquesAndPennants(spec, group);

  const dispose = () => {
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        for (const mat of [obj.material].flat()) mat.dispose();
      }
    });
  };

  return { group, spec, dispose };
}
