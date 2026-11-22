export type SoundCue =
  | 'bat_crack'
  | 'bomb_crack'
  | 'bunt_tap'
  | 'glove_pop'
  | 'pitch_whoosh'
  | 'comet_pitch'
  | 'knuckle_warble'
  | 'tornado_whoosh'
  | 'spring_boing'
  | 'strikeout_punch'
  | 'dirt_slide'
  | 'foul_clank'
  | 'double_play_snap'
  | 'error_bonk'
  | 'crowd_cheer'
  | 'crowd_gasp'
  | 'organ_charge'
  | 'organ_homerun'
  | 'organ_rally'
  | 'stadium_stomp_clap'
  | 'bullpen_phone'
  | 'fireworks_boom'
  | 'clutch_stinger'
  | 'card_flip'
  | 'trophy_fanfare'
  | 'level_up'
  | 'cash_chime'
  | 'ui_pop'
  | 'ump_strike_call'
  | 'ump_safe_call'
  | 'steal_burst'
  | 'broken_bat'
  | 'wall_thud'
  | 'walk_ball_four'
  | 'organ_seventh_stretch'
  | 'stadium_airhorn'
  | 'vendor_bell'
  | 'rain_thunder'
  | 'heritage_power_surge'
  | 'trade_gavel';

export type SoundboardCategory = 'action' | 'atmosphere' | 'rpg';

export interface SoundboardCueSpec {
  cue: SoundCue;
  label: string;
  category: SoundboardCategory;
}

/** Complete 40-cue procedural 90s ballpark soundboard catalog (100% offline Web Audio). */
export const ALL_SOUNDBOARD_CUES: readonly SoundboardCueSpec[] = [
  // On-Field Action (20)
  { cue: 'bat_crack', label: 'Bat Crack', category: 'action' },
  { cue: 'bomb_crack', label: 'Bomb Blast', category: 'action' },
  { cue: 'broken_bat', label: 'Shattered Bat!', category: 'action' },
  { cue: 'bunt_tap', label: 'Bunt Tap', category: 'action' },
  { cue: 'glove_pop', label: 'Glove Pop', category: 'action' },
  { cue: 'pitch_whoosh', label: 'Pitch Whoosh', category: 'action' },
  { cue: 'comet_pitch', label: 'Comet Pitch', category: 'action' },
  { cue: 'knuckle_warble', label: 'Ghost Knuckle', category: 'action' },
  { cue: 'tornado_whoosh', label: 'Tornado Slider', category: 'action' },
  { cue: 'spring_boing', label: 'High-Jump Boing', category: 'action' },
  { cue: 'strikeout_punch', label: 'Strikeout Punch', category: 'action' },
  { cue: 'ump_strike_call', label: 'Ump: Strike Three!', category: 'action' },
  { cue: 'ump_safe_call', label: 'Ump: Safe!', category: 'action' },
  { cue: 'steal_burst', label: 'Base Steal Burst', category: 'action' },
  { cue: 'dirt_slide', label: 'Dusty Slide', category: 'action' },
  { cue: 'wall_thud', label: 'Outfield Wall Thud', category: 'action' },
  { cue: 'foul_clank', label: 'Foul Backstop', category: 'action' },
  { cue: 'double_play_snap', label: 'Turn-Two DP', category: 'action' },
  { cue: 'walk_ball_four', label: 'Ball Four Trot', category: 'action' },
  { cue: 'error_bonk', label: 'Error / Slump Bonk', category: 'action' },
  // Ballpark Atmosphere & Organ (12)
  { cue: 'organ_charge', label: 'Organ: Charge!', category: 'atmosphere' },
  { cue: 'organ_homerun', label: 'Organ: Home Run!', category: 'atmosphere' },
  { cue: 'organ_rally', label: 'Organ: Rally Clap', category: 'atmosphere' },
  { cue: 'organ_seventh_stretch', label: 'Organ: 7th-Inning Stretch', category: 'atmosphere' },
  { cue: 'stadium_stomp_clap', label: 'Stomp-Stomp-Clap!', category: 'atmosphere' },
  { cue: 'stadium_airhorn', label: 'Stadium Airhorn!', category: 'atmosphere' },
  { cue: 'crowd_cheer', label: 'Crowd Roar', category: 'atmosphere' },
  { cue: 'crowd_gasp', label: 'Crowd Gasp', category: 'atmosphere' },
  { cue: 'vendor_bell', label: 'Peanuts & Sodas Bell', category: 'atmosphere' },
  { cue: 'rain_thunder', label: 'Rain Delay Rumble', category: 'atmosphere' },
  { cue: 'bullpen_phone', label: 'Bullpen Phone', category: 'atmosphere' },
  { cue: 'fireworks_boom', label: 'Walk-Off Fireworks', category: 'atmosphere' },
  // RPG, Cards & Front Office (8)
  { cue: 'heritage_power_surge', label: 'Myth/Animal Power!', category: 'rpg' },
  { cue: 'clutch_stinger', label: 'Critical Moment', category: 'rpg' },
  { cue: 'level_up', label: 'RPG Level Up', category: 'rpg' },
  { cue: 'trophy_fanfare', label: 'Champ / Draft Fanfare', category: 'rpg' },
  { cue: 'trade_gavel', label: 'Trade Deal Sealed!', category: 'rpg' },
  { cue: 'cash_chime', label: 'Sim-City Cash', category: 'rpg' },
  { cue: 'card_flip', label: 'Cardstock Flip', category: 'rpg' },
  { cue: 'ui_pop', label: 'UI Pop', category: 'rpg' },
];

interface AudioState {
  muted: boolean;
  volume: number;
  lastCue: SoundCue | null;
}

type AudioContextCtor = typeof AudioContext;

function getAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/**
 * Procedural Retro 90s Web Audio Synth & Ballpark Organ.
 * Zero external sound files needed — works 100% offline in Android PWAs.
 */
export class RetroSoundEngine {
  private ctx: AudioContext | null = null;
  private state: AudioState = { muted: false, volume: 0.7, lastCue: null };

  getState(): Readonly<AudioState> {
    return { ...this.state };
  }

  setMuted(muted: boolean): void {
    this.state.muted = muted;
  }

  toggleMute(): boolean {
    this.state.muted = !this.state.muted;
    return this.state.muted;
  }

  setVolume(volume: number): void {
    this.state.volume = Math.max(0, Math.min(1, volume));
  }

  private ensureContext(): AudioContext | null {
    if (this.state.muted || this.state.volume <= 0) return null;
    if (!this.ctx) {
      const Ctor = getAudioContextCtor();
      if (!Ctor) return null;
      this.ctx = new Ctor();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private tone(
    ctx: AudioContext,
    freqStart: number,
    freqEnd: number,
    startOffset: number,
    duration: number,
    type: OscillatorType,
    gainPeak: number,
  ): void {
    const now = ctx.currentTime + startOffset;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    if (freqEnd !== freqStart) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainPeak * this.state.volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  private createPinkNoiseBuffer(ctx: AudioContext, duration: number): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const frameCount = Math.max(1, Math.floor(sampleRate * duration));
    const buffer = ctx.createBuffer(1, frameCount, sampleRate);
    const data = buffer.getChannelData(0);
    // Paul Kellet's pink-noise filter: warm human crowd spectrum without harsh white hiss
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;
    for (let i = 0; i < frameCount; i += 1) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.065;
      b6 = white * 0.115926;
    }
    return buffer;
  }

  private playFilteredPinkSweep(
    ctx: AudioContext,
    startOffset: number,
    duration: number,
    freqStart: number,
    freqEnd: number,
    q: number,
    gainPeak: number,
  ): void {
    const now = ctx.currentTime + startOffset;
    const src = ctx.createBufferSource();
    src.buffer = this.createPinkNoiseBuffer(ctx, duration);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(q, now);
    filter.frequency.setValueAtTime(freqStart, now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), now + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainPeak * this.state.volume, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(now);
    src.stop(now + duration + 0.03);
  }

  /**
   * Layered stadium crowd roar:
   * - Pink noise sculpted through 3 human vocal-tract formants ("oooh / yeeeah!")
   * - Organic slow swell + stadium reverb tail
   * - Staggered bleacher hand claps
   * - Subtle distant fan whistle/cheer embedded in the swell
   */
  private playCrowdLayer(ctx: AudioContext, startOffset = 0, duration = 1.65, intensity = 1): void {
    const now = ctx.currentTime + startOffset;
    const pinkBuffer = this.createPinkNoiseBuffer(ctx, duration);

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.0001, now);
    masterGain.gain.linearRampToValueAtTime(0.62 * intensity * this.state.volume, now + 0.24);
    masterGain.gain.setValueAtTime(0.58 * intensity * this.state.volume, now + duration * 0.45);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    const airLowpass = ctx.createBiquadFilter();
    airLowpass.type = 'lowpass';
    airLowpass.frequency.setValueAtTime(2900, now);
    masterGain.connect(airLowpass);
    airLowpass.connect(ctx.destination);

    const formants: readonly { startFreq: number; peakFreq: number; q: number; gain: number }[] = [
      { startFreq: 420, peakFreq: 540, q: 2.2, gain: 0.75 },
      { startFreq: 980, peakFreq: 1240, q: 2.8, gain: 0.58 },
      { startFreq: 1950, peakFreq: 2350, q: 3.4, gain: 0.28 },
    ];

    for (const f of formants) {
      const src = ctx.createBufferSource();
      src.buffer = pinkBuffer;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.setValueAtTime(f.q, now);
      bp.frequency.setValueAtTime(f.startFreq, now);
      bp.frequency.linearRampToValueAtTime(f.peakFreq, now + 0.35);
      bp.frequency.linearRampToValueAtTime(f.startFreq * 0.92, now + duration);

      const fg = ctx.createGain();
      fg.gain.setValueAtTime(f.gain, now);

      src.connect(bp);
      bp.connect(fg);
      fg.connect(masterGain);
      src.start(now);
      src.stop(now + duration + 0.04);
    }

    const clapCount = 12;
    for (let i = 0; i < clapCount; i += 1) {
      const clapOffset = startOffset + 0.14 + (i / clapCount) * (duration * 0.68) + (i % 3) * 0.017;
      this.noiseBurst(ctx, clapOffset, 0.042, 1150 + (i % 4) * 210, 'bandpass', 0.13 * intensity);
    }

    this.tone(ctx, 740, 1120, startOffset + 0.18, 0.22, 'sine', 0.045 * intensity);
    this.tone(ctx, 1120, 860, startOffset + 0.4, 0.26, 'sine', 0.035 * intensity);
  }

  private playCrowdGasp(ctx: AudioContext): void {
    // Warm downward vocal-tract "oooooh!" swell (zero harsh static)
    this.playFilteredPinkSweep(ctx, 0, 0.9, 520, 310, 2.4, 0.55);
    this.playFilteredPinkSweep(ctx, 0.02, 0.88, 1080, 640, 3.0, 0.42);
    this.tone(ctx, 410, 250, 0.04, 0.45, 'sine', 0.06);
  }

  private noiseBurst(
    ctx: AudioContext,
    startOffset: number,
    duration: number,
    filterFreq: number,
    filterType: BiquadFilterType,
    gainPeak: number,
  ): void {
    const sampleRate = ctx.sampleRate;
    const frameCount = Math.max(1, Math.floor(sampleRate * duration));
    const buffer = ctx.createBuffer(1, frameCount, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }

    const now = ctx.currentTime + startOffset;
    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFreq, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainPeak * this.state.volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(now);
    src.stop(now + duration + 0.02);
  }

  private playBleacherStomp(ctx: AudioContext, offset: number): void {
    // Layered bleacher sub-thump + micro-staggered crowd footfalls so it feels like a packed stadium
    this.tone(ctx, 118, 40, offset, 0.16, 'sine', 0.56);
    this.noiseBurst(ctx, offset, 0.13, 210, 'lowpass', 0.62);
    this.tone(ctx, 96, 38, offset + 0.016, 0.14, 'triangle', 0.28);
    this.noiseBurst(ctx, offset + 0.018, 0.09, 340, 'lowpass', 0.3);
  }

  private playStadiumClap(ctx: AudioContext, offset: number): void {
    // Multi-layered bleacher clap cluster with subtle stadium slapback echo
    [0, 0.011, 0.024, 0.039].forEach((jitter, idx) => {
      this.noiseBurst(ctx, offset + jitter, 0.055, 1150 + idx * 290, 'bandpass', 0.44 - idx * 0.06);
    });
    this.noiseBurst(ctx, offset + 0.075, 0.08, 980, 'bandpass', 0.16);
  }

  private playStompStompClap(ctx: AudioContext): void {
    // Two iconic stadium bars (~96 BPM): STOMP • STOMP • CLAP! (rest) STOMP • STOMP • CLAP!
    const bars = [0, 1.24];
    for (const barStart of bars) {
      this.playBleacherStomp(ctx, barStart);
      this.playBleacherStomp(ctx, barStart + 0.31);
      this.playStadiumClap(ctx, barStart + 0.62);
    }
    this.playCrowdLayer(ctx, 0.6, 1.85, 0.42);
  }

  private playGlovePopAt(ctx: AudioContext, offset: number, gainScale = 1): void {
    this.noiseBurst(ctx, offset, 0.065, 700, 'lowpass', 0.45 * gainScale);
    this.tone(ctx, 195, 80, offset, 0.065, 'sine', 0.35 * gainScale);
  }

  private playOrganNotes(
    ctx: AudioContext,
    notes: readonly [number, number, number][],
    harmonicRatio: number,
  ): void {
    for (const [freq, offset, dur] of notes) {
      this.tone(ctx, freq, freq, offset, dur, 'square', 0.16);
      this.tone(ctx, freq * harmonicRatio, freq * harmonicRatio, offset, dur, 'triangle', 0.1);
    }
  }

  private playActionCue(ctx: AudioContext, cue: SoundCue): boolean {
    switch (cue) {
      case 'bat_crack':
        this.noiseBurst(ctx, 0, 0.09, 1800, 'bandpass', 0.55);
        this.tone(ctx, 420, 140, 0, 0.08, 'triangle', 0.38);
        return true;
      case 'bomb_crack':
        this.noiseBurst(ctx, 0, 0.16, 1500, 'bandpass', 0.72);
        this.tone(ctx, 540, 90, 0, 0.22, 'sawtooth', 0.42);
        this.tone(ctx, 880, 1320, 0.05, 0.22, 'square', 0.18);
        return true;
      case 'bunt_tap':
        this.noiseBurst(ctx, 0, 0.04, 2400, 'bandpass', 0.3);
        this.tone(ctx, 320, 210, 0, 0.05, 'triangle', 0.25);
        return true;
      case 'glove_pop':
        this.playGlovePopAt(ctx, 0);
        return true;
      case 'pitch_whoosh':
        this.noiseBurst(ctx, 0, 0.18, 950, 'bandpass', 0.3);
        this.tone(ctx, 480, 190, 0, 0.16, 'sine', 0.18);
        return true;
      case 'comet_pitch':
        this.noiseBurst(ctx, 0, 0.28, 2200, 'highpass', 0.4);
        this.tone(ctx, 340, 1180, 0, 0.14, 'sawtooth', 0.28);
        this.tone(ctx, 1180, 240, 0.12, 0.2, 'sawtooth', 0.3);
        return true;
      case 'knuckle_warble':
        [0, 0.07, 0.14, 0.21].forEach((offset, idx) => {
          this.tone(ctx, idx % 2 === 0 ? 520 : 690, idx % 2 === 0 ? 710 : 460, offset, 0.08, 'sine', 0.24);
        });
        return true;
      case 'tornado_whoosh':
        this.playFilteredPinkSweep(ctx, 0, 0.36, 700, 1900, 3.2, 0.48);
        [0, 0.08, 0.16, 0.24].forEach((offset, idx) => {
          this.tone(ctx, 420 + idx * 140, 1180 - idx * 120, offset, 0.1, 'sawtooth', 0.17);
        });
        return true;
      case 'spring_boing':
        this.tone(ctx, 180, 680, 0, 0.14, 'triangle', 0.34);
        this.tone(ctx, 640, 320, 0.14, 0.12, 'triangle', 0.22);
        this.tone(ctx, 360, 760, 0.24, 0.14, 'triangle', 0.2);
        return true;
      case 'strikeout_punch':
        this.playGlovePopAt(ctx, 0, 1.1);
        this.tone(ctx, 220, 110, 0.07, 0.18, 'sawtooth', 0.32);
        this.tone(ctx, 330, 440, 0.11, 0.2, 'square', 0.22);
        return true;
      case 'dirt_slide':
        this.playFilteredPinkSweep(ctx, 0, 0.38, 1650, 560, 1.4, 0.65);
        this.tone(ctx, 145, 62, 0.28, 0.11, 'sine', 0.3);
        return true;
      case 'foul_clank':
        this.noiseBurst(ctx, 0, 0.045, 2500, 'bandpass', 0.34);
        this.tone(ctx, 1480, 1420, 0.04, 0.14, 'triangle', 0.2);
        this.tone(ctx, 2210, 2140, 0.04, 0.11, 'sine', 0.14);
        return true;
      case 'double_play_snap':
        this.playGlovePopAt(ctx, 0, 0.9);
        this.tone(ctx, 560, 290, 0.09, 0.09, 'sine', 0.14);
        this.playGlovePopAt(ctx, 0.2, 1.0);
        this.tone(ctx, 620, 310, 0.29, 0.09, 'sine', 0.14);
        this.playGlovePopAt(ctx, 0.4, 1.15);
        return true;
      case 'error_bonk':
        this.tone(ctx, 260, 145, 0, 0.12, 'triangle', 0.35);
        this.tone(ctx, 392, 370, 0.14, 0.16, 'triangle', 0.24);
        this.tone(ctx, 349.23, 311.13, 0.32, 0.28, 'triangle', 0.24);
        return true;
      case 'ump_strike_call':
        this.playGlovePopAt(ctx, 0, 1.0);
        this.tone(ctx, 185, 290, 0.08, 0.13, 'sawtooth', 0.26);
        this.tone(ctx, 320, 145, 0.22, 0.22, 'sawtooth', 0.32);
        this.noiseBurst(ctx, 0.22, 0.09, 1300, 'bandpass', 0.28);
        return true;
      case 'ump_safe_call':
        this.playFilteredPinkSweep(ctx, 0, 0.18, 1250, 620, 1.5, 0.42);
        this.tone(ctx, 440, 659.25, 0.08, 0.13, 'triangle', 0.28);
        this.tone(ctx, 659.25, 880, 0.2, 0.16, 'triangle', 0.26);
        return true;
      case 'steal_burst':
        [0, 0.07, 0.14, 0.21].forEach((offset) => {
          this.noiseBurst(ctx, offset, 0.045, 1600, 'bandpass', 0.32);
        });
        this.playFilteredPinkSweep(ctx, 0.06, 0.3, 680, 2100, 2.2, 0.44);
        this.tone(ctx, 320, 760, 0.08, 0.22, 'triangle', 0.2);
        return true;
      case 'broken_bat':
        this.noiseBurst(ctx, 0, 0.07, 2600, 'bandpass', 0.58);
        this.tone(ctx, 560, 220, 0, 0.06, 'square', 0.28);
        [0.055, 0.11, 0.165, 0.22].forEach((offset, idx) => {
          this.noiseBurst(ctx, offset, 0.035, 1950 + idx * 380, 'bandpass', 0.36 - idx * 0.05);
          this.tone(ctx, 740 - idx * 90, 410 - idx * 50, offset, 0.045, 'triangle', 0.14);
        });
        return true;
      case 'wall_thud':
        this.tone(ctx, 135, 44, 0, 0.2, 'sine', 0.56);
        this.noiseBurst(ctx, 0, 0.16, 260, 'lowpass', 0.64);
        this.tone(ctx, 380, 210, 0.12, 0.12, 'triangle', 0.2);
        return true;
      case 'walk_ball_four':
        this.playGlovePopAt(ctx, 0, 0.85);
        this.tone(ctx, 340, 240, 0.1, 0.09, 'triangle', 0.18);
        [0.2, 0.28, 0.36, 0.44].forEach((offset, idx) => {
          this.noiseBurst(ctx, offset, 0.04, 1200 + idx * 140, 'bandpass', 0.22);
        });
        return true;
      default:
        return false;
    }
  }

  private playAtmosphereAndRpgCue(ctx: AudioContext, cue: SoundCue): void {
    switch (cue) {
      case 'crowd_cheer':
        this.playCrowdLayer(ctx, 0, 1.75, 1.0);
        break;
      case 'crowd_gasp':
        this.playCrowdGasp(ctx);
        break;
      case 'organ_charge':
        this.playOrganNotes(
          ctx,
          [
            [392.0, 0.0, 0.11],
            [523.25, 0.12, 0.11],
            [659.25, 0.24, 0.11],
            [783.99, 0.36, 0.22],
            [659.25, 0.6, 0.1],
            [783.99, 0.72, 0.38],
          ],
          2,
        );
        break;
      case 'organ_homerun':
        this.playOrganNotes(
          ctx,
          [
            [523.25, 0.0, 0.12],
            [659.25, 0.12, 0.12],
            [783.99, 0.24, 0.12],
            [1046.5, 0.38, 0.28],
            [880.0, 0.68, 0.12],
            [1046.5, 0.82, 0.42],
          ],
          0.5,
        );
        this.playCrowdLayer(ctx, 0.28, 1.6, 0.75);
        break;
      case 'organ_rally':
        this.playOrganNotes(
          ctx,
          [
            [523.25, 0.0, 0.1],
            [523.25, 0.13, 0.1],
            [587.33, 0.26, 0.1],
            [659.25, 0.39, 0.14],
            [783.99, 0.56, 0.2],
          ],
          2,
        );
        [0.82, 0.96, 1.12, 1.22, 1.32].forEach((offset) => {
          this.noiseBurst(ctx, offset, 0.045, 1300, 'bandpass', 0.34);
        });
        break;
      case 'stadium_stomp_clap':
        this.playStompStompClap(ctx);
        break;
      case 'bullpen_phone':
        [0, 0.34].forEach((ringOffset) => {
          this.tone(ctx, 440, 440, ringOffset, 0.22, 'sine', 0.22);
          this.tone(ctx, 480, 480, ringOffset, 0.22, 'sine', 0.2);
          this.tone(ctx, 1760, 1760, ringOffset, 0.2, 'triangle', 0.07);
        });
        break;
      case 'fireworks_boom':
        this.tone(ctx, 560, 1840, 0, 0.26, 'sine', 0.14);
        this.noiseBurst(ctx, 0.27, 0.3, 320, 'lowpass', 0.68);
        this.tone(ctx, 130, 42, 0.27, 0.28, 'sine', 0.42);
        [0.36, 0.43, 0.5, 0.58].forEach((offset, idx) => {
          this.noiseBurst(ctx, offset, 0.04, 2400 + idx * 350, 'highpass', 0.22);
        });
        this.tone(ctx, 640, 1980, 0.52, 0.24, 'sine', 0.12);
        this.noiseBurst(ctx, 0.77, 0.34, 280, 'lowpass', 0.65);
        this.playCrowdLayer(ctx, 0.32, 1.5, 0.82);
        break;
      case 'clutch_stinger':
        this.tone(ctx, 98, 62, 0, 0.14, 'sine', 0.44);
        this.tone(ctx, 98, 62, 0.18, 0.16, 'sine', 0.48);
        this.tone(ctx, 293.66, 293.66, 0.32, 0.36, 'sawtooth', 0.15);
        this.tone(ctx, 440, 440, 0.36, 0.34, 'triangle', 0.2);
        this.tone(ctx, 587.33, 622.25, 0.4, 0.32, 'triangle', 0.18);
        break;
      case 'card_flip':
        this.noiseBurst(ctx, 0, 0.038, 2500, 'bandpass', 0.32);
        this.tone(ctx, 920, 420, 0.01, 0.04, 'triangle', 0.14);
        break;
      case 'trophy_fanfare':
        this.playOrganNotes(
          ctx,
          [
            [523.25, 0.0, 0.12],
            [659.25, 0.12, 0.12],
            [783.99, 0.24, 0.14],
            [1046.5, 0.4, 0.24],
            [783.99, 0.66, 0.12],
            [1046.5, 0.8, 0.46],
          ],
          1.5,
        );
        break;
      case 'level_up':
        [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, idx) => {
          this.tone(ctx, freq, freq, idx * 0.075, 0.18, 'triangle', 0.26);
        });
        break;
      case 'cash_chime':
        this.tone(ctx, 987.77, 987.77, 0, 0.08, 'sine', 0.25);
        this.tone(ctx, 1318.51, 1318.51, 0.08, 0.22, 'sine', 0.28);
        break;
      case 'ui_pop':
        this.tone(ctx, 520, 780, 0, 0.065, 'triangle', 0.22);
        break;
      case 'organ_seventh_stretch':
        // Classic upbeat 3/4 ballpark waltz phrase!
        this.playOrganNotes(
          ctx,
          [
            [523.25, 0.0, 0.24],
            [1046.5, 0.26, 0.16],
            [880.0, 0.44, 0.16],
            [783.99, 0.62, 0.16],
            [659.25, 0.8, 0.18],
            [783.99, 1.0, 0.36],
            [587.33, 1.38, 0.44],
          ],
          0.5,
        );
        this.playCrowdLayer(ctx, 0.35, 1.45, 0.32);
        break;
      case 'stadium_airhorn':
        [
          [0, 0.2],
          [0.26, 0.56],
        ].forEach(([offset, dur]) => {
          this.tone(ctx, 415.3, 418, offset, dur, 'sawtooth', 0.22);
          this.tone(ctx, 523.25, 526, offset, dur, 'sawtooth', 0.18);
          this.tone(ctx, 622.25, 625, offset, dur, 'triangle', 0.15);
        });
        break;
      case 'vendor_bell':
        [0, 0.15].forEach((offset) => {
          this.tone(ctx, 1567.98, 1567.98, offset, 0.2, 'sine', 0.24);
          this.tone(ctx, 3135.96, 3135.96, offset, 0.14, 'triangle', 0.12);
        });
        this.playFilteredPinkSweep(ctx, 0.32, 0.22, 2400, 1400, 1.8, 0.26);
        break;
      case 'rain_thunder':
        this.playFilteredPinkSweep(ctx, 0, 1.45, 210, 75, 1.1, 0.72);
        this.tone(ctx, 84, 38, 0.06, 0.85, 'sine', 0.32);
        [0.4, 0.62, 0.85, 1.08].forEach((offset, idx) => {
          this.tone(ctx, 1220 + idx * 190, 960 + idx * 140, offset, 0.06, 'sine', 0.09);
        });
        break;
      case 'heritage_power_surge':
        [392.0, 523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((freq, idx) => {
          this.tone(ctx, freq, freq * 1.04, idx * 0.055, 0.28, 'triangle', 0.22);
          this.tone(ctx, freq * 0.5, freq * 0.5, idx * 0.055, 0.24, 'sawtooth', 0.09);
        });
        this.playFilteredPinkSweep(ctx, 0.05, 0.45, 900, 3200, 2.5, 0.35);
        break;
      case 'trade_gavel':
        this.tone(ctx, 180, 68, 0, 0.12, 'sine', 0.45);
        this.noiseBurst(ctx, 0, 0.08, 650, 'lowpass', 0.48);
        this.tone(ctx, 783.99, 783.99, 0.14, 0.12, 'triangle', 0.24);
        this.tone(ctx, 1046.5, 1046.5, 0.25, 0.3, 'triangle', 0.28);
        break;
      default:
        break;
    }
  }

  play(cue: SoundCue): boolean {
    if (this.state.muted) return false;
    this.state.lastCue = cue;
    const ctx = this.ensureContext();
    if (!ctx) return true;

    if (!this.playActionCue(ctx, cue)) {
      this.playAtmosphereAndRpgCue(ctx, cue);
    }
    return true;
  }
}

export const soundEngine = new RetroSoundEngine();
