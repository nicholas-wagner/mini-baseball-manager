import * as THREE from 'three';
import type { Vec3 } from '../camera/cameraRig';

// Each burst reuses one instanced mesh. The sparks fly in world space behind the wall.
function createBurst(cannon: boolean) {
  const count = cannon ? 30 : 64;
  const geometry = cannon ? new THREE.BoxGeometry(.19, .32, .045) : new THREE.OctahedronGeometry(.16);
  const material = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false });
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.name = cannon ? 'mascot cannon confetti' : 'home run fireworks';
  mesh.visible = false;
  mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const inks = ['#ffe46c', '#ff778f', '#6fe6e3', '#fffbda'];
  for (let i = 0; i < count; i++) mesh.setColorAt(i, new THREE.Color(inks[i % inks.length]));
  const dummy = new THREE.Object3D();
  let age = 0;
  function update(dt: number) {
    if (!mesh.visible) return;
    age += dt;
    mesh.visible = age < 1.75;
    material.opacity = Math.min(1, Math.max(0, (1.75 - age) * 1.8));
    for (let i = 0; i < count; i++) {
      const side = i % 2 ? -1 : 1;
      const t = Math.max(0, age - (cannon || side === 1 ? 0 : .19));
      const angle = i * 2.39996;
      // Each shell needs its own complete sphere of directions.
      const latitude = 1 - 2 * (Math.floor(i / 2) + .5) / (count / 2);
      const radius = Math.sqrt(1 - latitude * latitude);
      const spread = cannon ? 2.7 : 5.3;
      dummy.position.set(
        (cannon ? -19 : side * 10) + t * spread * radius * Math.cos(angle),
        (cannon ? 6.9 : 11.5) + t * (cannon ? 6.5 : latitude * spread + 2) - 3.3 * t * t,
        (cannon ? -38 : -42) + t * (radius * Math.sin(angle) * spread + (cannon ? 4 : 0)),
      );
      dummy.rotation.set(t * 3 + i, t * 5 + angle, angle);
      const size = t > 0 ? Math.min(1, t * 16) : 0;
      dummy.scale.set(size, size * (cannon ? 1 : 1.8), size);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
  return {
    mesh, update, start() { age = 0; mesh.visible = true; update(0); },
    dispose() { mesh.dispose(); geometry.dispose(); material.dispose(); }
  };
}

function createSplashFountain() {
  const count = 48;
  const geometry = new THREE.OctahedronGeometry(.22);
  const material = new THREE.MeshBasicMaterial();
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.name = 'splash fountain';
  mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const droplet = new THREE.Object3D();
  const colors = ['#ffffff', '#72eaff', '#b9f8ff'];
  const jets = Array.from({ length: count }, (_, i) => {
    mesh.setColorAt(i, new THREE.Color(colors[i % colors.length]));
    const angle = i * 2.39996;
    const spread = 1.2 + i % 5 * .42;
    return { x: spread * Math.cos(angle), z: spread * Math.sin(angle), up: 8 + (i * 7 % 13) * .55 };
  });
  let age = 0;
  function update(dt: number) {
    if (!mesh.visible) return;
    age += dt;
    let airborne = false;
    jets.forEach((jet, i) => {
      const height = age * (jet.up - 7.8 * age);
      airborne ||= height >= 0;
      droplet.position.set(jet.x * age, Math.max(0, height), jet.z * age);
      const size = height < 0 ? 0 : .75 + (i % 3) * .16;
      droplet.scale.set(size, size * 1.8, size);
      droplet.updateMatrix();
      mesh.setMatrixAt(i, droplet.matrix);
    });
    mesh.visible = airborne;
    mesh.instanceMatrix.needsUpdate = true;
  }
  return {
    mesh, update,
    start(at: Vec3) { mesh.position.copy(at); age = 0; mesh.visible = true; update(0); },
    dispose() { mesh.dispose(); geometry.dispose(); material.dispose(); },
  };
}

function createSparkleRing() {
  const shape = new THREE.Shape();
  for (let i = 0; i < 8; i++) {
    const radius = i % 2 ? .045 : .155;
    const angle = i * Math.PI / 4;
    const x = radius * Math.cos(angle), y = radius * Math.sin(angle);
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape);
  const material = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const mesh = new THREE.InstancedMesh(geometry, material, 12);
  mesh.name = 'favorite stars';
  mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const star = new THREE.Object3D();
  for (let i = 0; i < mesh.count; i++) mesh.setColorAt(i, new THREE.Color(i % 2 ? '#ff94bd' : '#ffd04f'));
  let age = 0;
  function update(dt: number, camera?: THREE.PerspectiveCamera) {
    if (!mesh.visible) return;
    age += dt;
    const u = Math.min(1, age / .85);
    mesh.visible = u < 1;
    if (!mesh.visible) return;
    const radius = .20 + .92 * (1 - (1 - u) ** 3);
    for (let i = 0; i < mesh.count; i++) {
      const angle = i * Math.PI * 2 / mesh.count;
      star.position.set(radius * Math.cos(angle), .12 + u * (1 + i % 3 * .16), radius * Math.sin(angle));
      if (camera) star.quaternion.copy(camera.quaternion);
      else star.rotation.set(0, 0, 0);
      star.rotateZ(.28 * Math.sin(angle + u * Math.PI));
      star.scale.setScalar((i % 2 ? .8 : 1) * (.45 + .8 * Math.sin(Math.PI * u)));
      star.updateMatrix();
      mesh.setMatrixAt(i, star.matrix);
    }
    material.opacity = 1 - u * u;
    mesh.instanceMatrix.needsUpdate = true;
  }
  return {
    mesh, update,
    start(at: Vec3) { mesh.position.copy(at); mesh.visible = true; age = 0; update(0); },
    dispose() { mesh.dispose(); geometry.dispose(); material.dispose(); },
  };
}

export function createStadiumCelebration() {
  const group = new THREE.Group();
  const fireworks = createBurst(false), confetti = createBurst(true);
  let stars: ReturnType<typeof createSparkleRing> | undefined;
  let fountain: ReturnType<typeof createSplashFountain> | undefined;
  const ring = (name: string, inner: number, outer: number) => {
    const mesh = new THREE.Mesh(new THREE.RingGeometry(inner, outer, 48), new THREE.MeshBasicMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
    }));
    mesh.name = name;
    mesh.visible = false;
    group.add(mesh);
    return mesh;
  };
  const wave = ring('barrel wave', .91, 1), aura = ring('power aura', .86, 1);
  group.add(fireworks.mesh, confetti.mesh);
  let waveAge = 0, auraAge = 0, steady = false;
  function clear() {
    for (const node of group.children) node.visible = false;
  }
  return {
    group, clear,
    setReducedMotion(value: boolean) { steady = value; if (value) clear(); },
    barrel(at: Vec3) {
      if (steady) return;
      wave.position.copy(at);
      wave.material.color.set('#ffe59a');
      waveAge = 0;
      wave.visible = true;
    },
    unleash(at: Vec3, color: string) {
      if (steady) return;
      aura.position.copy(at);
      aura.material.color.set(color);
      auraAge = 0;
      aura.visible = true;
    },
    homer(cannon: boolean) {
      if (steady) return;
      fireworks.start();
      if (cannon) confetti.start();
    },
    starSparkle(at: Vec3) {
      if (steady) return;
      if (!stars) {
        stars = createSparkleRing();
        group.add(stars.mesh);
      }
      stars.start(at);
    },
    splashDown(at: Vec3) {
      if (steady) return;
      if (!fountain) {
        fountain = createSplashFountain();
        group.add(fountain.mesh);
      }
      fountain.start(at);
    },
    update(dt: number, camera?: THREE.PerspectiveCamera) {
      if (wave.visible) {
        waveAge += dt;
        const u = Math.min(1, waveAge / .28);
        wave.scale.setScalar(.10 + .85 * u);
        if (camera) wave.quaternion.copy(camera.quaternion);
        wave.material.opacity = (1 - u) * .82;
        wave.visible = u < 1;
      }
      if (aura.visible) {
        auraAge += dt;
        const u = Math.min(1, auraAge / .52);
        aura.rotation.set(-1.14, u * 2, .26);
        aura.scale.setScalar(.34 + .82 * u);
        aura.position.y += .8 * dt;
        aura.material.opacity = .84 * (1 - u);
        aura.visible = u < 1;
      }
      fireworks.update(dt);
      confetti.update(dt);
      fountain?.update(dt);
      stars?.update(dt, camera);
    },
    dispose() {
      for (const mesh of [wave, aura]) { mesh.geometry.dispose(); mesh.material.dispose(); }
      fireworks.dispose();
      confetti.dispose();
      fountain?.dispose();
      stars?.dispose();
      group.clear();
    },
  };
}
