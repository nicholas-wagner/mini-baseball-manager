const stickerPrints = import.meta.glob<string>('./prints/*.webp', {
  eager: true,
  import: 'default',
  query: '?url',
});

const SAFE_STICKER_ID = /^[a-z0-9_-]+$/i;

export type StickerArtworkMap = Readonly<Record<string, string>>;

/**
 * Optional lookup hook for Sprint B die-cut WebP Celebration Stickers keyed by `stickerId`.
 * Falls back to `undefined` when no print exists yet (or if `stickerId` fails allowlist checks),
 * letting CelebrationStickerToast & TrophyCaseModal render crisp emoji badges seamlessly.
 */
export function getStickerArtworkUrl(
  stickerId?: string,
  overrides?: StickerArtworkMap,
): string | undefined {
  if (!stickerId || !SAFE_STICKER_ID.test(stickerId)) return undefined;
  const overrideUrl = overrides?.[stickerId];
  if (overrideUrl) return overrideUrl;
  return stickerPrints[`./prints/${stickerId}.webp`];
}
