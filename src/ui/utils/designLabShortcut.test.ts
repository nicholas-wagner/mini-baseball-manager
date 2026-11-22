import { describe, expect, it } from 'vitest';
import {
  createKeySequenceTracker,
  DESIGN_LAB_SHORTCUT_COUNT,
  DESIGN_LAB_SHORTCUT_KEY,
  isEditableEventTarget,
} from './designLabShortcut';

describe('Design Lab Secret Keyboard Shortcut (5x "d")', () => {
  it('triggers exactly on the 5th rapid "d" press and resets cleanly afterward', () => {
    expect(DESIGN_LAB_SHORTCUT_KEY).toBe('d');
    expect(DESIGN_LAB_SHORTCUT_COUNT).toBe(5);

    const tracker = createKeySequenceTracker({
      targetKey: 'd',
      requiredCount: 5,
      windowMs: 2500,
    });

    expect(tracker.recordKey('d', 1000)).toBe(false);
    expect(tracker.recordKey('D', 1200)).toBe(false);
    expect(tracker.recordKey('d', 1400)).toBe(false);
    expect(tracker.recordKey('d', 1600)).toBe(false);
    expect(tracker.recordKey('d', 1800)).toBe(true);

    // Next press starts a fresh count from 1
    expect(tracker.recordKey('d', 1900)).toBe(false);
  });

  it('resets when interrupted by another key or when presses fall outside the time window', () => {
    const tracker = createKeySequenceTracker({
      targetKey: 'd',
      requiredCount: 5,
      windowMs: 2000,
    });

    expect(tracker.recordKey('d', 1000)).toBe(false);
    expect(tracker.recordKey('d', 1200)).toBe(false);
    expect(tracker.recordKey('x', 1300)).toBe(false); // interrupts sequence
    expect(tracker.recordKey('d', 1400)).toBe(false);
    expect(tracker.recordKey('d', 1500)).toBe(false);
    expect(tracker.recordKey('d', 1600)).toBe(false);
    expect(tracker.recordKey('d', 1700)).toBe(false);
    expect(tracker.recordKey('d', 1800)).toBe(true);

    // Stale presses outside 2000ms window expire
    expect(tracker.recordKey('d', 5000)).toBe(false);
    expect(tracker.recordKey('d', 5200)).toBe(false);
    expect(tracker.recordKey('d', 7500)).toBe(false); // 5000 & 5200 expired
    expect(tracker.recordKey('d', 7700)).toBe(false);
    expect(tracker.recordKey('d', 7900)).toBe(false);
    expect(tracker.recordKey('d', 8100)).toBe(false);
    expect(tracker.recordKey('d', 8300)).toBe(true);
  });

  it('detects editable targets so typing inside inputs or textareas never triggers the shortcut', () => {
    const input = document.createElement('input');
    const textarea = document.createElement('textarea');
    const select = document.createElement('select');
    const div = document.createElement('div');
    const editableDiv = document.createElement('div');
    editableDiv.setAttribute('contenteditable', 'true');

    expect(isEditableEventTarget(input)).toBe(true);
    expect(isEditableEventTarget(textarea)).toBe(true);
    expect(isEditableEventTarget(select)).toBe(true);
    expect(isEditableEventTarget(editableDiv)).toBe(true);
    expect(isEditableEventTarget(div)).toBe(false);
    expect(isEditableEventTarget(null)).toBe(false);
  });
});
