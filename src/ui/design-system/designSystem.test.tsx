import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AppShell } from './AppShell';
import { ComicButton } from './ComicButton';
import { ScoreboardStrip } from './ScoreboardStrip';
import { StatBadge } from './StatBadge';
import { getStatGrade } from './statGrade';

describe('90s Baseball Card Design System', () => {
  it('maps 1-99 ratings to retro letter grades cleanly', () => {
    expect(getStatGrade(97).grade).toBe('S+');
    expect(getStatGrade(88).grade).toBe('S');
    expect(getStatGrade(78).grade).toBe('A');
    expect(getStatGrade(65).grade).toBe('B');
    expect(getStatGrade(50).grade).toBe('C');
    expect(getStatGrade(38).grade).toBe('D');
    expect(getStatGrade(20).grade).toBe('F');
  });

  it('triggers click handlers and exposes pressed state on ComicButton', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <ComicButton variant="coral" active onClick={onClick}>
        Bomb Swing
      </ComicButton>,
    );

    const btn = screen.getByRole('button', { name: /bomb swing/i });
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    await user.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders StatBadge with grade and value in bar mode', () => {
    render(<StatBadge label="Power" value={95} showBar />);
    expect(screen.getByText('Power')).toBeInTheDocument();
    expect(screen.getByText('S+')).toBeInTheDocument();
    expect(screen.getByText('95')).toBeInTheDocument();
  });

  it('displays teams, score, inning, count, and rivalry badge on ScoreboardStrip', () => {
    render(
      <ScoreboardStrip
        awayAbbr="BP"
        awayScore={3}
        awayColor="#0096C7"
        homeAbbr="SC"
        homeScore={4}
        homeColor="#E63946"
        inning={9}
        half="BOT"
        balls={2}
        strikes={2}
        outs={1}
        rivalryLabel="CROSSTOWN RIVAL"
      />,
    );

    expect(screen.getByRole('region', { name: /live baseball scoreboard/i })).toBeInTheDocument();
    expect(screen.getByText('BP')).toBeInTheDocument();
    expect(screen.getByText('SC')).toBeInTheDocument();
    expect(screen.getByText('▼ 9')).toBeInTheDocument();
    expect(screen.getByLabelText('Balls 2')).toBeInTheDocument();
    expect(screen.getByText(/crosstown rival/i)).toBeInTheDocument();
  });

  it('switches tabs and toggles mute inside AppShell', async () => {
    const user = userEvent.setup();
    const onSelectTab = vi.fn();
    const onToggleMute = vi.fn();

    render(
      <AppShell
        clubName="Sandlot Comets"
        leagueLabel="Rookie League"
        navItems={[
          { id: 'lab', label: 'Design Lab', icon: <span>🎨</span> },
          { id: 'club', label: 'Clubhouse', icon: <span>⚾</span> },
        ]}
        activeTab="lab"
        onSelectTab={onSelectTab}
        muted={false}
        onToggleMute={onToggleMute}
      >
        <div>Body Content</div>
      </AppShell>,
    );

    expect(screen.getByText('Body Content')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: /clubhouse/i })[0]);
    expect(onSelectTab).toHaveBeenCalledWith('club');

    await user.click(screen.getAllByRole('button', { name: /mute audio/i })[0]);
    expect(onToggleMute).toHaveBeenCalledTimes(1);
  });
});
