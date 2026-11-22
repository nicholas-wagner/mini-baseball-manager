import type { CharacterAnimClip } from './animationState';
import * as THREE from 'three';
import { createPaintedPlayerRig, type PaintedPlayerOptions } from './paintedPlayer';
import { waitForPaint } from './paintedMaterial';

// The club creator needs a still photograph. Draw when its two sheets arrive
// and again after a kit change, without running a second game loop.
export type PreviewOptions = PaintedPlayerOptions & { clip?: CharacterAnimClip };

export function createUniformPreview(container: HTMLElement, options: PreviewOptions) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1.1, -1.1, .1, 12);
  camera.position.set(0, 1.08, 5);
  camera.lookAt(0, .98, 0);
  const rig = createPaintedPlayerRig(options);
  scene.add(rig.root);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(160,176,false);
  renderer.domElement.style.cssText = 'width:100%;height:100%';
  container.appendChild(renderer.domElement);
  let revision = 0;
  function draw(next: PreviewOptions) {
    renderer.setAnimationLoop(null);
    const version = ++revision;
    rig.updateAppearance(next);
    rig.updatePose('idle', 0, undefined, camera.position);
    void waitForPaint(rig.root).then(() => {
      if (revision !== version) return;
      const clip = next.clip ?? 'idle';
      if (clip === 'idle') renderer.render(scene, camera);
      else {
        const start = performance.now();
        renderer.setAnimationLoop(now => {
          rig.updatePose(clip, (now - start) / 1000, undefined, camera.position);
          renderer.render(scene, camera);
        });
      }
    });
  }
  draw(options);
  return { draw, dispose() {
    revision++;
    renderer.setAnimationLoop(null);
    rig.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  }};
}
