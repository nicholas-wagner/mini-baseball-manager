import { expect, it, vi } from 'vitest';
import { createPortraitTraits } from '../../art/portraits/generatePortrait';
import { SAMPLE_TEAM_PALETTES } from '../../art/themes/teamPalettes';
import { createChibiPlayerRig } from './chibiBuilder';

it('paints a decoded action frame when the next frame is still decoding', () => {
  const drawImage = vi.fn();
  const context = vi.spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockReturnValue({ clearRect: vi.fn(), drawImage } as unknown as CanvasRenderingContext2D);
  const images: { complete: boolean; naturalWidth: number }[] = [];
  class Frame {
    complete = false;
    naturalWidth = 520;
    constructor() { images.push(this); }
  }
  vi.stubGlobal('Image', Frame);
  const rig = createChibiPlayerRig({
    traits: createPortraitTraits(84), team: SAMPLE_TEAM_PALETTES[0], jerseyNumber: 34, role: 'pitcher',
  });
  try {
    images.forEach(image => { image.complete = true; });
    rig.updatePose('idle', 0);
    rig.updatePose('pitch_super', 0.2);
    const windupFrame = images.at(-1)!;
    windupFrame.complete = true;
    rig.updatePose('pitch_super', 0.42);
    expect(drawImage.mock.lastCall?.[0]).toBe(windupFrame);
  } finally {
    rig.dispose();
    context.mockRestore();
    vi.unstubAllGlobals();
  }
});
