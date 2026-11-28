import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CREST_EMBLEMS, UNIFORM_PRESETS } from '../../engine/customization/uniformDesigner';
import { useGameStore } from '../../store/gameStore';
import { UniformDesignerPanel } from './UniformDesignerPanel';

describe('UniformDesignerPanel (TASK-138 / TASK-146)', () => {
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

  it('renders all 16 1-tap 90s throwback presets and all 18 club crest emblem buttons with unique SVG icons', () => {
    const club = useGameStore.getState().getHumanClub()!;
    render(<UniformDesignerPanel club={club} onNotice={vi.fn()} />);

    const presetsGrid = screen.getByTestId('uniform-presets-grid');
    expect(within(presetsGrid).getAllByRole('button')).toHaveLength(UNIFORM_PRESETS.length);
    expect(UNIFORM_PRESETS).toHaveLength(16);

    const emblemsGrid = screen.getByTestId('uniform-crest-emblems-grid');
    const emblemButtons = within(emblemsGrid).getAllByRole('button');
    expect(emblemButtons).toHaveLength(CREST_EMBLEMS.length);
    expect(CREST_EMBLEMS).toHaveLength(18);

    const renderedCrests = new Set<string>();
    for (const emblem of CREST_EMBLEMS) {
      fireEvent.click(within(emblemsGrid).getByRole('button', { name: emblem.label }));
      const crestIcon = screen.getByTestId('uniform-active-crest-icon');
      expect(crestIcon).toHaveAttribute('data-emblem', emblem.id);
      expect(crestIcon.innerHTML.trim().length).toBeGreaterThan(20);
      renderedCrests.add(crestIcon.innerHTML);
    }
    expect(renderedCrests.size).toBe(18);
  });

  it('toggles between Home Kit and Road Preview live on the showcase SVG and chibi preview', () => {
    const club = useGameStore.getState().getHumanClub()!;
    render(<UniformDesignerPanel club={club} onNotice={vi.fn()} />);

    const homeBtn = screen.getByRole('button', { name: /home kit/i });
    const roadBtn = screen.getByRole('button', { name: /road preview/i });
    expect(homeBtn).toHaveAttribute('aria-pressed', 'true');
    expect(roadBtn).toHaveAttribute('aria-pressed', 'false');

    const showcase = screen.getByTestId('uniform-kit-showcase');
    expect(showcase).toHaveAttribute('data-preview-mode', 'home');
    expect(showcase).toHaveAttribute('data-primary-color', '#E63946');

    fireEvent.click(roadBtn);
    expect(homeBtn).toHaveAttribute('aria-pressed', 'false');
    expect(roadBtn).toHaveAttribute('aria-pressed', 'true');
    expect(showcase).toHaveAttribute('data-preview-mode', 'road');
    expect(showcase.getAttribute('data-primary-color')).not.toBe('#E63946');
    expect(screen.getByTestId('uniform-road-note')).toBeInTheDocument();

    // Selecting a 90s throwback preset updates preview while staying responsive
    fireEvent.click(screen.getByRole('button', { name: /94 teal expansion/i }));
    expect(showcase.getAttribute('data-primary-color')).not.toBe('#008080');

    fireEvent.click(homeBtn);
    expect(showcase).toHaveAttribute('data-preview-mode', 'home');
    expect(showcase).toHaveAttribute('data-primary-color', '#008080');
  });
});
