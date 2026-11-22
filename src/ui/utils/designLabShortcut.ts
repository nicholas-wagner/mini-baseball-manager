export const DESIGN_LAB_SHORTCUT_KEY = 'd';
export const DESIGN_LAB_SHORTCUT_COUNT = 5;
export const DESIGN_LAB_SHORTCUT_WINDOW_MS = 2500;

export interface KeySequenceOptions {
  targetKey?: string;
  requiredCount?: number;
  windowMs?: number;
}

export interface KeySequenceTracker {
  recordKey: (key: string, nowMs?: number) => boolean;
  reset: () => void;
}

/** Tracks rapid consecutive presses of a secret key inside a rolling time window. */
export function createKeySequenceTracker(
  options: KeySequenceOptions = {},
): KeySequenceTracker {
  const target = (options.targetKey ?? DESIGN_LAB_SHORTCUT_KEY).toLowerCase();
  const required = Math.max(1, options.requiredCount ?? DESIGN_LAB_SHORTCUT_COUNT);
  const windowMs = Math.max(250, options.windowMs ?? DESIGN_LAB_SHORTCUT_WINDOW_MS);
  let timestamps: number[] = [];

  return {
    recordKey(key: string, nowMs: number = Date.now()): boolean {
      if (key.toLowerCase() !== target) {
        timestamps = [];
        return false;
      }
      const cutoff = nowMs - windowMs;
      timestamps = timestamps.filter((ts) => ts >= cutoff);
      timestamps.push(nowMs);
      if (timestamps.length >= required) {
        timestamps = [];
        return true;
      }
      return false;
    },
    reset(): void {
      timestamps = [];
    },
  };
}

/** Returns true when a keyboard event originates from a form input, textarea, select, or contenteditable element. */
export function isEditableEventTarget(target: EventTarget | null): boolean {
  if (!target || typeof target !== 'object') return false;
  const el = target as Partial<HTMLElement>;
  const tag = typeof el.tagName === 'string' ? el.tagName.toUpperCase() : '';
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    return true;
  }
  if (el.isContentEditable) return true;
  if (typeof el.getAttribute === 'function') {
    const attr = el.getAttribute('contenteditable');
    if (attr !== null && attr.toLowerCase() !== 'false') {
      return true;
    }
  }
  return false;
}
