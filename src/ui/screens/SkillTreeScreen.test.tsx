import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '../../store/gameStore';
import { SkillTreeScreen } from './SkillTreeScreen';

describe('SkillTreeScreen — Branching Trees & Cultural Heritage Mastery (TASK-019, TASK-020)', () => {
  beforeEach(() => {
    useGameStore.getState().startNewCareer({
      city: 'Sandlot',
      clubName: 'Comets',
      mascot: 'Rocket Dog',
      monogram: 'SC',
      primaryColor: '#E63946',
      secondaryColor: '#1D3557',
      accentColor: '#FFD166',
      managerName: 'Skip',
      seed: 1994,
    });

    // Give the first roster player 10 SP so we can unlock a full skill branch & heritage tier
    const club = useGameStore.getState().getHumanClub()!;
    const buffedRoster = club.roster.map((p, idx) =>
      idx === 0 ? { ...p, skillPoints: 10 } : p,
    );
    useGameStore.setState((state) => ({
      leagues: {
        ...state.leagues,
        [club.leagueTier]: state.leagues[club.leagueTier].map((c) =>
          c.id === club.id ? { ...c, roster: buffedRoster } : c,
        ),
      },
    }));
  });

  it('unlocks skill nodes sequentially, unlocks Cultural Heritage tier, and supports respec', async () => {
    const user = userEvent.setup();
    render(<SkillTreeScreen />);

    expect(screen.getByText(/player skill trees & heritage mastery/i)).toBeInTheDocument();
    expect(screen.getByText(/10 SP Available/i)).toBeInTheDocument();

    // Unlock Tier 1 Cultural Heritage (1 SP -> 9 SP left)
    await user.click(screen.getByRole('button', { name: /unlock tier 1 \(1 sp\)/i }));
    expect(screen.getByTestId('skill-tree-feedback').textContent).toMatch(/awakened/i);
    expect(screen.getByText(/9 SP Available/i)).toBeInTheDocument();

    // Unlock a Tier 1 role node (1 SP -> 8 SP left)
    const unlockButtons = screen.getAllByRole('button', { name: /^unlock \(1 sp\)$/i });
    await user.click(unlockButtons[0]);
    expect(screen.getByTestId('skill-tree-feedback').textContent).toMatch(/unlocked /i);
    expect(screen.getByText(/8 SP Available/i)).toBeInTheDocument();

    // Respec refunds the 1 SP spent on the role node ($250 cash fee)
    await user.click(screen.getByRole('button', { name: /respec \(\$250\)/i }));
    expect(screen.getByTestId('skill-tree-feedback').textContent).toMatch(/refunded 1 SP/i);
    expect(screen.getByText(/9 SP Available/i)).toBeInTheDocument();
  });
});
