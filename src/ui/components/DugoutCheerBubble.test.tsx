import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { soundEngine } from '../../audio/soundEngine';
import { generateSixTierWorld } from '../../engine/league/seasonEngine';
import type { TeammateDugoutCheer } from '../../engine/gm/openingDayHook';
import { DugoutCheerBubble } from './DugoutCheerBubble';
import { LiveActionBar } from './LiveActionBar';

function makeCheer(overrides: Partial<TeammateDugoutCheer> = {}): TeammateDugoutCheer {
  const club = generateSixTierWorld(1994, {
    city: 'Sandlot',
    clubName: 'Comets',
    mascot: 'Rocket Dog',
    monogram: 'SC',
    primaryColor: '#E63946',
    secondaryColor: '#1D3557',
    accentColor: '#FFD166',
  }).leagues.rookie[0];

  return {
    id: 'cheer-10-p1',
    eventSeq: 10,
    teammate: club.roster[1],
    isFavorite: true,
    message: 'Moonshot! High-fives at home plate!',
    emoji: '💥',
    mood: 'hype',
    ...overrides,
  };
}

describe('DugoutCheerBubble (TASK-100 Cute Teammate Cheer Pill)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders teammate mini portrait, favorite star, upbeat 1-line cheer, and >=44px dismiss button', () => {
    const cheer = makeCheer();
    const onDismiss = vi.fn();

    render(
      <DugoutCheerBubble
        cheer={cheer}
        primaryColor="#E63946"
        accentColor="#FFD166"
        autoDismissMs={0}
        onDismiss={onDismiss}
      />,
    );

    const bubble = screen.getByTestId('dugout-cheer-bubble');
    expect(bubble).toHaveAttribute('role', 'status');
    expect(bubble).toHaveAttribute('data-cheer-mood', 'hype');
    expect(screen.getByTestId('dugout-cheer-portrait')).toBeInTheDocument();
    expect(bubble).toHaveTextContent(cheer.teammate.name.split(' ')[0]);
    expect(bubble).toHaveTextContent('Moonshot! High-fives at home plate!');
    expect(screen.getByTestId('dugout-cheer-fav-star')).toBeInTheDocument();

    const dismissBtn = screen.getByRole('button', { name: /dismiss dugout cheer/i });
    expect(dismissBtn.className).toMatch(/min-h-\[44px\]|min-h-11/);
    fireEvent.click(dismissBtn);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('auto-fades after autoDismissMs and reappears cleanly when a new cheer arrives', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    const cheer1 = makeCheer({ id: 'cheer-1' });
    const cheer2 = makeCheer({ id: 'cheer-2', message: 'Lightning wheels! Safe by a mile!', isFavorite: false });

    const { rerender } = render(
      <DugoutCheerBubble
        cheer={cheer1}
        primaryColor="#E63946"
        autoDismissMs={3500}
        onDismiss={onDismiss}
      />,
    );

    expect(screen.getByTestId('dugout-cheer-bubble')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(3600);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('dugout-cheer-bubble')).not.toBeInTheDocument();

    rerender(
      <DugoutCheerBubble
        cheer={cheer2}
        primaryColor="#E63946"
        autoDismissMs={3500}
        onDismiss={onDismiss}
      />,
    );
    expect(screen.getByTestId('dugout-cheer-bubble')).toHaveTextContent('Lightning wheels! Safe by a mile!');
    expect(screen.queryByTestId('dugout-cheer-fav-star')).not.toBeInTheDocument();
  });

  it('renders nothing when cheer is null', () => {
    const { container } = render(<DugoutCheerBubble cheer={null} primaryColor="#1D3557" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders Synergy Bond badge and Star Favorite sparkle flair when present (TASK-122)', () => {
    const cheer = makeCheer({
      bondBadge: 'Bash Brothers',
      isActiveStarFavorite: true,
      message: 'Bash Brothers! Clear the fence and strawberry milkshakes are on me! 💖',
      emoji: '💖',
    });

    render(
      <DugoutCheerBubble
        cheer={cheer}
        primaryColor="#E63946"
        accentColor="#FFD166"
        autoDismissMs={0}
      />,
    );

    expect(screen.getByTestId('dugout-cheer-bond-badge')).toHaveTextContent('Bash Brothers');
    expect(screen.getByTestId('dugout-cheer-favorite-sparkle')).toBeInTheDocument();
  });

  it('triggers Argue Call! chip and interactive Mascot Buddy wave tap in LiveActionBar (TASK-121 & TASK-122)', () => {
    const onArgueCall = vi.fn();
    const onMascotTap = vi.fn();
    const playSpy = vi.spyOn(soundEngine, 'play');

    render(
      <LiveActionBar
        cue={{
          kind: 'default_batting',
          urgency: 'calm',
          badgeText: 'AT BAT',
          turnLabel: 'BOT 1',
          headline: 'Step in!',
          primaryButtonLabel: 'Swing',
          suggestedAction: null,
        }}
        matchupLabel="Slugger vs Ace"
        basesLabel="Bases: · · ·"
        clubMascot="Rocket Dog"
        clubColors={{ primary: '#E63946', secondary: '#1D3557', accent: '#FFD166' }}
        clubRituals={{ hrCelebration: 'helmet_high_five', luckySnack: 'rally_nachos' }}
        latestEvent={null}
        controlMode="simple"
        watchMode="paused"
        tacticalCall="normal"
        isBatting
        gameCompleted={false}
        canArgueCall
        onArgueCall={onArgueCall}
        onMascotTap={onMascotTap}
        onNextPitch={vi.fn()}
        onToggleWatchMode={vi.fn()}
        onSimAtBat={vi.fn()}
        onSimHalfInning={vi.fn()}
        onClutchSim={vi.fn()}
        onSimToEnd={vi.fn()}
        onSelectTacticalCall={vi.fn()}
        onSuggestedAction={vi.fn()}
        onToggleControlMode={vi.fn()}
      />,
    );

    // 1. Argue Call chip fires handler
    const argueChip = screen.getByTestId('argue-call-chip');
    expect(argueChip).toHaveTextContent(/argue call/i);
    fireEvent.click(argueChip);
    expect(onArgueCall).toHaveBeenCalledTimes(1);

    // 2. Mascot Buddy tap cycles cheers, plays vendor_bell / stadium_stomp_clap, and increments wave signal callback
    const mascotBtn = screen.getByTestId('live-dugout-mascot-btn');
    fireEvent.click(mascotBtn);
    expect(onMascotTap).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('live-mascot-cheer-bubble')).toHaveTextContent(/peanuts/i);
    expect(playSpy).toHaveBeenCalledWith('vendor_bell');

    fireEvent.click(mascotBtn);
    expect(onMascotTap).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('live-mascot-cheer-bubble')).toHaveTextContent(/rally caps/i);
    expect(playSpy).toHaveBeenCalledWith('stadium_stomp_clap');

    playSpy.mockRestore();
  });
});
