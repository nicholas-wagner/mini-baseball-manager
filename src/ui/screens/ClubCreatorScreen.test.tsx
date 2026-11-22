import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '../../store/gameStore';
import { ClubCreatorScreen } from './ClubCreatorScreen';

describe('ClubCreatorScreen (TASK-015)', () => {
  beforeEach(() => {
    useGameStore.setState({
      humanClubId: null,
      manager: null,
      lastPostGameSummary: null,
    });
  });

  it('renders inputs, live chibi preview, randomizes deterministically, and starts a career', async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    render(<ClubCreatorScreen onCreated={onCreated} />);

    const cityInput = screen.getByLabelText(/club city/i) as HTMLInputElement;
    const nameInput = screen.getByLabelText(/club name/i) as HTMLInputElement;
    expect(screen.getByTestId('mini-player-svg-front')).toBeInTheDocument();

    const initialCity = cityInput.value;
    const initialName = nameInput.value;

    await user.click(screen.getByRole('button', { name: /randomize club/i }));
    expect(cityInput.value !== initialCity || nameInput.value !== initialName).toBe(true);

    await user.clear(cityInput);
    await user.type(cityInput, 'Neon');
    await user.clear(nameInput);
    await user.type(nameInput, 'Comets');

    await user.click(screen.getByRole('button', { name: /start sandlot dynasty/i }));

    expect(onCreated).toHaveBeenCalledTimes(1);
    const createdClub = useGameStore.getState().getHumanClub();
    expect(createdClub).not.toBeNull();
    expect(createdClub?.city).toBe('Neon');
    expect(createdClub?.name).toBe('Comets');
    expect(useGameStore.getState().leagues.rookie).toHaveLength(8);
  });
});
