import * as THREE from 'three';

export function createPaintedBat() {
  const profile = [[.021,0],[.027,.20],[.041,.42],[.069,.67],[.075,.90],[.069,.94],[.050,.95],[0,.95]];
  const wood = new THREE.LatheGeometry(profile.map(([r,y]) => new THREE.Vector2(r,y)), 12);
  const color = new THREE.Float32BufferAttribute(wood.attributes.position.count * 3, 3);
  const ink = new THREE.Color();
  for (let i = 0; i < color.count; i++) {
    const y = wood.attributes.position.getY(i);
    const side = wood.attributes.normal.getX(i);
    ink.set(y < .2 ? '#AF6033' : side < -.32 ? '#9F582F' : side > .55 ? '#FFE2A5' : '#DB9959');
    color.setXYZ(i, ink.r, ink.g, ink.b);
  }
  wood.setAttribute('color', color);
  const paint = new THREE.MeshBasicMaterial({vertexColors: true});
  const barrel = new THREE.Mesh(wood, paint);
  barrel.name = 'bat barrel';
  const edge = new THREE.MeshBasicMaterial({color: '#362431', side: THREE.BackSide});
  const outline = new THREE.Mesh(wood, edge);
  outline.scale.set(1.15,1.006,1.15);
  barrel.add(outline);
  function place(cel: number, rear: boolean, gripX: number, gripY: number, unit: number, width: number, time: number) {
    barrel.position.set((gripX-128)*unit*width,(249-gripY)*unit,0.027);
    const outward = rear ? 1 : -1;
    const angle = (cel === 0 ? .59 : .29) + .035 * Math.sin(time * 4);
    barrel.rotation.z = -outward * angle;
    barrel.rotation.x = -.15;
  }
  return { barrel, place, dispose() { wood.dispose(); paint.dispose(); edge.dispose(); } };
}
