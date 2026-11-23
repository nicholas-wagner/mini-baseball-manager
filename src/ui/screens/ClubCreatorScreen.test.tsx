import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { useGameStore } from '../../store/gameStore';
import { ClubCreatorScreen } from './ClubCreatorScreen';

describe('ClubCreatorScreen — Fair Starting Roster Presets (TASK-064)', () => {
  it('renders all 6 starting roster presets and founds an All Rookies Rookie-tier club', async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    render(<ClubCreatorScreen onCreated={onCreated} />);

    for (const label of [
      'Balanced',
      'All Rookies',
      'Veterans',
      'Good Defense',
      'Good Hitting',
      'Good Pitching',
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }

    await user.click(screen.getByRole('button', { name: /all rookies/i }));
    await user.click(screen.getByRole('button', { name: /play opening day/i }));

    expect(onCreated).toHaveBeenCalledTimes(1);
    const club = useGameStore.getState().getHumanClub()!;
    expect(club.leagueTier).toBe('rookie');
    expect(club.roster.every((p) => p.marketTier === 'rookie')).toBe(true);
  });
});

it('deals a fresh roster when founding two clubs with the default choices', async () => {
  let seed = 4000;
  const entropy = vi.spyOn(crypto, 'getRandomValues').mockImplementation(buffer => {
    if (buffer instanceof Uint32Array) buffer[0] = ++seed;
    return buffer;
  });
  try {
    const found = async () => {
      const view = render(<ClubCreatorScreen onCreated={() => {}} />);
      await userEvent.click(screen.getByRole('button', { name: /play opening day/i }));
      const ids = useGameStore.getState().getHumanClub()!.roster.map(p => p.id);
      view.unmount();
      return ids;
    };
    const first = await found();
    expect(await found()).not.toEqual(first);
  } finally {
    entropy.mockRestore();
  }
});
