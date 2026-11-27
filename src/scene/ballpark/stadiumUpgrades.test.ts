import { Box3, Mesh, PerspectiveCamera, Raycaster, Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { fitFieldOfView, getCameraPresetPose } from '../camera/cameraRig';
import { createInitialStadium } from '../../engine/models/club';
import {
  computeStadiumVisualSpec,
  createStadiumEvolutionOverlay,
} from './stadiumUpgrades';

describe('Visual 3D Stadium Evolution Engine (TASK-033)', () => {
  it('distinguishes Rookie Sandlot look-and-feel from Pro Major League multi-deck cathedrals & domes', () => {
    const sandlot = createInitialStadium('Backyard Sandlot', 'rookie', 'sandlot_commons');
    const sandlotSpec = computeStadiumVisualSpec('rookie', sandlot, ['turbo_fizz']);

    expect(sandlotSpec.architectureLabel).toBe('Neighborhood Sandlot');
    expect(sandlotSpec.fenceStyle).toBe('chain_link');
    expect(sandlotSpec.upperDeckCount).toBe(0);
    expect(sandlotSpec.hasJumbotron).toBe(false);
    expect(sandlotSpec.hasDomeTrusses).toBe(false);
    expect(sandlotSpec.billboards).toHaveLength(1);
    expect(sandlotSpec.billboards[0].title).toBe('TURBO FIZZ SODA');

    const majorsDome = createInitialStadium('Metro Colosseum', 'majors', 'neon_metro_dome');
    majorsDome.retiredNumbers = [{ jerseyNumber: 24, playerName: 'Kenji Sato' }];
    majorsDome.championshipPennants = [{ season: 1, leagueTier: 'majors' }];
    majorsDome.districtTiles[0].buildingId = 'nacho_cantina';

    const majorsSpec = computeStadiumVisualSpec('majors', majorsDome, ['turbo_fizz', 'pixel_pizza']);
    expect(majorsSpec.architectureLabel).toBe('Pro Major League Cathedral');
    expect(majorsSpec.upperDeckCount).toBe(2);
    expect(majorsSpec.hasLuxurySuites).toBe(true);
    expect(majorsSpec.hasDomeTrusses).toBe(true);
    expect(majorsSpec.hasJumbotron).toBe(true);
    expect(majorsSpec.hasMascotCannon).toBe(true);
    expect(majorsSpec.retiredNumbers).toHaveLength(1);
    expect(majorsSpec.pennantCount).toBe(1);
    expect(majorsSpec.skylineCount).toBeGreaterThanOrEqual(5);
  });

  it('constructs and disposes Three.js evolution meshes cleanly in Node/jsdom without WebGL', () => {
    const stadium = createInitialStadium('Grand Cathedral', 'majors', 'grand_cathedral');
    stadium.retiredNumbers = [
      { jerseyNumber: 7, playerName: 'Maya Ortiz' },
      { jerseyNumber: 42, playerName: 'Jackie Star' },
    ];
    stadium.championshipPennants = [{ season: 2, leagueTier: 'majors' }];

    const overlay = createStadiumEvolutionOverlay('majors', stadium, ['turbo_fizz']);
    expect(overlay.group.children.length).toBeGreaterThan(10);
    expect(() => overlay.dispose()).not.toThrow();
  });
});

describe('venue landmarks', () => {
  it.each([
    ['sandlot_commons', 'sandlot_pines'], ['brickyard_classic', 'emerald_monster'],
    ['grand_cathedral', 'brick_ivy'], ['cornfield_twilight', 'cornfield_barn'],
    ['harbor_shipyard', 'harbor_cranes'], ['bayfront_cove', 'splash_cove'],
    ['sunbelt_cactus', 'desert_mesas'], ['sakura_garden', 'sakura_blossoms'],
    ['high_altitude_mesa', 'mountain_peaks'], ['neon_metro_dome', 'neon_dome'],
  ] as const)('%s builds %s for the outfield and the home grandstand', (id, kind) => {
    const stadium = createInitialStadium('Home', 'majors', id);
    const overlay = createStadiumEvolutionOverlay('majors', stadium);
    try {
      expect(overlay.spec.landmarkKind).toBe(kind);
      expect(overlay.spec.hasSplashCove).toBe(id === 'bayfront_cove');
      const feature = overlay.group.getObjectByName(kind)!;
      const crest = overlay.group.getObjectByName('press box landmark')!;
      expect(feature.position.z).toBeLessThan(-40);
      expect(crest.position.z).toBeGreaterThan(10);
      expect(feature.children.length).toBeGreaterThan(0);
      for (const [model, preset] of [[feature, 'over_shoulder_batter'], [crest, 'over_shoulder_pitcher']] as const) {
        const shot = getCameraPresetPose(preset);
        const aspect = 390/260;
        const camera = new PerspectiveCamera(fitFieldOfView(shot.fov, aspect), aspect, .1, 180);
        camera.position.copy(shot.position);
        camera.lookAt(shot.lookAt.x, shot.lookAt.y, shot.lookAt.z);
        camera.updateMatrixWorld();
        const point = new Box3().setFromObject(model).getCenter(new Vector3()).project(camera);
        expect(Math.abs(point.x)).toBeLessThan(1);
        expect(Math.abs(point.y)).toBeLessThan(1);
        expect(Math.abs(point.z)).toBeLessThan(1);
      }
    } finally { overlay.dispose(); }
  });

  it('scales the Emerald Wall to 37 feet against the ten-foot Sandlot wall', () => {
    const wall = (id: 'brickyard_classic' | 'sandlot_commons') =>
      computeStadiumVisualSpec('rookie', createInitialStadium('Home', 'rookie', id)).leftWallHeightScale;
    expect(wall('brickyard_classic')).toBe(3.7);
    expect(wall('sandlot_commons')).toBe(1);
  });

  it('bobs the cove boats together with the park clock and settles them in reduced motion', () => {
    const overlay = createStadiumEvolutionOverlay('high_a', createInitialStadium('Bayfront', 'high_a', 'bayfront_cove'));
    try {
      const boat = overlay.group.getObjectByName('splash_cove')!;
      overlay.update!(0, true);
      const moored = boat.position.y;
      overlay.update!(1, false);
      expect(boat.position.y).not.toBe(moored);
      overlay.update!(2, true);
      expect(boat.position.y).toBe(moored);
      overlay.update!(3, true);
      expect(boat.position.y).toBe(moored);
    } finally { overlay.dispose(); }
  });

  it('releases shared scenery geometry and materials once on a venue switch', () => {
    const overlay = createStadiumEvolutionOverlay('rookie', createInitialStadium('Bayfront', 'rookie', 'bayfront_cove'));
    const hull = overlay.group.getObjectByName('splash_cove')!.children[0] as Mesh;
    const disposeGeometry = vi.spyOn(hull.geometry, 'dispose');
    const material = Array.isArray(hull.material) ? hull.material[0] : hull.material;
    const disposeMaterial = vi.spyOn(material, 'dispose');
    overlay.dispose();
    expect(disposeGeometry).toHaveBeenCalledTimes(1);
    expect(disposeMaterial).toHaveBeenCalledTimes(1);
  });

  it('keeps the cove beyond the outfield fence and extends it behind the right-center alley', () => {
    const overlay = createStadiumEvolutionOverlay('high_a', createInitialStadium('Bayfront', 'high_a', 'bayfront_cove'));
    try {
      const water = overlay.group.getObjectByName('cove water')!;
      overlay.group.updateMatrixWorld(true);
      function waterAt(x: number, z: number) {
        return new Raycaster(new Vector3(x, 5, z), new Vector3(0, -1, 0)).intersectObject(water);
      }
      expect(waterAt(8, -49)).toHaveLength(1);
      expect(waterAt(24, -50)).toHaveLength(1);
      expect(waterAt(16, -30)).toHaveLength(0);
      expect(waterAt(-16, -50)).toHaveLength(0);
    } finally { overlay.dispose(); }
  });
});
