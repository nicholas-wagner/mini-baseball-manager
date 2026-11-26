import { describe, expect, it } from 'vitest';
import { CELEBRATION_STICKER_CATALOG } from '../../engine/gm/celebrationStickers';
import { getStickerArtworkUrl } from './stickerPrint';

describe('stickerPrint artwork lookup hook (TASK-101)', () => {
  it('rejects empty, undefined, or unsafe path-traversal sticker IDs', () => {
    expect(getStickerArtworkUrl(undefined)).toBeUndefined();
    expect(getStickerArtworkUrl('')).toBeUndefined();
    expect(getStickerArtworkUrl('../secret')).toBeUndefined();
    expect(getStickerArtworkUrl('prints/first_home_run')).toBeUndefined();
    expect(getStickerArtworkUrl('first_home_run?x=1')).toBeUndefined();
  });

  it('resolves all 6 canonical CelebrationStickerIds from overrides and falls back cleanly when missing', () => {
    expect(CELEBRATION_STICKER_CATALOG).toHaveLength(6);

    for (const def of CELEBRATION_STICKER_CATALOG) {
      expect(getStickerArtworkUrl(def.id)).toBeUndefined();
      const url = `/sticker-prints/${def.id}.webp`;
      expect(getStickerArtworkUrl(def.id, { [def.id]: url })).toBe(url);
    }
  });
});
