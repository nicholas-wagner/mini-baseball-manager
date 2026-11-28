import { describe, expect, it } from 'vitest';
import { HEALTH_CONDITIONS_CATALOG } from '../../engine/health/conditionsCatalog';
import {
  getHealthConditionArtworkUrl,
  listBundledHealthPrintIds,
} from './healthConditionPrint';

describe('Manga Health Condition Prints (TASK-141)', () => {
  it('bundles a manga WebP illustration for every injury and illness in HEALTH_CONDITIONS_CATALOG', () => {
    expect(HEALTH_CONDITIONS_CATALOG).toHaveLength(45);
    const bundled = new Set(listBundledHealthPrintIds());
    for (const condition of HEALTH_CONDITIONS_CATALOG) {
      expect(bundled.has(condition.id), `missing manga WebP print for ${condition.id}`).toBe(true);
      expect(getHealthConditionArtworkUrl(condition.id)).toBeTruthy();
    }
    expect(getHealthConditionArtworkUrl('../etc/passwd')).toBeUndefined();
  });
});
