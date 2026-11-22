import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createGameStore } from '../../store/gameStore';
import { PostGameSummaryModal } from './PostGameSummaryModal';

describe('PostGameSummaryModal (TASK-017)', () => {
  it('renders Final Score, Game MVP holographic card, rewards, and triggers onClose', async () => {
    const user = userEvent.setup();
    const store = createGameStore();
    store.getState().startNewCareer({
      city: 'Sandlot',
      clubName: 'Comets',
      mascot: 'Rocket Dog',
      monogram: 'SC',
      primaryColor: '#E63946',
      secondaryColor: '#1D3557',
      accentColor: '#FFD166',
      managerName: 'Coach Skip',
      seed: 1994,
    });

    const club = store.getState().getHumanClub()!;
    const opponent = store.getState().leagues.rookie.find((c) => !c.isHuman)!;
    const summary = store.getState().playInstantExhibition(opponent.id, 777)!;
    const onClose = vi.fn();

    render(
      <PostGameSummaryModal
        summary={summary}
        humanClub={club}
        managerLevel={1}
        onClose={onClose}
      />,
    );

    expect(screen.getByRole('dialog', { name: /post-game box score & mvp/i })).toBeInTheDocument();
    expect(screen.getAllByText(summary.mvp.playerName).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/\+\$/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /back to clubhouse/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
