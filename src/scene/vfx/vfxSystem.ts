import * as THREE from 'three';
import { attachComicOutline, createToonMaterial } from '../core/toonMaterials';
import {
  BALL_TRAJECTORY_PRESETS,
  sampleBallTrajectory,
  type BallTrajectorySpec,
  type BallVfxStyle,
} from './ballTrajectory';

interface ActiveBallFlight {
  spec: BallTrajectorySpec;
  elapsed: number;
}

interface ActiveCallout {
  sprite: THREE.Sprite;
  texture: THREE.CanvasTexture;
  elapsed: number;
  duration: number;
  startY: number;
}

export interface BallparkVfxSystem {
  group: THREE.Group;
  launchBall: (style: BallVfxStyle) => { cameraShake: number };
  spawnComicCallout: (text: string, pos: { x: number; y: number; z: number }, bgColor?: string) => void;
  update: (dtSec: number) => void;
  dispose: () => void;
}

function createComicCalloutTexture(text: string, bgColor: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Spiky comic starburst bubble
    ctx.save();
    ctx.translate(256, 96);
    ctx.beginPath();
    const spikes = 14;
    for (let i = 0; i < spikes * 2; i += 1) {
      const rX = i % 2 === 0 ? 236 : 186;
      const rY = i % 2 === 0 ? 84 : 58;
      const a = (i * Math.PI) / spikes;
      const px = Math.cos(a) * rX;
      const py = Math.sin(a) * rY;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = bgColor;
    ctx.fill();
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#181B2C';
    ctx.stroke();
    ctx.restore();

    ctx.font = '900 44px Bungee, Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 11;
    ctx.strokeStyle = '#181B2C';
    ctx.strokeText(text, 256, 98);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(text, 256, 98);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createBallparkVfxSystem(): BallparkVfxSystem {
  const group = new THREE.Group();

  // Active 3D baseball
  const ballMat = createToonMaterial(0xfbf4e4);
  const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 12), ballMat);
  attachComicOutline(ballMesh, 1.18);
  ballMesh.visible = false;
  group.add(ballMesh);

  // Stylized cartoon bead trail (16 glowing trail orbs following behind the ball!)
  const trailCount = 16;
  const trailMeshes: THREE.Mesh[] = [];
  const trailMaterials: THREE.MeshBasicMaterial[] = [];
  const trailGeo = new THREE.SphereGeometry(0.17, 10, 8);
  for (let i = 0; i < trailCount; i += 1) {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffc300,
      transparent: true,
      opacity: 0,
    });
    const m = new THREE.Mesh(trailGeo, mat);
    m.visible = false;
    trailMaterials.push(mat);
    trailMeshes.push(m);
    group.add(m);
  }

  let activeFlight: ActiveBallFlight | null = null;
  const callouts: ActiveCallout[] = [];

  const spawnComicCallout = (
    text: string,
    pos: { x: number; y: number; z: number },
    bgColor = '#FFC300',
  ) => {
    const texture = createComicCalloutTexture(text, bgColor);
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(pos.x, pos.y, pos.z);
    sprite.scale.set(0.01, 0.01, 1);
    sprite.renderOrder = 20;
    group.add(sprite);
    callouts.push({ sprite, texture, elapsed: 0, duration: 1.35, startY: pos.y });
  };

  const launchBall = (style: BallVfxStyle): { cameraShake: number } => {
    const spec = BALL_TRAJECTORY_PRESETS[style];
    activeFlight = { spec, elapsed: 0 };
    ballMesh.visible = true;

    trailMaterials.forEach((mat, idx) => {
      mat.color.set(idx % 2 === 0 ? spec.trailColor : spec.secondaryColor);
    });

    const calloutPos =
      style === 'moonshot_hr' || style === 'line_drive' || style === 'ninja_bunt'
        ? { x: 0, y: 2.6, z: -1.5 }
        : { x: 0.4, y: 2.6, z: -8.5 };
    spawnComicCallout(spec.calloutText, calloutPos, spec.trailColor);

    return { cameraShake: spec.cameraShake };
  };

  const update = (dtSec: number) => {
    if (activeFlight) {
      activeFlight.elapsed += dtSec;
      const progress = activeFlight.elapsed / activeFlight.spec.durationSec;

      if (progress >= 1.15) {
        activeFlight = null;
        ballMesh.visible = false;
        trailMeshes.forEach((m) => {
          m.visible = false;
        });
      } else {
        const clampedP = Math.min(1, progress);
        const pos = sampleBallTrajectory(activeFlight.spec, clampedP);
        ballMesh.position.set(pos.x, pos.y, pos.z);
        ballMesh.rotation.x += dtSec * 18;
        ballMesh.rotation.z += dtSec * 12;

        // Update trailing energy beads
        for (let i = 0; i < trailCount; i += 1) {
          const lag = (i + 1) * 0.028;
          const sampleT = clampedP - lag;
          const mesh = trailMeshes[i];
          const mat = trailMaterials[i];
          if (sampleT < 0 || progress > 1) {
            mesh.visible = false;
          } else {
            mesh.visible = true;
            const tp = sampleBallTrajectory(activeFlight.spec, sampleT);
            mesh.position.set(tp.x, tp.y, tp.z);
            const fade = 1 - i / trailCount;
            mesh.scale.setScalar(0.35 + fade * 0.95);
            mat.opacity = fade * 0.78;
          }
        }
      }
    }

    for (let i = callouts.length - 1; i >= 0; i -= 1) {
      const c = callouts[i];
      c.elapsed += dtSec;
      const t = c.elapsed / c.duration;
      if (t >= 1) {
        group.remove(c.sprite);
        c.sprite.material.dispose();
        c.texture.dispose();
        callouts.splice(i, 1);
      } else {
        // Elastic comic pop-in + gentle upward drift
        const pop = t < 0.18 ? (t / 0.18) * 1.18 : 1.18 - Math.min(0.18, (t - 0.18) * 0.9);
        c.sprite.scale.set(4.1 * pop, 1.55 * pop, 1);
        c.sprite.position.y = c.startY + t * 1.35;
        c.sprite.material.opacity = t > 0.72 ? (1 - t) / 0.28 : 1;
      }
    }
  };

  const dispose = () => {
    trailGeo.dispose();
    trailMaterials.forEach((m) => m.dispose());
    callouts.forEach((c) => {
      c.sprite.material.dispose();
      c.texture.dispose();
    });
  };

  return { group, launchBall, spawnComicCallout, update, dispose };
}
