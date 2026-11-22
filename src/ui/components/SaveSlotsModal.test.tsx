import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '../../store/gameStore';
import { createSaveRepository } from '../../store/persistence';
import { SaveSlotsModal } from './SaveSlotsModal';

describe('SaveSlotsModal (TASK-018)', () => {
  beforeEach(() => {
    useGameStore.getState().startNewCareer({
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
  });

  it('saves, exports JSON, imports valid JSON, and reports invalid JSON cleanly', async () => {
    const user = userEvent.setup();
    const repo = createSaveRepository();
    const onClose = vi.fn();

    render(<SaveSlotsModal open repository={repo} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: /save to slot 1/i }));
    expect(await screen.findByText(/sandlot comets/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /export json backup/i }));
    const jsonBox = screen.getByLabelText(/json backup payload/i) as HTMLTextAreaElement;
    expect(jsonBox.value).toContain('Sandlot');

    await user.clear(jsonBox);
    await user.type(jsonBox, 'bad-json');
    await user.click(screen.getByRole('button', { name: /import json backup/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/invalid save json/i);
  });
});
