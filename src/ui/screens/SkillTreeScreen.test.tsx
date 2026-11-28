import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '../../store/gameStore';
import { SkillTreeScreen } from './SkillTreeScreen';

describe('SkillTreeScreen — Capped Build-Identity Trees, Session Undo & Offseason Retrain (TASK-019, TASK-020, TASK-114)', () => {
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

    // Give the first roster batter 12 SP and club $5,000 cash so we can test specialization, undo & retrain
    const club = useGameStore.getState().getHumanClub()!;
    const firstHitterIdx = club.roster.findIndex((p) => p.position !== 'SP' && p.position !== 'RP');
    const buffedRoster = club.roster.map((p, idx) => ({
      ...p,
      skillPoints: idx === firstHitterIdx ? 12 : 0,
      marketTier: idx === firstHitterIdx ? ('average' as const) : p.marketTier,
      level: idx === firstHitterIdx ? 5 : p.level,
      awards: [],
    }));
    useGameStore.setState((state) => ({
      leagues: {
        ...state.leagues,
        [club.leagueTier]: state.leagues[club.leagueTier].map((c) =>
          c.id === club.id
            ? { ...c, economy: { ...c.economy, cash: 5_000 }, roster: buffedRoster }
            : c,
        ),
      },
      manager: state.manager ? { ...state.manager, skillPoints: 10 } : null,
    }));
  });

  it('shows Career Talent budget, Build Identity, free Undo Last, Specialized locks, and Offseason Retrain rules', async () => {
    const user = userEvent.setup();
    render(<SkillTreeScreen />);

    expect(screen.getByText(/player skill trees & heritage mastery/i)).toBeInTheDocument();
    expect(screen.getByText(/12 SP Available/i)).toBeInTheDocument();
    expect(screen.getByTestId('career-talent-budget')).toHaveTextContent(/Career Talent: 0 \/ 12 SP/i);
    expect(screen.getByTestId('player-build-identity')).toHaveTextContent('🌱 Developing Prospect');
    expect(screen.getByTestId('player-build-identity').textContent).not.toMatch(/prospect.*prospect/i);

    // Unlock Tier 1 Cultural Heritage (1 SP -> 11 SP left)
    await user.click(screen.getByRole('button', { name: /unlock tier 1 \(1 sp\)/i }));
    expect(screen.getByTestId('skill-tree-feedback').textContent).toMatch(/awakened/i);
    expect(screen.getByText(/11 SP Available/i)).toBeInTheDocument();

    // Unlock Launch Mechanics (1 SP) -> shows Undo Last -> click Undo Last -> refunds 1 SP for free!
    const unlockOneSp = screen.getAllByRole('button', { name: /^unlock \(1 sp\)$/i });
    await user.click(unlockOneSp[0]);
    expect(screen.getByTestId('career-talent-budget')).toHaveTextContent(/Career Talent: 1 \/ 12 SP/i);

    const undoBtn = screen.getByTestId('skill-tree-undo-btn');
    expect(undoBtn).toBeVisible();
    await user.click(undoBtn);
    expect(screen.getByTestId('career-talent-budget')).toHaveTextContent(/Career Talent: 0 \/ 12 SP/i);
    expect(screen.queryByTestId('skill-tree-undo-btn')).toBeNull();

    // Specialize down Power lane to Moonshot Bomb-Swing (1 + 2 + 3 = 6 SP)
    await user.click(screen.getAllByRole('button', { name: /^unlock \(1 sp\)$/i })[0]);
    await user.click(screen.getByRole('button', { name: /^unlock \(2 sp\)$/i }));
    await user.click(screen.getByRole('button', { name: /^unlock \(3 sp\)$/i }));

    expect(screen.getByTestId('career-talent-budget')).toHaveTextContent(/Career Talent: 6 \/ 12 SP/i);
    expect(screen.getByTestId('player-build-identity')).toHaveTextContent('💣 Power Specialist');
    expect(screen.getByTestId('player-build-identity').textContent).not.toMatch(/power.*power/i);
    // Rival Tier-3 batter capstones show "🔒 Specialized" pill!
    expect(screen.getByTestId('capstone-locked-pill-cap_rally_spark')).toHaveTextContent(/Specialized/i);

    // Offseason Retrain button is disabled during the regular season
    const retrainBtn = screen.getByTestId('skill-tree-retrain-btn');
    expect(retrainBtn).toHaveTextContent(/Offseason Retrain \(\$2,000/i);
    expect(retrainBtn).toBeDisabled();

    // Switch into Offseason -> Offseason Retrain becomes enabled and refunds 6 SP for $2,000!
    act(() => {
      useGameStore.getState().beginInteractiveOffseason(5);
    });
    expect(screen.getByTestId('skill-tree-retrain-btn')).not.toBeDisabled();
    await user.click(screen.getByTestId('skill-tree-retrain-btn'));
    expect(screen.getByTestId('skill-tree-feedback').textContent).toMatch(/Retrained .* refunded 6 SP/i);
    expect(screen.getByTestId('career-talent-budget')).toHaveTextContent(/Career Talent: 0 \/ 12 SP/i);
  });

  it('displays Manager Legacy Budget (X / 9 SP), Build Identity pill, and Capstone Locked pills on Manager Skill Tree tab', async () => {
    const user = userEvent.setup();
    render(<SkillTreeScreen />);

    await user.click(screen.getByRole('button', { name: /manager skill tree/i }));
    expect(screen.getByTestId('manager-skill-tree-panel')).toBeInTheDocument();
    expect(screen.getByTestId('manager-legacy-budget')).toHaveTextContent(/Manager Legacy Budget: 1 \/ 9 SP/i);
    expect(screen.getByTestId('manager-build-identity')).toHaveTextContent(/Balanced GM/i);

    // Unlock Skipper path to Rally Cap Magic -> becomes Skipper Legend & locks other 2 capstones!
    await user.click(screen.getByTestId('manager-node-btn-skipper_mound_whisper'));
    await user.click(screen.getByTestId('manager-node-btn-skipper_clutch_focus'));
    await user.click(screen.getByTestId('manager-node-btn-skipper_rally_cap'));

    expect(screen.getByTestId('manager-legacy-budget')).toHaveTextContent(/Manager Legacy Budget: 5 \/ 9 SP/i);
    expect(screen.getByTestId('manager-build-identity')).toHaveTextContent(/Skipper Legend/i);
    expect(screen.getByTestId('manager-capstone-locked-coach_rookie_whisperer')).toHaveTextContent(
      /Capstone Locked/i,
    );
    expect(screen.getByTestId('manager-capstone-locked-mogul_dynasty_aura')).toHaveTextContent(
      /Capstone Locked/i,
    );
  });
});
