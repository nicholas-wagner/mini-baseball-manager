const relicPrints = import.meta.glob<string>('./prints/*.webp', {
  eager: true,
  import: 'default',
  query: '?url',
});

const SAFE_RELIC_ID = /^[a-z0-9_-]+$/i;

export type RelicArtworkMap = Readonly<Record<string, string>>;

/**
 * Optional lookup hook for Sprint B generated WebP relic prints keyed by `relicId`.
 * Falls back to `undefined` when no print exists yet (or if `relicId` fails allowlist checks),
 * letting FoilPackModal render its enhanced retro SVG badge seamlessly.
 */
export function getRelicArtworkUrl(
  relicId?: string,
  overrides?: RelicArtworkMap,
): string | undefined {
  if (!relicId || !SAFE_RELIC_ID.test(relicId)) return undefined;
  const overrideUrl = overrides?.[relicId];
  if (overrideUrl) return overrideUrl;
  return relicPrints[`./prints/${relicId}.webp`];
}
