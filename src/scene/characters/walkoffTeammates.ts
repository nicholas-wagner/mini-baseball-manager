import type { Scene } from 'three';
import { createPaintedPlayerRig, type PaintedPlayerOptions, type PaintedPlayerRig } from './paintedPlayer';

export class WalkoffTeammates {
  readonly rigs: PaintedPlayerRig[] = [];
  constructor(private scene: Scene) {}
  set(players: PaintedPlayerOptions[]) {
    this.hide();
    for (const [index, options] of players.entries()) {
      const rig = this.rigs[index];
      if (rig) rig.updateAppearance(options);
      else {
        const member = createPaintedPlayerRig(options, 0, true);
        member.root.visible = false;
        this.scene.add(member.root);
        this.rigs.push(member);
      }
      this.rigs[index].preparePlayback();
    }
  }
  hide() {
    for (const rig of this.rigs) rig.root.visible = false;
  }
  dispose() {
    for (const rig of this.rigs) {
      this.scene.remove(rig.root);
      rig.dispose();
    }
  }
}
