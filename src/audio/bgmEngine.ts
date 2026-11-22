import type { BallparkPresetId } from '../engine/ballparks/stadiumCatalog';

export type BgmTrackId =
  | 'sandlot_sunshine'
  | 'dugout_funk'
  | 'twilight_bleachers'
  | 'harbor_shanty_swing'
  | 'bayfront_surf_94'
  | 'sunbelt_mariachi_groove'
  | 'sakura_pentatonic_march'
  | 'mesa_skyline_soar'
  | 'ninth_inning_turbo'
  | 'cathedral_championship';

export interface BgmTrackSpec {
  id: BgmTrackId;
  ballparkId: BallparkPresetId;
  stadiumLabel: string;
  title: string;
  vibe: string;
  bpm: number;
  leadWave: OscillatorType;
  bassWave: OscillatorType;
  chordWave: OscillatorType;
  /** 32 eighth-note MIDI lead notes (0 = rest). */
  leadNotes: readonly number[];
  /** 32 eighth-note MIDI bass notes (0 = rest). */
  bassNotes: readonly number[];
  /** 8 half-bar chord roots in MIDI (played as warm triads). */
  chordRoots: readonly number[];
  chordQuality: 'major' | 'minor' | 'dom7';
  drumIntensity: number;
  featuredClassic?: boolean;
}

export interface BgmState {
  enabled: boolean;
  masterMuted: boolean;
  playing: boolean;
  autoMatchStadium: boolean;
  currentBallparkId: BallparkPresetId;
  trackId: BgmTrackId;
  /** User-facing 0..1 slider (internally scaled gently so BGM stays cozy beneath SFX). */
  volume: number;
}

/** 10 handcrafted environmental 90s arcade baseball tracks — one unique theme per ballpark! */
export const BGM_TRACKS: readonly BgmTrackSpec[] = [
  {
    id: 'sandlot_sunshine',
    ballparkId: 'sandlot_commons',
    stadiumLabel: 'Sandlot Commons',
    title: "Sandlot Sunshine '94",
    vibe: 'Sunny 16-bit backyard groove (F Major)',
    bpm: 116,
    leadWave: 'triangle',
    bassWave: 'triangle',
    chordWave: 'sine',
    featuredClassic: true,
    leadNotes: [
      77, 0, 81, 0, 84, 81, 79, 0,
      74, 0, 77, 0, 81, 77, 74, 0,
      70, 0, 74, 0, 77, 79, 81, 0,
      79, 0, 76, 79, 84, 0, 81, 0,
    ],
    bassNotes: [
      53, 0, 60, 0, 53, 0, 57, 0,
      50, 0, 57, 0, 50, 0, 53, 0,
      46, 0, 53, 0, 46, 0, 50, 0,
      48, 0, 55, 0, 52, 0, 55, 0,
    ],
    chordRoots: [65, 65, 62, 62, 58, 58, 60, 60],
    chordQuality: 'major',
    drumIntensity: 0.72,
  },
  {
    id: 'dugout_funk',
    ballparkId: 'brickyard_classic',
    stadiumLabel: 'Brickyard Classic',
    title: '90s Dugout Funk',
    vibe: 'Downtown red-brick clubhouse funk (C Mixolydian)',
    bpm: 106,
    leadWave: 'square',
    bassWave: 'triangle',
    chordWave: 'triangle',
    featuredClassic: true,
    leadNotes: [
      72, 0, 75, 76, 0, 79, 76, 0,
      77, 0, 81, 0, 79, 77, 75, 0,
      72, 0, 76, 79, 82, 0, 79, 0,
      79, 77, 74, 0, 76, 0, 72, 0,
    ],
    bassNotes: [
      48, 0, 60, 58, 0, 55, 58, 0,
      53, 0, 65, 63, 0, 60, 58, 0,
      48, 0, 55, 58, 60, 0, 55, 0,
      55, 0, 53, 0, 50, 0, 55, 0,
    ],
    chordRoots: [60, 60, 65, 65, 60, 60, 67, 65],
    chordQuality: 'dom7',
    drumIntensity: 0.84,
  },
  {
    id: 'twilight_bleachers',
    ballparkId: 'cornfield_twilight',
    stadiumLabel: 'Cornfield Twilight Park',
    title: 'Twilight Bleachers',
    vibe: 'Golden-hour heartland breeze (G Major)',
    bpm: 94,
    leadWave: 'sine',
    bassWave: 'sine',
    chordWave: 'sine',
    featuredClassic: true,
    leadNotes: [
      79, 0, 83, 0, 86, 0, 83, 81,
      76, 0, 79, 0, 83, 0, 79, 0,
      72, 0, 76, 0, 79, 81, 83, 0,
      81, 0, 78, 0, 74, 0, 79, 0,
    ],
    bassNotes: [
      55, 0, 0, 62, 55, 0, 59, 0,
      52, 0, 0, 59, 52, 0, 55, 0,
      48, 0, 0, 55, 48, 0, 52, 0,
      50, 0, 0, 57, 50, 0, 54, 0,
    ],
    chordRoots: [67, 67, 64, 64, 60, 60, 62, 62],
    chordQuality: 'major',
    drumIntensity: 0.45,
  },
  {
    id: 'harbor_shanty_swing',
    ballparkId: 'harbor_shipyard',
    stadiumLabel: 'Harbor Shipyard Yard',
    title: 'Harbor Shipyard Swing',
    vibe: 'Salty dockside brass-arcade bounce (A Minor)',
    bpm: 112,
    leadWave: 'triangle',
    bassWave: 'triangle',
    chordWave: 'triangle',
    leadNotes: [
      69, 0, 72, 76, 79, 0, 76, 72,
      74, 0, 76, 74, 72, 0, 69, 0,
      76, 0, 79, 81, 79, 76, 74, 0,
      72, 74, 76, 0, 71, 0, 69, 0,
    ],
    bassNotes: [
      45, 0, 52, 0, 45, 0, 48, 0,
      50, 0, 57, 0, 48, 0, 55, 0,
      45, 0, 52, 0, 53, 0, 57, 0,
      52, 0, 55, 0, 52, 0, 45, 0,
    ],
    chordRoots: [57, 57, 62, 60, 57, 65, 64, 57],
    chordQuality: 'minor',
    drumIntensity: 0.78,
  },
  {
    id: 'bayfront_surf_94',
    ballparkId: 'bayfront_cove',
    stadiumLabel: 'Bayfront Cove Park',
    title: "Bayfront Surf '94",
    vibe: 'Ocean-breeze retro arcade surf riff (E Major)',
    bpm: 124,
    leadWave: 'triangle',
    bassWave: 'triangle',
    chordWave: 'sine',
    leadNotes: [
      76, 76, 80, 83, 0, 80, 76, 0,
      81, 0, 83, 81, 80, 0, 76, 0,
      73, 76, 80, 81, 80, 76, 73, 0,
      75, 0, 78, 83, 80, 0, 76, 0,
    ],
    bassNotes: [
      52, 0, 56, 59, 52, 0, 59, 0,
      57, 0, 61, 64, 57, 0, 52, 0,
      49, 0, 52, 56, 49, 0, 56, 0,
      47, 0, 51, 54, 59, 0, 52, 0,
    ],
    chordRoots: [64, 64, 69, 64, 61, 61, 59, 64],
    chordQuality: 'major',
    drumIntensity: 0.8,
  },
  {
    id: 'sunbelt_mariachi_groove',
    ballparkId: 'sunbelt_cactus',
    stadiumLabel: 'Sunbelt Cactus Field',
    title: 'Sunbelt Desert Fiesta',
    vibe: 'Festive southwest arcade horn groove (D Major)',
    bpm: 120,
    leadWave: 'square',
    bassWave: 'triangle',
    chordWave: 'triangle',
    leadNotes: [
      74, 78, 81, 0, 81, 79, 78, 0,
      79, 83, 86, 0, 83, 81, 79, 0,
      76, 79, 81, 83, 81, 79, 76, 0,
      78, 0, 81, 86, 81, 0, 74, 0,
    ],
    bassNotes: [
      50, 0, 57, 0, 50, 54, 57, 0,
      55, 0, 62, 0, 55, 59, 62, 0,
      57, 0, 64, 0, 57, 61, 64, 0,
      50, 0, 57, 0, 50, 0, 57, 0,
    ],
    chordRoots: [62, 62, 67, 67, 69, 69, 62, 62],
    chordQuality: 'major',
    drumIntensity: 0.82,
  },
  {
    id: 'sakura_pentatonic_march',
    ballparkId: 'sakura_garden',
    stadiumLabel: 'Sakura Garden Stadium',
    title: 'Sakura Brass-Band March',
    vibe: 'Koshien-inspired pentatonic stadium march (D Major)',
    bpm: 128,
    leadWave: 'triangle',
    bassWave: 'triangle',
    chordWave: 'sine',
    leadNotes: [
      74, 76, 78, 81, 83, 0, 81, 78,
      76, 78, 81, 0, 78, 76, 74, 0,
      81, 83, 86, 0, 83, 81, 78, 0,
      76, 78, 81, 83, 86, 0, 81, 0,
    ],
    bassNotes: [
      50, 0, 57, 0, 50, 0, 54, 57,
      52, 0, 59, 0, 57, 0, 50, 0,
      55, 0, 62, 0, 57, 0, 64, 0,
      50, 54, 57, 0, 50, 0, 57, 0,
    ],
    chordRoots: [62, 62, 64, 69, 67, 69, 62, 62],
    chordQuality: 'major',
    drumIntensity: 0.86,
  },
  {
    id: 'mesa_skyline_soar',
    ballparkId: 'high_altitude_mesa',
    stadiumLabel: 'High-Altitude Mesa Park',
    title: 'Mile-High Orbit Synth',
    vibe: 'Soaring thin-air 90s synth-pop (Eb Major)',
    bpm: 122,
    leadWave: 'triangle',
    bassWave: 'sawtooth',
    chordWave: 'sine',
    leadNotes: [
      75, 0, 79, 82, 87, 0, 82, 79,
      80, 0, 84, 87, 84, 0, 80, 0,
      77, 0, 80, 84, 82, 0, 79, 0,
      82, 84, 87, 0, 82, 0, 75, 0,
    ],
    bassNotes: [
      51, 0, 58, 51, 51, 0, 55, 58,
      56, 0, 63, 56, 56, 0, 60, 0,
      53, 0, 60, 53, 58, 0, 53, 0,
      58, 0, 55, 0, 51, 0, 58, 0,
    ],
    chordRoots: [63, 63, 68, 68, 65, 70, 63, 63],
    chordQuality: 'major',
    drumIntensity: 0.76,
  },
  {
    id: 'ninth_inning_turbo',
    ballparkId: 'neon_metro_dome',
    stadiumLabel: 'Neon Metro Dome',
    title: '9th-Inning Turbo',
    vibe: 'Electric 90s cyber-dome arcade synth (D Minor)',
    bpm: 132,
    leadWave: 'square',
    bassWave: 'sawtooth',
    chordWave: 'triangle',
    featuredClassic: true,
    leadNotes: [
      74, 77, 81, 0, 79, 77, 76, 0,
      70, 74, 77, 0, 81, 0, 77, 0,
      72, 76, 79, 0, 81, 79, 76, 0,
      74, 0, 81, 0, 86, 0, 81, 0,
    ],
    bassNotes: [
      50, 50, 57, 50, 50, 50, 57, 50,
      46, 46, 53, 46, 46, 46, 53, 46,
      48, 48, 55, 48, 48, 48, 55, 48,
      50, 50, 57, 50, 53, 55, 57, 50,
    ],
    chordRoots: [62, 62, 58, 58, 60, 60, 62, 62],
    chordQuality: 'minor',
    drumIntensity: 0.9,
  },
  {
    id: 'cathedral_championship',
    ballparkId: 'grand_cathedral',
    stadiumLabel: 'Grand Cathedral Colosseum',
    title: 'Grand Cathedral Anthem',
    vibe: 'Heroic Mini Major League championship brass (C Major)',
    bpm: 118,
    leadWave: 'square',
    bassWave: 'triangle',
    chordWave: 'triangle',
    leadNotes: [
      72, 0, 76, 79, 84, 0, 79, 76,
      77, 0, 81, 84, 86, 0, 84, 0,
      79, 0, 83, 86, 88, 0, 86, 83,
      84, 0, 79, 81, 84, 0, 79, 0,
    ],
    bassNotes: [
      48, 0, 55, 0, 48, 52, 55, 0,
      53, 0, 60, 0, 53, 57, 60, 0,
      55, 0, 62, 0, 55, 59, 62, 0,
      48, 0, 55, 0, 48, 0, 55, 0,
    ],
    chordRoots: [60, 60, 65, 65, 67, 67, 60, 60],
    chordQuality: 'major',
    drumIntensity: 0.82,
  },
];

const BGM_STORAGE_KEY = 'mbm.bgm.prefs.v2';
/** Keeps even 100% BGM slider cozy beneath SFX and stadium crowd roars. */
const BGM_MAX_BUS_GAIN = 0.22;
const DEFAULT_BGM_VOLUME = 0.28;

type AudioContextCtor = typeof AudioContext;
type BgmListener = (state: Readonly<BgmState>) => void;

function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function getAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

function isValidTrackId(value: unknown): value is BgmTrackId {
  return typeof value === 'string' && BGM_TRACKS.some((t) => t.id === value);
}

/** Returns the unique environmental 90s arcade track dedicated to a specific ballpark. */
export function getTrackForBallpark(ballparkId?: BallparkPresetId): BgmTrackSpec {
  return BGM_TRACKS.find((t) => t.ballparkId === ballparkId) ?? BGM_TRACKS[0];
}

function readPersistedPrefs(): Partial<
  Pick<BgmState, 'enabled' | 'autoMatchStadium' | 'trackId' | 'volume'>
> {
  try {
    if (typeof window === 'undefined' || typeof window.localStorage?.getItem !== 'function') {
      return {};
    }
    const raw = window.localStorage.getItem(BGM_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : undefined,
      autoMatchStadium:
        typeof parsed.autoMatchStadium === 'boolean' ? parsed.autoMatchStadium : undefined,
      trackId: isValidTrackId(parsed.trackId) ? parsed.trackId : undefined,
      volume:
        typeof parsed.volume === 'number' && Number.isFinite(parsed.volume)
          ? Math.max(0, Math.min(1, parsed.volume))
          : undefined,
    };
  } catch {
    return {};
  }
}

function writePersistedPrefs(
  prefs: Pick<BgmState, 'enabled' | 'autoMatchStadium' | 'trackId' | 'volume'>,
): void {
  try {
    if (typeof window === 'undefined' || typeof window.localStorage?.setItem !== 'function') {
      return;
    }
    window.localStorage.setItem(BGM_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore restricted storage environments.
  }
}

/**
 * Procedural 90s Arcade Baseball Background Music Jukebox.
 * 10 unique stadium-matched Web Audio tracks with warm CRT filtering,
 * gentle default volume, Auto-Match Stadium mode, and independent mute toggle.
 */
export class RetroBgmEngine {
  private ctx: AudioContext | null = null;
  private busGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private timerId: ReturnType<typeof setInterval> | null = null;
  private stepIndex = 0;
  private nextStepTime = 0;
  private readonly persist: boolean;
  private readonly listeners = new Set<BgmListener>();
  private state: BgmState;

  constructor(options: { persist?: boolean } = {}) {
    this.persist = options.persist ?? true;
    const saved = this.persist ? readPersistedPrefs() : {};
    this.state = {
      enabled: saved.enabled ?? true,
      masterMuted: false,
      playing: false,
      autoMatchStadium: saved.autoMatchStadium ?? true,
      currentBallparkId: 'sandlot_commons',
      trackId: saved.trackId ?? 'sandlot_sunshine',
      volume: saved.volume ?? DEFAULT_BGM_VOLUME,
    };
  }

  getState(): Readonly<BgmState> {
    return { ...this.state };
  }

  getActiveTrack(): BgmTrackSpec {
    return BGM_TRACKS.find((t) => t.id === this.state.trackId) ?? BGM_TRACKS[0];
  }

  subscribe(listener: BgmListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    const snap = this.getState();
    for (const fn of this.listeners) fn(snap);
  }

  private savePrefs(): void {
    if (!this.persist) return;
    writePersistedPrefs({
      enabled: this.state.enabled,
      autoMatchStadium: this.state.autoMatchStadium,
      trackId: this.state.trackId,
      volume: this.state.volume,
    });
  }

  private ensureAudioGraph(): AudioContext | null {
    if (this.ctx && this.busGain) {
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return this.ctx;
    }
    const Ctor = getAudioContextCtor();
    if (!Ctor) return null;

    const ctx = new Ctor();
    const bus = ctx.createGain();
    bus.gain.setValueAtTime(this.computeTargetGain(), ctx.currentTime);

    // Warm 90s console low-pass filter so square/sawtooth leads stay cozy & non-fatiguing
    const warmFilter = ctx.createBiquadFilter();
    warmFilter.type = 'lowpass';
    warmFilter.frequency.setValueAtTime(2850, ctx.currentTime);
    warmFilter.Q.setValueAtTime(0.7, ctx.currentTime);

    bus.connect(warmFilter);
    warmFilter.connect(ctx.destination);

    this.ctx = ctx;
    this.busGain = bus;
    this.noiseBuffer = this.createShortNoiseBuffer(ctx);
    return ctx;
  }

  private createShortNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const frameCount = Math.max(1, Math.floor(ctx.sampleRate * 0.14));
    const buffer = ctx.createBuffer(1, frameCount, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private computeTargetGain(): number {
    if (!this.state.enabled || this.state.masterMuted) return 0.0001;
    return Math.max(0.0001, this.state.volume * BGM_MAX_BUS_GAIN);
  }

  private updateBusGain(): void {
    if (!this.ctx || !this.busGain) return;
    const now = this.ctx.currentTime;
    this.busGain.gain.cancelScheduledValues(now);
    this.busGain.gain.setTargetAtTime(this.computeTargetGain(), now, 0.035);
  }

  /** Starts the looping arcade music cleanly if enabled and not globally muted. */
  startIfAllowed(): boolean {
    if (!this.state.enabled || this.state.masterMuted) {
      this.stopLoop();
      return false;
    }
    if (this.timerId !== null) {
      this.updateBusGain();
      return true;
    }
    const ctx = this.ensureAudioGraph();
    if (!ctx) return false;

    this.nextStepTime = ctx.currentTime + 0.04;
    this.state.playing = true;
    this.updateBusGain();
    this.timerId = setInterval(() => this.schedulerTick(), 45);
    this.emit();
    return true;
  }

  private stopLoop(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.updateBusGain();
    if (this.state.playing) {
      this.state.playing = false;
      this.emit();
    }
  }

  /** Updates the active ballpark context; swaps track automatically when Auto-Match Stadium is ON. */
  syncStadium(ballparkId?: BallparkPresetId): void {
    const resolved: BallparkPresetId = ballparkId ?? 'sandlot_commons';
    this.state.currentBallparkId = resolved;
    if (!this.state.autoMatchStadium) {
      this.emit();
      return;
    }
    const stadiumTrack = getTrackForBallpark(resolved);
    if (this.state.trackId !== stadiumTrack.id) {
      this.state.trackId = stadiumTrack.id;
      this.stepIndex = 0;
      this.savePrefs();
    }
    this.emit();
  }

  /** Enables or disables Auto-Match Stadium mode; turning it ON immediately syncs to the active venue. */
  setAutoMatchStadium(autoMatch: boolean): void {
    this.state.autoMatchStadium = autoMatch;
    if (autoMatch) {
      const stadiumTrack = getTrackForBallpark(this.state.currentBallparkId);
      if (this.state.trackId !== stadiumTrack.id) {
        this.state.trackId = stadiumTrack.id;
        this.stepIndex = 0;
      }
    }
    this.savePrefs();
    this.emit();
  }

  /** Manually selects and pins a specific arcade track (turns off Auto-Match until re-enabled). */
  selectTrack(trackId: BgmTrackId): void {
    if (!isValidTrackId(trackId)) return;
    const changed = this.state.trackId !== trackId;
    this.state.trackId = trackId;
    this.state.autoMatchStadium = false;
    if (changed) {
      this.stepIndex = 0;
    }
    this.savePrefs();
    if (this.state.enabled && !this.state.masterMuted) {
      this.startIfAllowed();
    }
    this.emit();
  }

  setEnabled(enabled: boolean): void {
    this.state.enabled = enabled;
    this.savePrefs();
    if (enabled && !this.state.masterMuted) {
      this.startIfAllowed();
    } else {
      this.stopLoop();
    }
    this.emit();
  }

  toggleEnabled(): boolean {
    this.setEnabled(!this.state.enabled);
    return this.state.enabled;
  }

  setVolume(volume: number): void {
    this.state.volume = Math.max(0, Math.min(1, volume));
    this.savePrefs();
    this.updateBusGain();
    this.emit();
  }

  setMasterMuted(muted: boolean): void {
    this.state.masterMuted = muted;
    if (muted) {
      this.stopLoop();
    } else if (this.state.enabled) {
      this.startIfAllowed();
    }
    this.emit();
  }

  dispose(): void {
    this.stopLoop();
    this.listeners.clear();
  }

  private schedulerTick(): void {
    if (!this.ctx || !this.busGain || !this.state.enabled || this.state.masterMuted) return;
    const track = this.getActiveTrack();
    const eighthSec = 60 / track.bpm / 2;

    while (this.nextStepTime < this.ctx.currentTime + 0.14) {
      this.scheduleStep(this.ctx, this.busGain, track, this.stepIndex, this.nextStepTime, eighthSec);
      this.nextStepTime += eighthSec;
      this.stepIndex = (this.stepIndex + 1) % 32;
    }
  }

  private scheduleNote(
    ctx: AudioContext,
    dest: AudioNode,
    freq: number,
    time: number,
    duration: number,
    wave: OscillatorType,
    peakGain: number,
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(peakGain, time + 0.014);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  private scheduleDrumStep(
    ctx: AudioContext,
    dest: AudioNode,
    step: number,
    time: number,
    intensity: number,
  ): void {
    const mod8 = step % 8;
    if (mod8 === 0 || mod8 === 4) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(125, time);
      osc.frequency.exponentialRampToValueAtTime(42, time + 0.11);
      g.gain.setValueAtTime(0.0001, time);
      g.gain.linearRampToValueAtTime(0.42 * intensity, time + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, time + 0.12);
      osc.connect(g);
      g.connect(dest);
      osc.start(time);
      osc.stop(time + 0.14);
    }

    if ((mod8 === 2 || mod8 === 6) && this.noiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(1650, time);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, time);
      g.gain.linearRampToValueAtTime(0.22 * intensity, time + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, time + 0.09);
      src.connect(bp);
      bp.connect(g);
      g.connect(dest);
      src.start(time);
      src.stop(time + 0.11);
    }

    if (this.noiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(4200, time);
      const g = ctx.createGain();
      const accent = mod8 % 2 === 1 ? 0.11 : 0.07;
      g.gain.setValueAtTime(0.0001, time);
      g.gain.linearRampToValueAtTime(accent * intensity, time + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, time + 0.038);
      src.connect(hp);
      hp.connect(g);
      g.connect(dest);
      src.start(time);
      src.stop(time + 0.045);
    }
  }

  private scheduleStep(
    ctx: AudioContext,
    dest: AudioNode,
    track: BgmTrackSpec,
    step: number,
    time: number,
    eighthSec: number,
  ): void {
    const leadMidi = track.leadNotes[step];
    if (leadMidi > 0) {
      const leadGain = track.leadWave === 'square' ? 0.14 : 0.24;
      this.scheduleNote(ctx, dest, midiToHz(leadMidi), time, eighthSec * 1.45, track.leadWave, leadGain);
    }

    const bassMidi = track.bassNotes[step];
    if (bassMidi > 0) {
      const bassGain = track.bassWave === 'sawtooth' ? 0.16 : 0.3;
      this.scheduleNote(ctx, dest, midiToHz(bassMidi), time, eighthSec * 1.2, track.bassWave, bassGain);
    }

    if (step % 4 === 0) {
      const chordIdx = Math.floor(step / 4) % track.chordRoots.length;
      const root = track.chordRoots[chordIdx];
      const third = root + (track.chordQuality === 'minor' ? 3 : 4);
      const fifth = root + 7;
      const chordDur = eighthSec * 3.5;
      for (const note of [root, third, fifth]) {
        this.scheduleNote(ctx, dest, midiToHz(note), time, chordDur, track.chordWave, 0.075);
      }
    }

    this.scheduleDrumStep(ctx, dest, step, time, track.drumIntensity);
  }
}

export const bgmEngine = new RetroBgmEngine();
