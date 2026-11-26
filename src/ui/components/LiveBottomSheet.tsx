import { useEffect, useId, useState, type ReactNode } from 'react';

export function useWideStudio(query = '(min-width: 1024px)'): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window.matchMedia !== 'function') return true;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);

  return matches;
}

/**
 * Phone sheet (~70% tall, diamond stays visible) or an inline broadcast-booth stack.
 * Landscape phones pin the panel over the field and leave the right thumb dock alone.
 */
export function LiveBottomSheet({
  open,
  title,
  onClose,
  children,
  presentation = 'sheet',
  testId = 'tactics-sheet',
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  presentation?: 'sheet' | 'inline';
  testId?: string;
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open || presentation !== 'sheet') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, presentation]);

  if (presentation === 'inline') {
    return (
      <div className="live-booth-stack" data-testid="broadcast-booth">
        {children}
      </div>
    );
  }

  if (!open) return null;

  return (
    <div className="live-sheet-root">
      <button
        type="button"
        className="live-sheet-backdrop"
        data-testid={`${testId}-backdrop`}
        aria-label="Close tactics"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid={testId}
        tabIndex={-1}
        className="live-bottom-sheet live-sheet-safe"
      >
        <header className="live-sheet-handle">
          <h2 id={titleId}>{title}</h2>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="live-sheet-body">{children}</div>
      </div>
    </div>
  );
}
