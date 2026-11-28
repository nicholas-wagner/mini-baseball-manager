const healthPrints = import.meta.glob<string>('./prints/*.webp', {
  eager: true,
  import: 'default',
  query: '?url',
});

const SAFE_CONDITION_ID = /^[a-z0-9_-]+$/i;

export type HealthArtworkMap = Readonly<Record<string, string>>;

/**
 * Resolves the bundled 90s manga WebP spot illustration for any injury or illness ID.
 * Falls back cleanly to `undefined` when an ID fails allowlist validation or has no print yet.
 */
export function getHealthConditionArtworkUrl(
  conditionId?: string,
  overrides?: HealthArtworkMap,
): string | undefined {
  if (!conditionId || !SAFE_CONDITION_ID.test(conditionId)) return undefined;
  const overrideUrl = overrides?.[conditionId];
  if (overrideUrl) return overrideUrl;
  return healthPrints[`./prints/${conditionId}.webp`];
}

/** Lists all bundled health condition print IDs for Design Lab QA auditing. */
export function listBundledHealthPrintIds(): string[] {
  return Object.keys(healthPrints)
    .map((key) => key.replace(/^\.\/prints\//, '').replace(/\.webp$/, ''))
    .sort();
}
