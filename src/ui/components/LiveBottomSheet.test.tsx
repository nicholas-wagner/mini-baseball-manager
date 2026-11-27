import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LiveBottomSheet } from './LiveBottomSheet';

describe('LiveBottomSheet', () => {
  it('renders nothing while closed', () => {
    render(
      <LiveBottomSheet open={false} title="Tactics" onClose={vi.fn()}>
        <p>Bullpen</p>
      </LiveBottomSheet>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByText('Bullpen')).toBeNull();
  });

  it('slides up as a dialog, dismisses from the backdrop or Esc, and keeps safe-area padding', () => {
    const onClose = vi.fn();
    render(
      <LiveBottomSheet open title="Tactics" onClose={onClose}>
        <button type="button">Bring in Leo</button>
      </LiveBottomSheet>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Tactics' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog.className).toMatch(/live-bottom-sheet/);
    expect(dialog.className).toMatch(/live-sheet-safe/);
    expect(screen.getByRole('button', { name: 'Bring in Leo' })).toBeVisible();

    fireEvent.click(screen.getByTestId('tactics-sheet-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
