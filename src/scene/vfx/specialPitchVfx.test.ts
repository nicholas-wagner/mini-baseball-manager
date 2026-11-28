import { PerspectiveCamera } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { createPortraitTraits } from '../../art/portraits/generatePortrait';
import type { PlayEvent } from '../../engine/models/playEvent';
import { createPaintedPlayerRig } from '../characters/paintedPlayer';
import { getOutlineMaterial } from '../core/toonMaterials';
import { diamondPlay, sampleLeg } from '../playback/diamondPlay';
import { buildPlayAudioSchedule } from '../playback/playAudioTimeline';
import { renderDiamondPlay, type DiamondCast } from '../playback/renderDiamondPlay';
import { createBallFlightVisual } from './ballFlightVisual';
import { BALL_TRAJECTORY_PRESETS } from './ballTrajectory';
import {
  applySpecialPitchTrajectoryOffset,
  computeSpecialPitchBallOpacity,
  createSpecialPitchVfx,
  formatSpecialPitchCallout,
  resolveSpecialPitchStyle,
  type SpecialPitchStyle,
} from './specialPitchVfx';
import { createBallparkVfxSystem } from './vfxSystem';

function makeEvent(partial: Partial<PlayEvent> = {}): PlayEvent {
  return {
    seq: 1,
    type: 'pitch_thrown',
    inning: 1,
    half: 'BOT',
    outsBefore: 0,
    outsAfter: 0,
    balls: 0,
    strikes: 1,
    awayScore: 0,
    homeScore: 0,
    basesAfter: [null, null, null],
    isClutchMoment: false,
    commentary: '',
    ...partial,
  };
}

function createTestCast(): DiamondCast {
  const options = {
    traits: createPortraitTraits(135),
    team: { primary: '#123456', secondary: '#eeeeee', accent: '#ffdd55', monogram: 'SP' },
    jerseyNumber: 34,
  };
  const cast = {} as DiamondCast;
  for (const actor of ['P', 'C', 'BAT', 'RUN', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'] as const) {
    const role = actor === 'P' ? 'pitcher' : actor === 'C' ? 'catcher' : actor === 'BAT' ? 'batter' : 'fielder';
    cast[actor] = createPaintedPlayerRig({ ...options, role }, 0, actor === 'RUN');
  }
  return cast;
}

describe('resolveSpecialPitchStyle', () => {
  it('maps the four signature pitch powers and preserves ice_veins over blazing_comet ballStyle', () => {
    expect(resolveSpecialPitchStyle('blazing_comet')).toBe('blazing_comet');
    expect(resolveSpecialPitchStyle('ghost_knuckle')).toBe('ghost_knuckle');
    expect(resolveSpecialPitchStyle('tornado_slider')).toBe('tornado_slider');
    expect(resolveSpecialPitchStyle('ice_veins')).toBe('ice_veins');
    expect(resolveSpecialPitchStyle('ice_veins', 'blazing_comet')).toBe('ice_veins');
  });

  it('maps heritage pitcher surges and ballStyle fallbacks while returning null for ordinary pitches', () => {
    expect(resolveSpecialPitchStyle('usa_eagle_soar')).toBe('heritage_surge');
    expect(resolveSpecialPitchStyle('can_moose_charge', 'line_drive')).toBe('heritage_surge');
    expect(resolveSpecialPitchStyle('jpn_kitsune_mirage')).toBe('heritage_surge');
    expect(resolveSpecialPitchStyle(undefined, 'ghost_knuckle')).toBe('ghost_knuckle');
    expect(resolveSpecialPitchStyle(undefined, 'tornado_slider')).toBe('tornado_slider');
    expect(resolveSpecialPitchStyle(undefined, 'blazing_comet')).toBe('blazing_comet');
    expect(resolveSpecialPitchStyle(undefined, 'fastball')).toBeNull();
    expect(resolveSpecialPitchStyle(undefined, 'line_drive')).toBeNull();
    expect(resolveSpecialPitchStyle(undefined, null)).toBeNull();
    expect(resolveSpecialPitchStyle()).toBeNull();
  });
});

describe('applySpecialPitchTrajectoryOffset', () => {
  const styles: readonly SpecialPitchStyle[] = [
    'blazing_comet',
    'ghost_knuckle',
    'tornado_slider',
    'ice_veins',
    'heritage_surge',
  ];

  it.each(styles)('keeps exact endpoints unchanged at t=0 and t=1 for %s', (style) => {
    const start = { x: 0.2, y: 1.35, z: -9.8 };
    const end = { x: -0.1, y: 0.8, z: 0.3 };
    applySpecialPitchTrajectoryOffset(start, style, 0, 'R');
    applySpecialPitchTrajectoryOffset(end, style, 1, 'R');
    expect(start).toEqual({ x: 0.2, y: 1.35, z: -9.8 });
    expect(end).toEqual({ x: -0.1, y: 0.8, z: 0.3 });
  });

  it.each(styles)('mirrors lateral X offset symmetrically for LHP vs RHP on %s', (style) => {
    for (const t of [0.22, 0.45, 0.67, 0.82]) {
      const right = { x: 0, y: 1, z: -5 };
      const left = { x: 0, y: 1, z: -5 };
      applySpecialPitchTrajectoryOffset(right, style, t, 'R');
      applySpecialPitchTrajectoryOffset(left, style, t, 'L');
      expect(left.x).toBeCloseTo(-right.x, 6);
      expect(left.y).toBeCloseTo(right.y, 6);
      expect(left.z).toBe(-5);
    }
  });

  it('gives blazing_comet a blistering +0.12 late rise/hop carry and tight laser dart', () => {
    const early = { x: 0, y: 1, z: -8 };
    const late = { x: 0, y: 1, z: -3 };
    applySpecialPitchTrajectoryOffset(early, 'blazing_comet', 0.25, 'R');
    applySpecialPitchTrajectoryOffset(late, 'blazing_comet', 2 / 3, 'R');
    expect(late.y - 1).toBeCloseTo(0.12, 3);
    expect(late.y).toBeGreaterThan(early.y);
    expect(Math.abs(late.x)).toBeGreaterThan(0.02);
    expect(Math.abs(late.x)).toBeLessThan(0.15);
  });

  it('gives ghost_knuckle dramatic mid-flight flutter zig-zag laterally and vertically', () => {
    const p1 = { x: 0, y: 1, z: -7 };
    const p2 = { x: 0, y: 1, z: -5 };
    const p3 = { x: 0, y: 1, z: -3 };
    applySpecialPitchTrajectoryOffset(p1, 'ghost_knuckle', 0.3, 'R');
    applySpecialPitchTrajectoryOffset(p2, 'ghost_knuckle', 0.5, 'R');
    applySpecialPitchTrajectoryOffset(p3, 'ghost_knuckle', 0.7, 'R');
    // sin(5πt) flips sign across 0.3 (-), 0.5 (+), 0.7 (-)
    expect(p1.x).toBeLessThan(-0.3);
    expect(p2.x).toBeGreaterThan(0.4);
    expect(p3.x).toBeLessThan(-0.3);
    // cos(4π * 0.5) = +1 while cos(4π * 0.25) = -1
    const quarter = { x: 0, y: 1, z: -7.5 };
    applySpecialPitchTrajectoryOffset(quarter, 'ghost_knuckle', 0.25, 'R');
    expect(quarter.y - 1).toBeLessThan(-0.15);
    expect(p2.y - 1).toBeGreaterThan(0.2);
  });

  it('gives tornado_slider a helical corkscrew spiral that snaps violently across the zone', () => {
    const sample = (t: number) => {
      const p = { x: 0, y: 1, z: -5 };
      applySpecialPitchTrajectoryOffset(p, 'tornado_slider', t, 'R');
      return p;
    };
    const crestY = sample(5 / 12); // sin(6π * 5/12) = sin(2.5π) = +1
    const troughY = sample(7 / 12); // sin(6π * 7/12) = sin(3.5π) = -1
    expect(crestY.y - 1).toBeGreaterThan(0.12);
    expect(troughY.y - 1).toBeLessThan(-0.18);
    // Late snap crosses violently with positive X bias for RHP
    const lateBreak = sample(2 / 3); // cos(4π) = +1 plus late snap
    expect(lateBreak.x).toBeGreaterThan(0.5);
  });

  it('gives ice_veins a flat early plane and surgical late corner snap with crisp flat drop', () => {
    const early = { x: 0, y: 1, z: -8 };
    const late = { x: 0, y: 1, z: -2.5 };
    applySpecialPitchTrajectoryOffset(early, 'ice_veins', 0.2, 'R');
    applySpecialPitchTrajectoryOffset(late, 'ice_veins', 0.75, 'R');
    expect(Math.abs(early.x)).toBeLessThan(0.03);
    expect(Math.abs(early.y - 1)).toBeLessThan(0.02);
    expect(late.x).toBeGreaterThan(0.2);
    expect(late.y - 1).toBeLessThan(-0.1);
  });
});

describe('computeSpecialPitchBallOpacity', () => {
  it('phases ghost_knuckle translucent down to 0.14 mid-flight and materializes over the plate', () => {
    expect(computeSpecialPitchBallOpacity('ghost_knuckle', 0, false)).toBe(1);
    expect(computeSpecialPitchBallOpacity('ghost_knuckle', 0.15, false)).toBe(1);
    expect(computeSpecialPitchBallOpacity('ghost_knuckle', 0.45, false)).toBeCloseTo(0.14, 4);
    expect(computeSpecialPitchBallOpacity('ghost_knuckle', 0.56, false)).toBeCloseTo(0.14, 4);
    expect(computeSpecialPitchBallOpacity('ghost_knuckle', 0.68, false)).toBeCloseTo(0.14, 4);
    expect(computeSpecialPitchBallOpacity('ghost_knuckle', 0.8, false)).toBeGreaterThan(0.4);
    expect(computeSpecialPitchBallOpacity('ghost_knuckle', 0.95, false)).toBe(1);
    expect(computeSpecialPitchBallOpacity('ghost_knuckle', 1, false)).toBe(1);
  });

  it('uses a gentler 0.55 opacity floor for ghost_knuckle under reducedMotion', () => {
    expect(computeSpecialPitchBallOpacity('ghost_knuckle', 0.55, true)).toBeCloseTo(0.55, 4);
    expect(computeSpecialPitchBallOpacity('ghost_knuckle', 0.1, true)).toBe(1);
    expect(computeSpecialPitchBallOpacity('ghost_knuckle', 0.95, true)).toBe(1);
  });

  it('keeps all other pitch styles fully opaque', () => {
    for (const style of ['blazing_comet', 'tornado_slider', 'ice_veins', 'heritage_surge', null] as const) {
      expect(computeSpecialPitchBallOpacity(style, 0.55, false)).toBe(1);
      expect(computeSpecialPitchBallOpacity(style, 0.55, true)).toBe(1);
    }
  });
});

describe('createSpecialPitchVfx & ballFlightVisual', () => {
  it('updates reusable flight rings/sparks, pulses mound aura, hides cleanly, and disposes without error', () => {
    const fx = createSpecialPitchVfx();
    try {
      expect(fx.flightGroup.visible).toBe(false);
      expect(fx.moundAuraGroup.visible).toBe(false);

      for (const style of ['blazing_comet', 'ghost_knuckle', 'tornado_slider', 'ice_veins', 'heritage_surge'] as const) {
        fx.updateFlight(style, { x: 0.1, y: 1.1, z: -4.2 }, 0.52, '#FF4D6D', false);
        expect(fx.flightGroup.visible).toBe(true);
      }

      fx.hideFlight();
      expect(fx.flightGroup.visible).toBe(false);

      const mound = { x: 0, y: 0.24, z: -10.2 };
      fx.setMoundAura('#00E5FF', mound, 0.4, false);
      expect(fx.moundAuraGroup.visible).toBe(true);
      expect(fx.moundAuraGroup.position.z).toBeCloseTo(-10.2, 4);
      const scaleA = fx.moundAuraGroup.children[0].scale.x;

      fx.setMoundAura('#00E5FF', mound, 0.72, false);
      const scaleB = fx.moundAuraGroup.children[0].scale.x;
      expect(scaleB).not.toBeCloseTo(scaleA, 3);

      fx.setMoundAura('#00E5FF', mound, 0.4, true);
      const reducedA = fx.moundAuraGroup.children[0].scale.x;
      fx.setMoundAura('#00E5FF', mound, 0.9, true);
      expect(fx.moundAuraGroup.children[0].scale.x).toBeCloseTo(reducedA, 6);

      fx.setMoundAura(null, mound, 1, false);
      expect(fx.moundAuraGroup.visible).toBe(false);
    } finally {
      expect(() => fx.dispose()).not.toThrow();
    }
  });

  it('fades baseball + dedicated outline opacity and scales trail width without mutating shared outline material', () => {
    const visual = createBallFlightVisual();
    const sharedOutline = getOutlineMaterial();
    const originalOpacity = sharedOutline.opacity;
    try {
      const spec = BALL_TRAJECTORY_PRESETS.fastball;
      visual.draw(spec, 0.55, '#9B5DE5', 1, undefined, 1, 1.5, 0.14, 1.8);
      const ballMesh = visual.group.children[2] as import('three').Mesh<
        import('three').BufferGeometry,
        import('three').MeshBasicMaterial
      >;
      const outlineMesh = ballMesh.children[0] as import('three').Mesh<
        import('three').BufferGeometry,
        import('three').MeshBasicMaterial
      >;
      expect(ballMesh.material.opacity).toBeCloseTo(0.14, 4);
      expect(outlineMesh.material).not.toBe(sharedOutline);
      expect(outlineMesh.material.opacity).toBeLessThan(0.1);
      expect(sharedOutline.opacity).toBe(originalOpacity);
    } finally {
      visual.dispose();
    }
  });
});

describe('diamondPlay, renderDiamondPlay & playAudioTimeline special pitch integration', () => {
  it('carries ballStyle on DiamondPlay.power and applies special pitch trajectory offset in sampleLeg', () => {
    const event = makeEvent({
      outcome: 'strikeout',
      pitchThrown: {
        pitchType: 'knuckleball',
        mph: 74,
        isFavoritePitch: true,
        isWeakPitchForPitcher: false,
        batterAffinity: 'weak',
      },
      ballFlight: { style: 'ghost_knuckle', landingX: 0, landingZ: 0.4, apexY: 2.0, durationSec: 0.7 },
      specialPowerTriggered: {
        actor: 'pitcher',
        powerId: 'ghost_knuckle',
        calloutText: 'GHOST KNUCKLE!',
        vfxColor: '#9B5DE5',
      },
    });
    const normal = diamondPlay('swinging_third', undefined, makeEvent({ outcome: 'strikeout', pitchThrown: event.pitchThrown }));
    const special = diamondPlay('swinging_third', undefined, event);

    expect(special.power?.ballStyle).toBe('ghost_knuckle');
    const inferredFromPowerId = diamondPlay(
      'swinging_third',
      undefined,
      makeEvent({
        outcome: 'strikeout',
        specialPowerTriggered: {
          actor: 'pitcher',
          powerId: 'tornado_slider',
          calloutText: 'TORNADO SLIDER!',
          vfxColor: '#00E5FF',
        },
      }),
    );
    expect(inferredFromPowerId.power?.ballStyle).toBe('tornado_slider');
    const a = { x: 0.2, y: 1.4, z: -10 };
    const b = { x: 0, y: 0.7, z: 0.3 };
    const baseMid = sampleLeg(normal.legs[0], a, b, 0.5, 'R');
    const specialMidR = sampleLeg(special.legs[0], a, b, 0.5, 'R');
    const specialMidL = sampleLeg(special.legs[0], a, b, 0.5, 'L');
    expect(specialMidR.x - baseMid.x).toBeGreaterThan(0.4);
    expect(specialMidL.x - sampleLeg(normal.legs[0], a, b, 0.5, 'L').x).toBeCloseTo(-(specialMidR.x - baseMid.x), 5);
  });

  it('renders live 3D special pitch VFX, fades ghost_knuckle ball, clears cleanly, and spawns release callouts with MPH', () => {
    const cases = [
      { powerId: 'blazing_comet', mph: 103, expectedCallout: '☄️ BLAZING COMET! 103 MPH', color: '#FF4D6D' },
      { powerId: 'ghost_knuckle', mph: 73, expectedCallout: '👻 GHOST KNUCKLE! 73 MPH', color: '#9B5DE5' },
      { powerId: 'tornado_slider', mph: 88, expectedCallout: '🌪️ TORNADO SLIDER! 88 MPH', color: '#00E5FF' },
      { powerId: 'ice_veins', mph: 96, expectedCallout: '🧊 ICE VEINS! 96 MPH', color: '#4CC3FF' },
    ] as const;

    const cast = createTestCast();
    const camera = new PerspectiveCamera(42, 1.5, 0.2, 180);
    const vfx = createBallparkVfxSystem();
    const calloutSpy = vi.spyOn(vfx, 'spawnComicCallout');
    const updateFlightSpy = vi.spyOn(vfx.specialPitch, 'updateFlight');

    try {
      for (const spec of cases) {
        calloutSpy.mockClear();
        updateFlightSpy.mockClear();
        const event = makeEvent({
          outcome: 'strikeout',
          pitchThrown: {
            pitchType: 'four_seam',
            mph: spec.mph,
            isFavoritePitch: true,
            isWeakPitchForPitcher: false,
            batterAffinity: 'neutral',
          },
          specialPowerTriggered: {
            actor: 'pitcher',
            powerId: spec.powerId,
            calloutText: spec.powerId.toUpperCase(),
            vfxColor: spec.color,
          },
        });
        const play = diamondPlay('swinging_third', undefined, event);
        const pitch = play.legs[0];

        // Pre-release: mound aura glows, flight VFX hidden
        renderDiamondPlay(play, cast, 'R', pitch.start - 0.12, pitch.start - 0.14, camera, 320, vfx, 'R');
        expect(vfx.specialPitch.moundAuraGroup.visible).toBe(true);
        expect(vfx.specialPitch.flightGroup.visible).toBe(false);

        // Crossing pitch release: spawns bold comic starburst with MPH
        renderDiamondPlay(play, cast, 'R', pitch.start + 0.02, pitch.start - 0.02, camera, 320, vfx, 'R');
        expect(calloutSpy).toHaveBeenCalledWith(spec.expectedCallout, expect.anything(), spec.color, 'contact');
        expect(updateFlightSpy).toHaveBeenCalled();
        expect(vfx.specialPitch.flightGroup.visible).toBe(true);
        expect(vfx.specialPitch.moundAuraGroup.visible).toBe(false);

        // Mid-flight opacity check for ghost_knuckle vs solid styles
        const mid = pitch.start + (pitch.end - pitch.start) * 0.55;
        renderDiamondPlay(play, cast, 'R', mid, mid - 0.01, camera, 320, vfx, 'R');
        const ballMesh = vfx.ball.group.children[2] as import('three').Mesh<
          import('three').BufferGeometry,
          import('three').MeshBasicMaterial
        >;
        if (spec.powerId === 'ghost_knuckle') {
          expect(ballMesh.material.opacity).toBeCloseTo(0.14, 3);
        } else {
          expect(ballMesh.material.opacity).toBeCloseTo(1, 3);
        }

        // vfx.clear() hides both flight & mound aura cleanly
        vfx.clear();
        expect(vfx.specialPitch.flightGroup.visible).toBe(false);
        expect(vfx.specialPitch.moundAuraGroup.visible).toBe(false);

        // After pitch ends: flight VFX stays hidden
        renderDiamondPlay(play, cast, 'R', pitch.end + 0.05, pitch.end - 0.01, camera, 320, vfx, 'R');
        expect(vfx.specialPitch.flightGroup.visible).toBe(false);
      }

      // Format helper without MPH omits MPH suffix
      expect(formatSpecialPitchCallout('ice_veins').text).toBe('🧊 ICE VEINS!');
    } finally {
      Object.values(cast).forEach((rig) => rig.dispose());
      vfx.dispose();
    }
  });

  it('schedules frame-locked special pitch sound cues right at pitch.start for every pitcher power', () => {
    const cases = [
      { powerId: 'blazing_comet', expectedCue: 'comet_pitch' },
      { powerId: 'ghost_knuckle', expectedCue: 'knuckle_warble' },
      { powerId: 'tornado_slider', expectedCue: 'tornado_whoosh' },
      { powerId: 'ice_veins', expectedCue: 'clutch_stinger' },
      { powerId: 'jpn_kitsune_mirage', expectedCue: 'heritage_power_surge' },
    ] as const;

    for (const { powerId, expectedCue } of cases) {
      const play = diamondPlay('swinging_third');
      play.power = {
        actor: 'pitcher',
        powerId,
        calloutText: powerId.toUpperCase(),
        vfxColor: '#4CC3FF',
      };
      const schedule = buildPlayAudioSchedule(play);
      const pitch = play.legs[0];
      const matched = schedule.filter((item) => item.cue === expectedCue);
      expect(matched, `${powerId} -> ${expectedCue}`).toHaveLength(1);
      expect(matched[0].at).toBeCloseTo(pitch.start, 6);
    }
  });
});
