import * as THREE from 'three';
import { createClayTexture, createFloodlights, createHorizon } from './parkScenery';
import { createToonMaterial, getToonGradientMap } from '../core/toonMaterials';

export interface BallparkEnvironment {
  group: THREE.Group;
  update: (timeSec: number, crowdExcitement: number) => void;
  dispose: () => void;
}

function createMowedTurfTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const stripeWidth = 128;
    for (let x = 0; x < 512; x += stripeWidth) {
      ctx.fillStyle = (x / stripeWidth) % 2 === 0 ? '#2FB356' : '#279E4B';
      ctx.fillRect(x, 0, stripeWidth, 512);
    }
    ctx.fillStyle = 'rgba(241, 247, 176, 0.07)';
    for (let y = 0; y < 512; y += stripeWidth * 2) {
      ctx.fillRect(0, y, 512, stripeWidth);
    }
    // Subtle organic grain dots
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    for (let i = 0; i < 400; i += 1) {
      ctx.fillRect((i * 73) % 512, (i * 137) % 512, 3, 3);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createBillboardTexture(
  title: string,
  subtitle: string,
  bg: string,
  accent: string,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 512, 160);
    ctx.strokeStyle = '#181B2C';
    ctx.lineWidth = 14;
    ctx.strokeRect(7, 7, 498, 146);

    ctx.fillStyle = accent;
    ctx.fillRect(18, 18, 476, 18);

    ctx.font = '900 54px Bungee, Fredoka, sans-serif';
    ctx.fillStyle = '#FBF4E4';
    ctx.strokeStyle = '#181B2C';
    ctx.lineWidth = 9;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeText(title, 256, 86);
    ctx.fillText(title, 256, 86);

    ctx.font = '800 22px Fredoka, sans-serif';
    ctx.fillStyle = accent;
    ctx.fillText(subtitle, 256, 132);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createScoreboardTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#1B4332';
    ctx.fillRect(0, 0, 512, 256);
    ctx.strokeStyle = '#181B2C';
    ctx.lineWidth = 14;
    ctx.strokeRect(7, 7, 498, 242);

    ctx.fillStyle = '#FFC300';
    ctx.font = '900 34px Bungee, Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SANDLOT PARK', 256, 52);

    ctx.fillStyle = '#102A1F';
    ctx.fillRect(36, 78, 440, 142);

    ctx.fillStyle = '#FFD166';
    ctx.font = '700 32px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('GUEST  0 1 0 2   3', 56, 128);
    ctx.fillText('HOME   1 0 2 1   4', 56, 184);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createMiniBallpark(): BallparkEnvironment {
  const group = new THREE.Group();

  const horizon = createHorizon();
  group.add(horizon, createFloodlights());
  // Lush mowed turf field
  const turfTex = createMowedTurfTexture();
  const field = new THREE.Mesh(
    new THREE.CircleGeometry(66, 48),
    new THREE.MeshToonMaterial({ map: turfTex, gradientMap: getToonGradientMap() }),
  );
  field.rotation.x = -Math.PI / 2;
  field.receiveShadow = true;
  group.add(field);

  // Warm clay infield diamond arc
  const clay = createClayTexture();
  const dirtMat = new THREE.MeshToonMaterial({ map: clay, gradientMap: getToonGradientMap() });
  const infieldDirt = new THREE.Mesh(new THREE.CircleGeometry(15.2, 32), dirtMat);
  infieldDirt.rotation.x = -Math.PI / 2;
  infieldDirt.position.set(0, 0.015, -10.5);
  infieldDirt.receiveShadow = true;
  group.add(infieldDirt);

  // Inner grass cutout so basepaths shine!
  const infieldTurf = turfTex.clone();
  infieldTurf.repeat.set(0.9, 0.9);
  const innerGrass = new THREE.Mesh(new THREE.PlaneGeometry(11.6, 11.6),
    new THREE.MeshToonMaterial({ map: infieldTurf, gradientMap: getToonGradientMap() }));
  innerGrass.rotation.x = -Math.PI / 2;
  innerGrass.rotation.z = Math.PI / 4;
  innerGrass.position.set(0, 0.025, -10.0);
  innerGrass.receiveShadow = true;
  group.add(innerGrass);

  // Home plate dirt circle & Pitcher's mound
  const homeDirt = new THREE.Mesh(new THREE.CircleGeometry(3.2, 24), dirtMat);
  homeDirt.rotation.x = -Math.PI / 2;
  homeDirt.position.set(0, 0.02, 0.2);
  group.add(homeDirt);

  const mound = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2.2, 0.26, 20), dirtMat);
  mound.position.set(0, 0.13, -10.2);
  mound.receiveShadow = true;
  group.add(mound);

  const rubber = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.06, 0.2), createToonMaterial(0xfbf4e4));
  rubber.position.set(0, 0.27, -10.2);
  group.add(rubber);

  // Home plate & 1st/2nd/3rd bases
  const baseMat = createToonMaterial(0xfbf4e4);
  const baseGeo = new THREE.BoxGeometry(0.72, 0.08, 0.72);
  const basePositions: readonly [number, number][] = [
    [9.8, -9.8],
    [0, -19.6],
    [-9.8, -9.8],
  ];
  for (const [bx, bz] of basePositions) {
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.set(bx, 0.05, bz);
    base.rotation.y = Math.PI / 4;
    group.add(base);
  }

  const plateShape = new THREE.Shape();
  plateShape.moveTo(-0.38, 0.38);
  plateShape.lineTo(0.38, 0.38);
  plateShape.lineTo(0.38, 0);
  plateShape.lineTo(0, -0.38);
  plateShape.lineTo(-0.38, 0);
  plateShape.closePath();
  const plate = new THREE.Mesh(new THREE.ShapeGeometry(plateShape), baseMat);
  plate.rotation.x = -Math.PI / 2;
  plate.position.y = 0.05;
  group.add(plate);

  // Crisp white chalk foul lines
  const chalkMat = new THREE.MeshBasicMaterial({ color: 0xfbf4e4 });
  const boxOutline = new THREE.Shape();
  boxOutline.moveTo(-0.64, -1.32);
  boxOutline.lineTo(0.64, -1.32);
  boxOutline.lineTo(0.64, 1.32);
  boxOutline.lineTo(-0.64, 1.32);
  boxOutline.closePath();
  const inside = new THREE.Path();
  inside.moveTo(-0.58, -1.26);
  inside.lineTo(-0.58, 1.26);
  inside.lineTo(0.58, 1.26);
  inside.lineTo(0.58, -1.26);
  inside.closePath();
  boxOutline.holes.push(inside);
  const boxGeo = new THREE.ShapeGeometry(boxOutline);
  for (const x of [-1.18, 1.18]) {
    const box = new THREE.Mesh(boxGeo, chalkMat);
    box.rotation.x = -Math.PI / 2;
    box.position.set(x, 0.04, 0);
    group.add(box);
  }

  const foulLineGeo = new THREE.PlaneGeometry(0.22, 45);
  const leftFoul = new THREE.Mesh(foulLineGeo, chalkMat);
  leftFoul.rotation.x = -Math.PI / 2;
  leftFoul.rotation.z = Math.PI / 4;
  leftFoul.position.set(-15.9, 0.032, -15.9);
  group.add(leftFoul);

  const rightFoul = new THREE.Mesh(foulLineGeo, chalkMat);
  rightFoul.rotation.x = -Math.PI / 2;
  rightFoul.rotation.z = -Math.PI / 4;
  rightFoul.position.set(15.9, 0.032, -15.9);
  group.add(rightFoul);

  // Curved iconic green outfield fence + yellow home-run cap rail
  const wallRadius = 40;
  const track = new THREE.Mesh(
    new THREE.RingGeometry(wallRadius - 2.2, wallRadius, 48, 1, Math.PI * 0.22, Math.PI * 0.56),
    dirtMat,
  );
  track.rotation.x = -Math.PI / 2;
  track.position.set(0, 0.025, -3);
  group.add(track);
  const wallMat = createToonMaterial(0x1f6e43);
  const hrRailMat = createToonMaterial(0xffc300);
  const segments = 18;
  for (let i = 0; i < segments; i += 1) {
    const startAngle = -Math.PI * 0.78 + (i / segments) * (Math.PI * 0.56);
    const midAngle = startAngle + (Math.PI * 0.56) / segments / 2;
    const x = Math.cos(midAngle) * wallRadius;
    const z = Math.sin(midAngle) * wallRadius - 3;

    const panel = new THREE.Mesh(new THREE.BoxGeometry(4.1, 3.2, 0.6), wallMat);
    panel.position.set(x, 1.6, z);
    panel.lookAt(0, 1.6, -3);
    panel.receiveShadow = true;
    group.add(panel);

    const rail = new THREE.Mesh(new THREE.BoxGeometry(4.15, 0.28, 0.75), hrRailMat);
    rail.position.set(x, 3.28, z);
    rail.lookAt(0, 3.28, -3);
    group.add(rail);
  }

  // Tall yellow foul poles
  const poleGeo = new THREE.CylinderGeometry(0.16, 0.16, 13, 10);
  const leftPole = new THREE.Mesh(poleGeo, hrRailMat);
  leftPole.position.set(-28.5, 6.5, -28.5);
  group.add(leftPole);

  const rightPole = new THREE.Mesh(poleGeo, hrRailMat);
  rightPole.position.set(28.5, 6.5, -28.5);
  group.add(rightPole);

  // 90s Parody Sponsor Outfield Billboards!
  const sponsors: readonly { title: string; sub: string; bg: string; acc: string; x: number; z: number }[] = [
    { title: 'TURBO FIZZ', sub: 'RADICAL CITRUS SODA', bg: '#FF4D6D', acc: '#FFC300', x: -16, z: -38.5 },
    { title: 'PIXEL PIZZA', sub: 'HOT SLICES IN 9 INNINGS', bg: '#0096C7', acc: '#FFD166', x: 16, z: -38.5 },
    { title: 'RAD SHADES', sub: '90s UV PROTECTION', bg: '#7209B7', acc: '#00E5FF', x: 29, z: -31 },
  ];
  for (const s of sponsors) {
    const tex = createBillboardTexture(s.title, s.sub, s.bg, s.acc);
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(9.2, 2.9, 0.4),
      new THREE.MeshBasicMaterial({ map: tex }),
    );
    board.position.set(s.x, 4.9, s.z);
    board.lookAt(0, 4.9, -4);
    group.add(board);
  }

  // Towering Center-Field Classic Scoreboard
  const sbTex = createScoreboardTexture();
  const scoreboard = new THREE.Mesh(
    new THREE.BoxGeometry(14, 7, 0.9),
    new THREE.MeshBasicMaterial({ map: sbTex }),
  );
  scoreboard.position.set(0, 7.6, -44.2);
  group.add(scoreboard);

  // Scoreboard support legs
  const legMat = createToonMaterial(0x181b2c);
  [-5, 5].forEach((lx) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.7, 5, 0.7), legMat);
    leg.position.set(lx, 2.5, -44.5);
    group.add(leg);
  });

  // Backstop behind home plate + poles + cozy behind-home bleachers so Pitcher OTS feels packed!
  const backstopFrameMat = createToonMaterial(0x1b4332);
  const backstopWall = new THREE.Mesh(new THREE.BoxGeometry(11.5, 1.45, 0.55), backstopFrameMat);
  backstopWall.position.set(0, 0.72, 6.8);
  group.add(backstopWall);

  const backstopTrim = new THREE.Mesh(new THREE.BoxGeometry(11.6, 0.2, 0.65), hrRailMat);
  backstopTrim.position.set(0, 1.5, 6.8);
  group.add(backstopTrim);

  const parkName = createBillboardTexture('SANDLOT PARK', 'ROOKIE SANDLOT LEAGUE', '#214c40', '#ffd166');
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 1.95),
    new THREE.MeshBasicMaterial({ map: parkName }));
  sign.position.set(0, 7.96, 13.34);
  sign.rotation.y = Math.PI;
  group.add(sign);

  const bunting = new THREE.Group();
  for (const [outside, inside, color] of [
    [0.88, 0.62, 0xe5414b], [0.62, 0.38, 0xfff2d8], [0.38, 0.06, 0x263f60],
  ] as const) {
    const band = new THREE.Mesh(
      new THREE.RingGeometry(inside, outside, 24, 1, Math.PI, Math.PI),
      new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }),
    );
    band.scale.set(1.4, 1, 1);
    bunting.add(band);
  }
  for (const x of [-4.3, -1.65, 1.65, 4.3]) {
    const drape = bunting.clone();
    drape.position.set(x, 1.35, 6.51);
    group.add(drape);
  }

  // Backstop net support poles + airy translucent net screen
  const postMat = createToonMaterial(0x2d3448);
  [-5.2, -1.8, 1.8, 5.2].forEach((px) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 5.8, 8), postMat);
    post.position.set(px, 3.4, 6.8);
    group.add(post);
  });
  const topBar = new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.16, 0.16), postMat);
  topBar.position.set(0, 6.2, 6.8);
  group.add(topBar);

  const netLines: number[] = [];
  for (let x = -5.2; x < 5.21; x += 0.45) {
    netLines.push(x, 1.5, 6.8, x, 6.2, 6.8);
  }
  for (let y = 1.5; y < 6.2; y += 0.45) {
    netLines.push(-5.2, y, 6.8, 5.2, y, 6.8);
  }
  const netGeo = new THREE.BufferGeometry();
  netGeo.setAttribute('position', new THREE.Float32BufferAttribute(netLines, 3));
  group.add(new THREE.LineSegments(netGeo, new THREE.LineBasicMaterial({
    color: 0x203c48, transparent: true, opacity: 0.16, depthWrite: false,
  })));

  // Minor-league Wooden Bleachers along 1st, 3rd & Behind Home Plate + Instanced Cheering Mini Crowd!
  const benchMat = createToonMaterial(0xc9884f);
  const crowdSlots: { x: number; y: number; z: number; phase: number; color: number }[] = [];
  const fanColors = [0xe63946, 0x0096c7, 0xffc300, 0xff4d6d, 0x9b5de5, 0xfbf4e4, 0x2fb356];

  // Behind-home-plate grandstand (visible right over the pitcher's shoulder!)
  for (let row = 0; row < 4; row += 1) {
    const zRow = 9.2 + row * 1.45;
    const yRow = 0.8 + row * 0.95;
    const bench = new THREE.Mesh(new THREE.BoxGeometry(16, 0.45, 1.2), benchMat);
    bench.position.set(0, yRow, zRow);
    group.add(bench);

    for (let sx = -6.8; sx <= 6.8; sx += 1.35) {
      crowdSlots.push({
        x: sx,
        y: yRow + 0.68,
        z: zRow,
        phase: (sx + row * 1.9) * 0.8,
        color: fanColors[Math.abs(Math.round(sx * 4 + row * 3)) % fanColors.length],
      });
    }
  }

  // Cozy press box awning above home-plate stands
  const pressBox = new THREE.Mesh(new THREE.BoxGeometry(10, 2.2, 2.4), createToonMaterial(0x1b4332));
  pressBox.position.set(0, 5.6, 15.2);
  group.add(pressBox);
  const pressRoof = new THREE.Mesh(new THREE.BoxGeometry(11.4, 0.35, 3.2), createToonMaterial(0xe63946));
  pressRoof.position.set(0, 6.85, 15.0);
  group.add(pressRoof);
  const pressWindow = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.95, 0.1), createToonMaterial(0x9be7ff));
  pressWindow.position.set(0, 5.65, 13.98);
  group.add(pressWindow);

  // Split the press-box glazing into panes. Its roof carries home-team pennants.
  const mullion = new THREE.BoxGeometry(0.12, 0.95, 0.12);
  for (const x of [-3.1, -1.55, 0, 1.55, 3.1]) {
    const bar = new THREE.Mesh(mullion, postMat);
    bar.position.set(x, 5.65, 13.91);
    group.add(bar);
  }
  const flag = new THREE.Shape();
  flag.moveTo(0, 0);
  flag.quadraticCurveTo(0.72, 0.08, 1.8, -0.16);
  flag.lineTo(0, -0.75);
  flag.closePath();
  const pennant = new THREE.ShapeGeometry(flag);
  for (const x of [-4.8, 4.8]) {
    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 2.2, 8), postMat);
    staff.position.set(x, 8.0, 14.1);
    group.add(staff);
    const fabric = new THREE.MeshBasicMaterial({ color: x < 0 ? 0xf24c56 : 0xffcc52, side: THREE.DoubleSide });
    const banner = new THREE.Mesh(pennant, fabric);
    banner.position.set(x, 9.05, 14.1);
    group.add(banner);
  }

  // Cute stylized 90s cartoon trees ringing the park horizon
  const trunkMat = createToonMaterial(0x8d5524);
  const leafMat = createToonMaterial(0x1e8449);
  const treePositions: readonly [number, number][] = [
    [-22, 16],
    [-14, 20],
    [14, 20],
    [22, 16],
    [-34, -22],
    [34, -22],
  ];
  const canopyGeo = new THREE.IcosahedronGeometry(1, 1);
  const leafLight = createToonMaterial(0x439a58);
  for (const [tx, tz] of treePositions) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, 2.8, 8), trunkMat);
    trunk.position.set(tx, 1.4, tz);
    group.add(trunk);
    const canopy = new THREE.Mesh(canopyGeo, leafMat);
    canopy.scale.set(2.8, 1.9, 2.2);
    canopy.position.set(tx, 3.5, tz);
    const crown = new THREE.Mesh(canopyGeo, leafLight);
    crown.scale.set(2.05, 2.2, 1.9);
    crown.position.set(tx + 0.76, 4.58, tz + 0.16);
    group.add(canopy, crown);
  }

  for (const side of [-1, 1]) {
    const standGroup = new THREE.Group();
    standGroup.position.set(side * 20.5, 0, -4.5);
    standGroup.rotation.y = side * -Math.PI * 0.25;
    group.add(standGroup);

    for (let row = 0; row < 4; row += 1) {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(17, 0.45, 1.25), benchMat);
      bench.position.set(0, 0.6 + row * 0.95, -row * 1.45);
      standGroup.add(bench);

      for (let seat = -7; seat <= 7; seat += 1.4) {
        const worldPos = new THREE.Vector3(seat, 1.3 + row * 0.95, -row * 1.45);
        worldPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), standGroup.rotation.y);
        worldPos.add(standGroup.position);
        crowdSlots.push({
          x: worldPos.x,
          y: worldPos.y,
          z: worldPos.z,
          phase: (seat + row * 1.7) * 0.9,
          color: fanColors[Math.abs(Math.round(seat * 3 + row * 5)) % fanColors.length],
        });
      }
    }
  }

  // Three batches for the whole grandstand. Heads and brims follow each shirt's hop.
  const fanBall = new THREE.SphereGeometry(1, 12, 8);
  const fanMat = createToonMaterial(0xffffff);
  const shirts = new THREE.InstancedMesh(fanBall, fanMat, crowdSlots.length);
  const heads = new THREE.InstancedMesh(fanBall, fanMat, crowdSlots.length);
  const caps = new THREE.InstancedMesh(fanBall, fanMat, crowdSlots.length);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const skinTones = [0xfad0a8, 0xb77b52, 0xffddbc, 0x925d42, 0xd89a6c];
  crowdSlots.forEach((slot, i) => {
    shirts.setColorAt(i, color.setHex(slot.color));
    heads.setColorAt(i, color.setHex(skinTones[i % skinTones.length]));
    caps.setColorAt(i, color.setHex(fanColors[(i * 3) % fanColors.length]));
  });
  group.add(shirts, heads, caps);

  // Fluffy cartoon 3D clouds drifting overhead
  const cloudMat = createToonMaterial(0xffffff);
  const clouds: THREE.Group[] = [];
  const cloudCoords: readonly [number, number, number][] = [
    [-26, 22, -48],
    [4, 26, -54],
    [30, 21, -44],
    [-38, 19, -22],
  ];
  for (const [cx, cy, cz] of cloudCoords) {
    const c = new THREE.Group();
    [
      [0, 0, 0, 2.4],
      [-2.1, -0.4, 0.2, 1.7],
      [2.1, -0.3, -0.1, 1.8],
    ].forEach(([ox, oy, oz, r]) => {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), cloudMat);
      puff.position.set(ox, oy, oz);
      c.add(puff);
    });
    c.position.set(cx, cy, cz);
    clouds.push(c);
    group.add(c);
  }

  const update = (timeSec: number, crowdExcitement: number) => {
    const bounceAmp = 0.08 + crowdExcitement * 0.42;
    const bounceSpeed = 4.2 + crowdExcitement * 7.5;

    for (let i = 0; i < crowdSlots.length; i += 1) {
      const s = crowdSlots[i];
      const hop = Math.abs(Math.sin(timeSec * bounceSpeed + s.phase)) * bounceAmp;
      const y = s.y + hop - 0.23;
      dummy.position.set(s.x, y, s.z);
      dummy.scale.set(0.34, 0.36, 0.25);
      dummy.updateMatrix();
      shirts.setMatrixAt(i, dummy.matrix);
      dummy.position.y = y + 0.44;
      dummy.scale.set(0.28, 0.29, 0.27);
      dummy.updateMatrix();
      heads.setMatrixAt(i, dummy.matrix);
      dummy.position.y += 0.19;
      dummy.position.z -= Math.sign(s.z) * 0.06;
      dummy.scale.set(0.32, 0.15, 0.33);
      dummy.updateMatrix();
      caps.setMatrixAt(i, dummy.matrix);
    }
    shirts.instanceMatrix.needsUpdate = true;
    heads.instanceMatrix.needsUpdate = true;
    caps.instanceMatrix.needsUpdate = true;

    clouds.forEach((cloud, idx) => {
      cloud.position.x += 0.008 * (idx % 2 === 0 ? 1 : 0.7);
      if (cloud.position.x > 46) cloud.position.x = -46;
    });
  };

  const dispose = () => {
    const geometry = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    group.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
        geometry.add(object.geometry);
        for (const material of [object.material].flat()) materials.add(material);
      }
      if (object instanceof THREE.InstancedMesh) object.dispose();
    });
    geometry.forEach(g => g.dispose());
    materials.forEach(material => {
      if ('map' in material && material.map instanceof THREE.Texture) material.map.dispose();
      material.dispose();
    });
  };

  return { group, update, dispose };
}
