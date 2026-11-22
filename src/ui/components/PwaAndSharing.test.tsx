import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  buildCardExportFilename,
  exportCardSvgToPngDataUrl,
  serializeCardSvgToDataUrl,
} from '../../art/export/cardExporter';
import { createClub } from '../../engine/gm/rosterFactory';
import { createSeededRng } from '../../engine/rng/seededRng';
import {
  computeClampedPixelRatio,
  evictOverflowCacheKeys,
  getAccessibleStatGrade,
  shouldThrottleAnimationFrame,
} from '../../scene/core/performanceBudget';
import { decodeClubExportCode, encodeClubExportCode } from '../../store/clubCode';
import { requestGameWakeLock, triggerHapticPulse } from '../utils/deviceFeedback';
import { PwaInstallBanner } from './PwaInstallBanner';

describe('Milestone 9 Polish, Serverless Sharing & Android PWA Mastery (TASK-049..051)', () => {
  it('round-trips serverless Base64 Club Export Codes and exports card SVG/PNG cleanly (TASK-049)', async () => {
    const club = createClub(createSeededRng(4900), {
      id: 'export-club',
      isHuman: true,
      city: 'Neo',
      name: 'Knights',
      mascot: 'Knight',
      colors: { primary: '#E63946', secondary: '#1D3557', accent: '#FFC300', monogram: 'NK' },
      leagueTier: 'majors',
    });

    const code = encodeClubExportCode(club);
    expect(code.startsWith('MBM1:')).toBe(true);

    const decoded = decodeClubExportCode(code);
    expect(decoded.ok).toBe(true);
    if (decoded.ok) {
      expect(decoded.club.name).toBe('Knights');
      expect(decoded.club.isHuman).toBe(false);
      expect(decoded.club.roster).toHaveLength(club.roster.length);
    }

    expect(decodeClubExportCode('INVALID_CODE').ok).toBe(false);
    expect(decodeClubExportCode('MBM1:not-valid-base64!!!').ok).toBe(false);

    expect(buildCardExportFilename('Kenji Sato Jr.', 24)).toBe('mbm-card-kenji-sato-jr-24.png');
    const svgUrl = serializeCardSvgToDataUrl('<rect width="10" height="10" />');
    expect(svgUrl.startsWith('data:image/svg+xml')).toBe(true);

    const exported = await exportCardSvgToPngDataUrl('<svg><circle r="5" /></svg>');
    expect(exported.dataUrl.length).toBeGreaterThan(20);
  });

  it('supports Android haptics, optional Wake Lock, and interactive PWA Install Banner (TASK-050)', async () => {
    const vibSpy = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'vibrate', { value: vibSpy, configurable: true });
    expect(triggerHapticPulse('home_run')).toBe(true);
    expect(vibSpy).toHaveBeenCalled();

    const wake = await requestGameWakeLock();
    expect(wake.active).toBe(false);
    await expect(wake.release()).resolves.toBeUndefined();

    render(<PwaInstallBanner />);
    const promptSpy = vi.fn().mockResolvedValue(undefined);
    const installEvent = new Event('beforeinstallprompt') as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
    };
    installEvent.prompt = promptSpy;
    installEvent.userChoice = Promise.resolve({ outcome: 'accepted' });

    fireEvent(window, installEvent);
    const installBtn = await screen.findByRole('button', { name: /install app/i });
    fireEvent.click(installBtn);
    expect(promptSpy).toHaveBeenCalled();
  });

  it('enforces mobile WebGL DPR/FPS/cache budgets and colorblind-safe stat grades (TASK-051)', () => {
    expect(computeClampedPixelRatio(3.5, false)).toBe(2);
    expect(computeClampedPixelRatio(3.5, true)).toBe(1.5);
    expect(computeClampedPixelRatio(0, false)).toBe(1);

    expect(shouldThrottleAnimationFrame(8, 'live_game', false)).toBe(true);
    expect(shouldThrottleAnimationFrame(18, 'live_game', false)).toBe(false);
    expect(shouldThrottleAnimationFrame(20, 'menu', false)).toBe(true);
    expect(shouldThrottleAnimationFrame(45, 'menu', true)).toBe(false);

    const grades = [92, 80, 68, 54, 40].map((r) => getAccessibleStatGrade(r));
    expect(grades.map((g) => g.grade)).toEqual(['S', 'A', 'B', 'C', 'D']);
    expect(new Set(grades.map((g) => g.symbol)).size).toBe(5);

    const cache = new Map<string, number>();
    for (let i = 0; i < 60; i += 1) cache.set(`k-${i}`, i);
    const evictedKeys: number[] = [];
    const evicted = evictOverflowCacheKeys(cache, (v) => evictedKeys.push(v), 48);
    expect(evicted).toBe(12);
    expect(cache.size).toBe(48);
    expect(evictedKeys).toHaveLength(12);
  });
});
