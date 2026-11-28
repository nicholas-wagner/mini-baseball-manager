import * as THREE from 'three';
import type { EffectiveBatSide } from '../../engine/handedness/types';
import type { Vec3 } from '../camera/cameraRig';

/** One bat and its spray of chips, reused for each break. All motion is local to contact. */
export function createBrokenBat() {
  const group = new THREE.Group();
  group.name = 'broken bat';
  group.visible = false;

  function fragment(name: string, profile: readonly [number, number][], dark: string, light: string) {
    const geometry = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 7);
    const positions = geometry.getAttribute('position');
    const colors = new THREE.Float32BufferAttribute(positions.count * 3, 3);
    const color = new THREE.Color();
    for (let i = 0; i < positions.count; i++) {
      // Flat paint along the grain, with a pale exposed face at the break.
      const fracture = Math.abs(positions.getY(i)) < .015;
      if (fracture) {
        const angle = Math.atan2(positions.getX(i), positions.getZ(i));
        positions.setY(i, positions.getY(i) + .031 * Math.sin(3 * angle));
      }
      color.set(fracture ? '#fff0bd' : positions.getX(i) < 0 ? dark : light);
      colors.setXYZ(i, color.r, color.g, color.b);
    }
    geometry.setAttribute('color', colors);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
    mesh.name = name;
    group.add(mesh);
    return mesh;
  }

  const handle = fragment('broken handle', [[0,-.43],[.039,-.43],[.027,-.39],[.037,-.03],[.046,.01],[0,0]], '#a25a35', '#de9c5e');
  const barrel = fragment('broken barrel', [[0,0],[.05,-.01],[.068,.13],[.08,.48],[.065,.52],[0,.53]], '#bc8147', '#ffcd87');
  const chips = new THREE.InstancedMesh(new THREE.TetrahedronGeometry(.048), new THREE.MeshBasicMaterial({ color: '#ffda9b' }), 9);
  chips.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  chips.name = 'wood chips';
  chips.frustumCulled = false;
  group.add(chips);
  const chip = new THREE.Object3D();
  const pieces = [
    { mesh: handle, vx: -.95, vz: -1.9, up: 2.3, flip: -.5, roll: -3.9 },
    { mesh: barrel, vx: 2.7, vz: -4.7, up: 3.1, flip: 1.5, roll: 4.6 },
  ];
  let age = 0, side = 1;

  function update(dt: number) {
    if (!group.visible) return;
    age += dt;
    if (age >= 1.55) { group.visible = false; return; }
    for (const { mesh, vx, vz, up, flip, roll } of pieces) {
      // Stop the tumble on the turf, even when the origin is above the plate.
      const landAt = (up + Math.sqrt(up * up + 24 * Math.max(0, group.position.y - .08))) / 12;
      const t = Math.min(age, landAt);
      mesh.position.set(side * vx * t, t * (up - 6 * t), vz * t);
      const turn = t / landAt;
      mesh.rotation.set(turn * flip * Math.PI, side * turn * 2.4, side * (1.02 + turn * roll), 'YXZ');
    }
    chips.visible = age < .55;
    if (chips.visible) {
      for (let i = 0; i < chips.count; i++) {
        const angle = i * 2.4;
        chip.position.set(side * Math.cos(angle) * age * 2.7,
          Math.max(.05 - group.position.y, age * (2.2 + i % 3 - 6 * age)), age * (Math.sin(angle) * 2 - 1.8));
        chip.scale.set(.62, 1.8, .50).multiplyScalar(1 - age / .55);
        chip.rotation.set(i + age * 5, angle, side * age * 9);
        chip.updateMatrix();
        chips.setMatrixAt(i, chip.matrix);
      }
      chips.instanceMatrix.needsUpdate = true;
    }
  }
  return {
    group, update,
    start(at: Vec3, batSide: EffectiveBatSide) {
      group.position.copy(at);
      group.visible = true;
      side = batSide === 'R' ? 1 : -1;
      age = 0;
      update(0);
    },
    dispose() {
      chips.dispose();
      for (const mesh of [handle, barrel, chips]) { mesh.geometry.dispose(); mesh.material.dispose(); }
      group.removeFromParent();
      group.clear();
    },
  };
}
