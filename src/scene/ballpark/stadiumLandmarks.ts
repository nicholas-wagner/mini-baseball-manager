import * as THREE from 'three';
import type { StadiumLandmarkKind, StadiumVisualSpec } from './stadiumUpgrades';
import { createToonMaterial } from '../core/toonMaterials';
import { SPLASH_COVE, OUTFIELD_WALL } from '../playback/diamondLayout';

type XYZ = [number, number, number];
const shapes = {
  block: () => new THREE.BoxGeometry(),
  cylinder: () => new THREE.CylinderGeometry(.5, .5, 1, 12),
  terrace: () => new THREE.CylinderGeometry(.39, .5, 1, 7),
  cone: () => new THREE.ConeGeometry(.5, 1, 7),
  peak: () => new THREE.ConeGeometry(.5, 1, 4),
  canopy: () => new THREE.IcosahedronGeometry(.5, 0),
  arch: () => new THREE.TorusGeometry(.41, .09, 6, 12, Math.PI),
  gambrel: () => {
    const gable = new THREE.Shape();
    gable.moveTo(-.5, 0);
    gable.lineTo(.5, 0);
    gable.lineTo(.31, .74);
    gable.lineTo(0, 1);
    gable.lineTo(-.31, .74);
    gable.closePath();
    return new THREE.ExtrudeGeometry(gable, { depth: 1, bevelEnabled: false }).translate(0, 0, -.5);
  },
  sail: () => {
    const triangle = new THREE.Shape();
    triangle.moveTo(-.5, -.5);
    triangle.lineTo(.5, -.5);
    triangle.lineTo(-.5, .5);
    triangle.closePath();
    return new THREE.ExtrudeGeometry(triangle, { depth: .1, bevelEnabled: false });
  },
};

// A row of corn or a whole warehouse costs one draw per distinct primitive.
class Scenery {
  private batches = new Map<keyof typeof shapes, { matrix: THREE.Matrix4; ink: number }[]>();
  private pose = new THREE.Object3D();

  add(shape: keyof typeof shapes, ink: number, at: XYZ, size: XYZ, rotation: XYZ = [0, 0, 0]) {
    this.pose.position.set(...at);
    this.pose.scale.set(...size);
    this.pose.rotation.set(...rotation);
    this.pose.updateMatrix();
    let batch = this.batches.get(shape);
    if (!batch) { batch = []; this.batches.set(shape, batch); }
    batch.push({ matrix: this.pose.matrix.clone(), ink });
  }

  // Timbers, braces and spars in the facade's XY plane.
  beam(ink: number, x1: number, y1: number, x2: number, y2: number, z: number, width: number) {
    this.add('block', ink, [(x1 + x2) / 2, (y1 + y2) / 2, z], [Math.hypot(x2 - x1, y2 - y1), width, width],
      [0, 0, Math.atan2(y2 - y1, x2 - x1)]);
  }

  build() {
    const group = new THREE.Group();
    const material = createToonMaterial(0xffffff);
    const color = new THREE.Color();
    for (const [shape, batch] of this.batches) {
      const mesh = new THREE.InstancedMesh(shapes[shape](), material, batch.length);
      batch.forEach(({ matrix, ink }, i) => {
        mesh.setMatrixAt(i, matrix);
        mesh.setColorAt(i, color.setHex(ink));
      });
      group.add(mesh);
    }
    return group;
  }
}

function pines(m: Scenery) {
  for (const [x, z, h] of [[-3, 1, 7.7], [0, -1, 11.5], [3.4, 0, 8.8]]) {
    m.add('cylinder', 0x915631, [x, 1.4, z], [.75, 2.8, .75]);
    for (let tier = 0; tier < 3; tier++) {
      const width = h * (.55 - .11 * tier);
      m.add('cone', [0x175343, 0x29765a, 0x49936a][tier], [x, h * (.39 + .21 * tier), z],
        [width, h * .47, width]);
    }
  }
}

function warehouse(m: Scenery) {
  m.add('block', 0x964d40, [0, 7, 0], [16, 14, 5]);
  for (const y of [4.5, 8.5, 12.5]) {
    m.add('block', 0xd18b69, [0, y + 1, 2.55], [16.2, .34, .28]);
    for (let x = -6.4; x < 7; x += 3.2) {
      m.add('block', 0xe1a883, [x, y - .35, 2.58], [2.3, 2.5, .22]);
      m.add('block', 0x294250, [x, y - .35, 2.72], [1.85, 2.05, .16]);
      m.add('block', 0xb99077, [x, y - .35, 2.84], [.14, 2.05, .12]);
    }
  }
  m.add('block', 0xb66c52, [0, 14.6, 0], [6, 1.2, 5]);
  m.add('block', 0xe2af84, [0, 15.3, 0], [6.5, .35, 5.4]);
  m.add('cylinder', 0xa75c48, [-5.8, 16, -1], [1.6, 5.8, 1.6]);
  m.add('cylinder', 0x533d3c, [-5.8, 19, -1], [2, .45, 2]);
}

function clocktower(m: Scenery) {
  const brick = 0xb76750, stone = 0xf5d79b;
  m.add('block', brick, [0, 7.8, 0], [4.6, 15.6, 4.2]);
  for (const side of [-1, 1]) {
    for (const x of [2.5, 5.3]) m.add('block', brick, [side * x, 2.4, 0], [.75, 4.8, 2.3]);
    m.add('arch', stone, [side * 3.9, 4.8, .55], [3.45, 4.5, 5]);
  }
  m.add('block', stone, [0, 15.4, 0], [5.35, .55, 4.8]);
  m.add('peak', 0x33746d, [0, 17.7, 0], [6.6, 4.4, 6.6], [0, Math.PI / 4, 0]);
  m.add('cylinder', stone, [0, 12.35, 2.22], [3.2, .23, 3.2], [Math.PI / 2, 0, 0]);
  m.beam(0x263d43, 0, 12.35, -.85, 12.95, 2.4, .21);
  m.beam(0x263d43, 0, 12.35, .4, 13.38, 2.4, .16);
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6;
    m.add('block', 0x664b40, [1.32 * Math.sin(a), 12.35 + 1.32 * Math.cos(a), 2.37], [.13, .24, .08], [0, 0, -a]);
  }
}

function barn(m: Scenery) {
  const red = 0xb34338, cream = 0xffe9bf;
  m.add('block', red, [0, 3.3, 0], [9, 6.6, 6]);
  m.add('gambrel', red, [0, 6.45, 0], [9.1, 3.65, 6]);
  m.add('block', cream, [0, 7.95, 3.04], [1.9, 1.9, .14]);
  m.add('block', 0x553733, [0, 7.95, 3.14], [1.5, 1.5, .11]);
  for (let x = -4; x <= 4; x++) m.add('block', 0xdf6151, [x, 3.4, 3.08], [.12, 6.4, .12]);
  for (const side of [-1, 1]) {
    m.add('block', 0x843530, [side * 1.3, 2.3, 3.15], [2.45, 4.4, .25]);
    m.beam(cream, side * .1, .25, side * 2.55, 4.45, 3.34, .22);
    m.beam(cream, side * 2.55, .25, side * .1, 4.45, 3.34, .22);
    for (const [x1, y1, x2, y2] of [[4.7, 6.25, 2.8, 9.1], [2.8, 9.1, 0, 10.1]]) {
      const angle = Math.atan2(y2 - y1, side * (x2 - x1));
      m.add('block', 0x384951, [side * (x1 + x2) / 2, (y1 + y2) / 2, 0], [Math.hypot(x2 - x1, y2 - y1) + .25, .48, 6.9], [0, 0, angle]);
    }
  }
  m.add('cylinder', 0xb4bbad, [6.5, 5.5, -.9], [3.9, 11, 3.9]);
  for (const y of [3, 6, 9, 11]) m.add('cylinder', 0x788c8a, [6.5, y, -.9], [4, .24, 4]);
  m.add('cone', 0x62797a, [6.5, 11.85, -.9], [4.45, 1.7, 4.45]);
}

function crane(m: Scenery) {
  const steel = 0x405463, yellow = 0xffb749;
  for (const z of [-1.5, 1.5]) {
    for (const side of [-1, 1]) m.beam(steel, side * 3.5, 0, side * 2, 11, z, .62);
    m.beam(yellow, -3, 4, 2.1, 10.5, z, .32);
    m.beam(yellow, 3, 4, -2.1, 10.5, z, .32);
  }
  m.add('block', yellow, [0, 11, 0], [6, 1.15, 4]);
  m.add('block', 0x8ccbd3, [-1.7, 12.3, 0], [2.3, 2.1, 2.6]);
  m.beam(yellow, -4, 12.8, 9.7, 11.8, .6, .55);
  m.beam(steel, -4, 14.5, 9.7, 11.8, .6, .27);
  for (let i = 0; i < 4; i++) m.beam(steel, -3 + i * 2.6, 12.8 - i * .19, -1.5 + i * 2.6, 14 - i * .52, .6, .2);
  m.add('block', steel, [8.6, 8.7, .6], [.13, 6.1, .13]);
  m.add('block', 0xe4834e, [8.6, 4.95, .6], [3.8, 1.5, 1.7]);
  for (let i = 0; i < 6; i++) {
    const x = -5 + (i % 3) * 4.5, y = 1 + Math.floor(i / 3) * 2.05;
    m.add('block', [0xb95443, 0x35929a, 0xe4a750, 0x477792][i % 4], [x, y, 3.4], [4.25, 1.9, 2.15]);
    for (const dx of [-1.6, -.8, 0, .8, 1.6]) m.add('block', steel, [x + dx, y, 4.5], [.08, 1.55, .08]);
  }
}

function sailboat(m: Scenery) {
  m.add('canopy', 0xbb5246, [0, .18, 0], [6.2, 1.65, 2.45]);
  m.add('canopy', 0xffe6aa, [0, .64, 0], [5.7, .66, 2.3]);
  m.add('cylinder', 0x674635, [-.55, 4, 0], [.15, 7.4, .15]);
  m.add('sail', 0xfff4ce, [.88, 4.4, .04], [2.65, 6.45, 1]);
  m.add('sail', 0x5dd5db, [-1.75, 3.55, 0], [2.15, 4.95, 1], [0, Math.PI, 0]);
  m.add('sail', 0xf78155, [.15, 6.98, .17], [1.2, 1.24, 1]);
}

function desert(m: Scenery) {
  for (const [x, z, w, h] of [[-4, -1, 13, 8], [4, 1, 8, 6], [.8, -2, 5, 11]]) {
    m.add('terrace', 0x9f503f, [x, h * .29, z], [w, h * .58, w * .6]);
    m.add('terrace', 0xdd7950, [x, h * .72, z], [w * .78, h * .31, w * .46]);
    m.add('terrace', 0xe9a568, [x, h * .93, z], [w * .67, h * .14, w * .39]);
  }
  for (const x of [-9, 7.5]) {
    m.add('cylinder', 0x397961, [x, 2.65, 3], [.72, 5.3, .72]);
    for (const s of [-1, 1]) {
      m.beam(0x397961, x, 2.2, x + s * .95, 2.7, 3, .49);
      m.add('cylinder', 0x4b8967, [x + s * .95, 3.35, 3], [.5, 1.5, .5]);
    }
  }
}

function blossom(m: Scenery) {
  m.add('cylinder', 0x735047, [0, 2.8, 0], [1.35, 5.6, 1.25]);
  for (const [x, h, z, w, ink] of [[-2.8, 6, .2, 5.5, 0xf39cb7], [2.7, 6.6, -.1, 5.1, 0xffbacb],
  [0, 8.2, -.65, 6.4, 0xffc6d3], [-1.6, 7.6, 1.3, 3.8, 0xffdfdb], [2.2, 7.8, 1.2, 3, 0xffd6da]]) {
    m.beam(0x724e49, 0, 3.2, x, h, z, .5);
    m.add('canopy', ink, [x, h, z], [w, w * .78, w * .81]);
  }
}

function mountains(m: Scenery) {
  for (const [x, z, w, h, ink] of [[-9, -2, 16, 12, 0x63768b], [8, -4, 19, 15, 0x526a80],
  [-1, 0, 18, 19, 0x526579], [5, 2, 11, 11, 0x738494]]) {
    m.add('peak', ink, [x, h / 2, z], [w, h, w * .74], [0, .42, 0]);
    m.add('peak', 0xe5f3f6, [x, h * .82, z], [w * .37, h * .36, w * .275], [0, .42, 0]);
  }
}

function neonGate(m: Scenery) {
  for (const [x, h] of [[-5.4, 8], [5.4, 8], [-4.2, 6.6], [4.2, 6.6]]) {
    m.add('block', 0x373054, [x, h / 2, 0], [.8, h, 2]);
  }
  m.add('arch', 0x50e9f8, [0, 8, .3], [13, 9, 4]);
  m.add('arch', 0xff59ac, [0, 6.8, .45], [10, 7, 4]);
}

const features: Record<StadiumLandmarkKind, { sculpt: (m: Scenery) => void; at: XYZ }> = {
  sandlot_pines: { sculpt: pines, at: [-12, 0, -47] },
  emerald_monster: { sculpt: warehouse, at: [-19, 0, -47] },
  brick_ivy: { sculpt: clocktower, at: [12, 0, -50] },
  cornfield_barn: { sculpt: barn, at: [-13, 0, -48] },
  harbor_cranes: { sculpt: crane, at: [16, 0, -48] },
  splash_cove: { sculpt: sailboat, at: [11.5, SPLASH_COVE.waterY, -48] },
  desert_mesas: { sculpt: desert, at: [-14, 0, -51] },
  sakura_blossoms: { sculpt: blossom, at: [-12, 0, -46] },
  mountain_peaks: { sculpt: mountains, at: [-12, 0, -55] },
  neon_dome: { sculpt: neonGate, at: [14, 0, -47] },
};

function painted(w: number, h: number, base: string, paint: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.MeshBasicMaterial({ color: base });
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  paint(ctx);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map });
}

function brickwork(ivy: boolean) {
  return painted(256, 128, '#a46b55', ctx => {
    for (let row = 0; row < 12; row++) {
      for (let col = -1; col < 8; col++) {
        ctx.fillStyle = ['#ae5e49', '#9d5143', '#b66950'][Math.abs(col + row * 2) % 3];
        ctx.fillRect(col * 36 + (row % 2) * 18, row * 11, 34, 9);
      }
    }
    if (!ivy) return;
    for (let vine = 0; vine < 18; vine++) {
      const length = 3 + (vine * 7 % 13);
      for (let leaf = 0; leaf < length; leaf++) {
        const x = vine * 16 + 4 * Math.sin(leaf * .65 + vine), y = leaf * 7;
        ctx.fillStyle = ['#295841', '#427249', '#56834c'][(vine + leaf) % 3];
        ctx.beginPath();
        ctx.moveTo(x - 10, y - 4); ctx.lineTo(x + 9, y - 2); ctx.lineTo(x + 2, y + 11); ctx.fill();
      }
    }
  });
}

function fencePanels(parent: THREE.Group, material: THREE.Material, start: number, end: number, height: number,
  cap: number, radius = OUTFIELD_WALL.radius - .35) {
  const count = Math.ceil((end - start) / .08);
  const step = (end - start) / count;
  const geometry = new THREE.BoxGeometry(2 * radius * Math.tan(step / 2) + .035, height, .38);
  const panels = new THREE.InstancedMesh(geometry, material, count);
  const rail = new Scenery();
  const pose = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const a = start + (i + .5) * step;
    const x = radius * Math.sin(a), z = OUTFIELD_WALL.centerZ - radius * Math.cos(a);
    pose.position.set(x, height / 2, z);
    pose.rotation.y = -a;
    pose.updateMatrix();
    panels.setMatrixAt(i, pose.matrix);
    rail.add('block', cap, [x, height + .1, z], [geometry.parameters.width + .04, .24, .52], [0, -a, 0]);
  }
  parent.add(panels, rail.build());
}

function emeraldWall(parent: THREE.Group, spec: StadiumVisualSpec) {
  const height = 3.2 * spec.leftWallHeightScale;
  fencePanels(parent, createToonMaterial(0x246844), -.877, -.18, height, 0xffd348);
  const board = painted(512, 192, '#174c39', ctx => {
    ctx.strokeStyle = '#c5d7b3';
    ctx.lineWidth = 3;
    ctx.strokeRect(6, 6, 500, 180);
    ctx.fillStyle = '#fff0c6';
    ctx.font = 'bold 26px monospace';
    ctx.fillText('OUT OF TOWN', 16, 38);
    ctx.font = 'bold 18px monospace';
    for (let column = 0; column < 6; column++) {
      ctx.fillText(column === 5 ? 'R' : String(column + 1), 152 + column * 59, 72);
    }
    for (const [row, team] of ['PINES', 'DOCKS'].entries()) {
      const y = 84 + row * 46;
      ctx.fillStyle = '#fff0c6';
      ctx.font = 'bold 24px monospace';
      ctx.fillText(team, 18, y + 27);
      for (let i = 0; i < 6; i++) {
        const x = 137 + i * 59;
        ctx.fillStyle = '#0d392c';
        ctx.fillRect(x, y, 46, 35);
        ctx.fillStyle = '#fff0c6';
        ctx.fillText(['100012', '020002'][row][i], x + 15, y + 27);
        ctx.fillStyle = '#829c80';
        ctx.fillRect(x + 4, y + 3, 3, 3);
      }
    }
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(10.8, 4.05), board);
  sign.name = 'manual scoreboard';
  const angle = -.44, radius = OUTFIELD_WALL.radius - 1.1;
  sign.position.set(radius * Math.sin(angle), height * .68, OUTFIELD_WALL.centerZ - radius * Math.cos(angle));
  sign.rotation.y = -angle;
  parent.add(sign);
  const seats = new Scenery();
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 19; i++) {
      const a = -.84 + i * .034, r = OUTFIELD_WALL.radius + .55 + row * .85;
      const x = r * Math.sin(a), z = OUTFIELD_WALL.centerZ - r * Math.cos(a);
      seats.add('block', 0x314e48, [x, height + .18 + row * .45, z], [1.35, .28, 1.6], [0, -a, 0]);
      seats.add('block', 0x4d9872, [x, height + .64 + row * .45, z], [.93, .7, .31], [0, -a, 0]);
    }
  }
  parent.add(seats.build());
}

function cornRows(parent: THREE.Group) {
  const stalks = new Scenery();
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 62; i++) {
      const a = -.87 + i * .0285 + row * .011, r = 42 + row * 1.1;
      const x = r * Math.sin(a), z = OUTFIELD_WALL.centerZ - r * Math.cos(a);
      const h = 3.8 + row * .55 + .45 * Math.sin(i * 2.7);
      stalks.add('block', 0xd9aa43, [x, h / 2, z], [.16, h, .16]);
      stalks.add('canopy', 0xefbc47, [x + .16, h * .68, z], [.48, .95, .39], [0, 0, -.34]);
      stalks.add('sail', 0xa4a34c, [x - .35, h * .57, z], [.85, 1.2, .5], [0, Math.PI, .23]);
      stalks.add('cone', 0xffdf87, [x, h + .22, z], [.48, .85, .48]);
    }
  }
  parent.add(stalks.build());
}

function cove(parent: THREE.Group, flagship: THREE.Group) {
  // Clip the water to the outside of the curved RF fence. The inlet reaches
  // left to x=6 behind right-center for balls that just clear the splash cutoff.
  const shoreRadius = OUTFIELD_WALL.radius + 1;
  const bank = (x: number) => Math.max(22, -OUTFIELD_WALL.centerZ + Math.sqrt(Math.max(0, shoreRadius ** 2 - x ** 2)));
  const water = new THREE.Shape();
  water.moveTo(SPLASH_COVE.rightCenterX, 68);
  for (let x: number = SPLASH_COVE.rightCenterX; x <= 56; x++) water.lineTo(x, bank(x));
  water.lineTo(56, 68);
  water.closePath();
  const surface = new THREE.Mesh(new THREE.ShapeGeometry(water), createToonMaterial(0x299fa8));
  surface.name = 'cove water';
  surface.rotation.x = -Math.PI / 2;
  surface.position.y = SPLASH_COVE.waterY;
  parent.add(surface);
  const ripples = new Scenery();
  for (let i = 0; i < 90; i++) {
    const x = 8 + (i * 17.37) % 46;
    const nearShore = bank(x - 2) + .5;
    const depth = nearShore + (i * 3.71) % (67 - nearShore);
    ripples.add('canopy', i % 4 === 0 ? 0xc8f6ef : 0x68d7d1, [x, SPLASH_COVE.waterY + .025, -depth],
      [.65 + i % 4, .045, .21 + i % 3 * .10]);
  }
  const glints = ripples.build();
  parent.add(glints);
  fencePanels(parent, brickwork(false), .15, .878, 3.6, 0xffcb44);
  const boats = [flagship];
  for (const [x, z, scale, yaw] of [[21, -52, .86, -.55], [33, -43, .69, .7], [43, -54, .76, -.85]]) {
    const boat = flagship.clone();
    boat.name = 'cove sailboat';
    boat.position.set(x, SPLASH_COVE.waterY, z);
    boat.rotation.y = yaw;
    boat.scale.setScalar(scale);
    boats.push(boat);
    parent.add(boat);
  }
  return (timeSec: number, reducedMotion: boolean) => {
    glints.position.x = reducedMotion ? 0 : .18 * Math.sin(timeSec * .72);
    boats.forEach((boat, i) => {
      const swell = reducedMotion ? 0 : Math.sin(timeSec * 1.15 + i * 1.7);
      boat.position.y = SPLASH_COVE.waterY + swell * .12;
      boat.rotation.z = swell * .036;
    });
  };
}

function neonRibbons(parent: THREE.Group) {
  for (const [i, z] of [-22, 0, 20].entries()) {
    const arch = new THREE.Mesh(new THREE.TorusGeometry(46, .21, 6, 40, Math.PI),
      new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0x40e6ff : 0xff56bb }));
    arch.position.set(0, 14, z + .55);
    parent.add(arch);
  }
  for (const [y, color] of [[3.75, 0x00e5ff], [4.1, 0xff53ae]]) {
    const ribbon = new THREE.Mesh(new THREE.CylinderGeometry(40.1, 40.1, .25, 40, 1, true, Math.PI - .88, 1.76),
      new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
    ribbon.position.set(0, y, OUTFIELD_WALL.centerZ);
    parent.add(ribbon);
  }
}

export function buildStadiumLandmarks(spec: StadiumVisualSpec, parent: THREE.Group, rightWallFt: number) {
  const kind = spec.landmarkKind;
  const { sculpt, at } = features[kind];
  const scenery = new Scenery();
  sculpt(scenery);
  const feature = scenery.build();
  feature.name = kind;
  if (kind === 'emerald_monster') {
    const brick = brickwork(false);
    if (brick.map) {
      brick.map.wrapS = brick.map.wrapT = THREE.RepeatWrapping;
      brick.map.repeat.set(4, 4);
    }
    const facade = new THREE.Mesh(new THREE.PlaneGeometry(16, 14), brick);
    facade.position.set(0, 7, 2.51);
    feature.add(facade);
  }

  // The mound camera faces away from the outfield. The press box displays a
  // miniature of the park's signature silhouette, facing the throwing shoulder.
  const crest = feature.clone();
  crest.name = 'press box landmark';
  const bounds = new THREE.Box3().setFromObject(crest);
  const size = bounds.getSize(new THREE.Vector3());
  const scale = Math.min(4.3 / size.x, 3.1 / size.y);
  crest.scale.setScalar(scale);
  crest.rotation.y = Math.PI;
  crest.position.set(4.4 + (bounds.min.x + bounds.max.x) * scale / 2, 7.04 - bounds.min.y * scale, 14);
  feature.position.set(...at);
  parent.add(feature, crest);

  function repeat(x: number, z: number, scale: number, yaw = 0) {
    const copy = feature.clone();
    copy.position.set(x, 0, z);
    copy.scale.setScalar(scale);
    copy.rotation.y = yaw;
    parent.add(copy);
  }

  switch (kind) {
    case 'emerald_monster': emeraldWall(parent, spec); break;
    case 'brick_ivy': fencePanels(parent, brickwork(true), -.878, .878, 4.5, 0x98705a); break;
    case 'cornfield_barn': cornRows(parent); break;
    case 'harbor_cranes': {
      repeat(31, -44, .82, -.26);
      const marker = painted(240, 96, '#20465a', ctx => {
        ctx.fillStyle = '#ffdc79';
        ctx.font = 'bold 38px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`RF ${rightWallFt}`, 120, 40);
        ctx.fillStyle = '#f6f3d9';
        ctx.font = 'bold 21px monospace';
        ctx.fillText('SHORT PORCH', 120, 76);
      });
      const porch = new THREE.Mesh(new THREE.PlaneGeometry(5, 2), marker);
      porch.position.set(23.4, 4.4, -34.6);
      porch.rotation.y = -.64;
      parent.add(porch);
      break;
    }
    case 'splash_cove': return cove(parent, feature);
    case 'desert_mesas':
      repeat(16, -55, 1.25, .7);
      repeat(34, -39, .8);
      break;
    case 'sakura_blossoms':
      for (const [x, z, s] of [[-26, -41, 1.1], [-18, -46, .8], [12, -47, 1.16], [20, -43, .94], [28, -40, 1.12]]) repeat(x, z, s, x * .1);
      break;
    case 'mountain_peaks': repeat(19, -59, 1.18, .21); break;
    case 'neon_dome': neonRibbons(parent); break;
    case 'sandlot_pines':
      repeat(13, -47, .9, .63);
      repeat(-25, -41, .75);
      break;
  }
}
