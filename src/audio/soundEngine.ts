export type SoundCue =
  | 'bat_crack'
  | 'bomb_crack'
  | 'bunt_tap'
  | 'glove_pop'
  | 'pitch_whoosh'
  | 'comet_pitch'
  | 'knuckle_warble'
  | 'spring_boing'
  | 'crowd_cheer'
  | 'organ_charge'
  | 'organ_homerun'
  | 'level_up'
  | 'cash_chime'
  | 'ui_pop';

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

    // Gentle stadium air-absorption lowpass so there is zero radio-static fizz
    const airLowpass = ctx.createBiquadFilter();
    airLowpass.type = 'lowpass';
    airLowpass.frequency.setValueAtTime(2900, now);
    masterGain.connect(airLowpass);
    airLowpass.connect(ctx.destination);

    // Three human vocal formant bands sweeping slightly upward as excitement peaks
    const formants: readonly { startFreq: number; peakFreq: number; q: number; gain: number }[] = [
      { startFreq: 420, peakFreq: 540, q: 2.2, gain: 0.75 }, // warm chest crowd roar
      { startFreq: 980, peakFreq: 1240, q: 2.8, gain: 0.58 }, // "yeah!" vowel body
      { startFreq: 1950, peakFreq: 2350, q: 3.4, gain: 0.28 }, // excited crowd shimmer
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

    // Staggered bleacher applause pops (warm soft hand claps!)
    const clapCount = 12;
    for (let i = 0; i < clapCount; i += 1) {
      const clapOffset = startOffset + 0.14 + (i / clapCount) * (duration * 0.68) + (i % 3) * 0.017;
      this.noiseBurst(ctx, clapOffset, 0.042, 1150 + (i % 4) * 210, 'bandpass', 0.13 * intensity);
    }

    // Subtle cheerful fan "woo!" glide tucked softly inside the crowd swell
    this.tone(ctx, 740, 1120, startOffset + 0.18, 0.22, 'sine', 0.045 * intensity);
    this.tone(ctx, 1120, 860, startOffset + 0.4, 0.26, 'sine', 0.035 * intensity);
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

  play(cue: SoundCue): boolean {
    if (this.state.muted) return false;
    this.state.lastCue = cue;
    const ctx = this.ensureContext();
    if (!ctx) return true;

    switch (cue) {
      case 'ui_pop':
        this.tone(ctx, 520, 780, 0, 0.065, 'triangle', 0.22);
        break;
      case 'bat_crack':
        this.noiseBurst(ctx, 0, 0.09, 1800, 'bandpass', 0.55);
        this.tone(ctx, 420, 140, 0, 0.08, 'triangle', 0.38);
        break;
      case 'bomb_crack':
        this.noiseBurst(ctx, 0, 0.16, 1500, 'bandpass', 0.72);
        this.tone(ctx, 540, 90, 0, 0.22, 'sawtooth', 0.42);
        this.tone(ctx, 880, 1320, 0.05, 0.22, 'square', 0.18);
        break;
      case 'bunt_tap':
        this.noiseBurst(ctx, 0, 0.04, 2400, 'bandpass', 0.3);
        this.tone(ctx, 320, 210, 0, 0.05, 'triangle', 0.25);
        break;
      case 'glove_pop':
        this.noiseBurst(ctx, 0, 0.07, 700, 'lowpass', 0.45);
        this.tone(ctx, 190, 80, 0, 0.07, 'sine', 0.35);
        break;
      case 'pitch_whoosh':
        this.noiseBurst(ctx, 0, 0.18, 950, 'bandpass', 0.3);
        this.tone(ctx, 480, 190, 0, 0.16, 'sine', 0.18);
        break;
      case 'comet_pitch':
        this.noiseBurst(ctx, 0, 0.28, 2200, 'highpass', 0.4);
        this.tone(ctx, 340, 1180, 0, 0.14, 'sawtooth', 0.28);
        this.tone(ctx, 1180, 240, 0.12, 0.2, 'sawtooth', 0.3);
        break;
      case 'knuckle_warble':
        [0, 0.07, 0.14, 0.21].forEach((offset, idx) => {
          this.tone(ctx, idx % 2 === 0 ? 520 : 690, idx % 2 === 0 ? 710 : 460, offset, 0.08, 'sine', 0.24);
        });
        break;
      case 'spring_boing':
        this.tone(ctx, 180, 680, 0, 0.14, 'triangle', 0.34);
        this.tone(ctx, 640, 320, 0.14, 0.12, 'triangle', 0.22);
        this.tone(ctx, 360, 760, 0.24, 0.14, 'triangle', 0.2);
        break;
      case 'crowd_cheer':
        this.playCrowdLayer(ctx, 0, 1.75, 1.0);
        break;
      case 'organ_charge': {
        // Classic ballpark "da-da-da-DA-da-DA!" (G4-C5-E5-G5-E5-G5)
        const notes: readonly [number, number, number][] = [
          [392.0, 0.0, 0.11],
          [523.25, 0.12, 0.11],
          [659.25, 0.24, 0.11],
          [783.99, 0.36, 0.22],
          [659.25, 0.6, 0.1],
          [783.99, 0.72, 0.38],
        ];
        for (const [freq, offset, dur] of notes) {
          this.tone(ctx, freq, freq, offset, dur, 'square', 0.16);
          this.tone(ctx, freq * 2, freq * 2, offset, dur, 'triangle', 0.08);
        }
        break;
      }
      case 'organ_homerun': {
        const fanfare: readonly [number, number, number][] = [
          [523.25, 0.0, 0.12],
          [659.25, 0.12, 0.12],
          [783.99, 0.24, 0.12],
          [1046.5, 0.38, 0.28],
          [880.0, 0.68, 0.12],
          [1046.5, 0.82, 0.42],
        ];
        for (const [freq, offset, dur] of fanfare) {
          this.tone(ctx, freq, freq, offset, dur, 'square', 0.17);
          this.tone(ctx, freq * 0.5, freq * 0.5, offset, dur, 'triangle', 0.14);
        }
        this.playCrowdLayer(ctx, 0.28, 1.6, 0.75);
        break;
      }
      case 'level_up': {
        [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, idx) => {
          this.tone(ctx, freq, freq, idx * 0.075, 0.18, 'triangle', 0.26);
        });
        break;
      }
      case 'cash_chime':
        this.tone(ctx, 987.77, 987.77, 0, 0.08, 'sine', 0.25);
        this.tone(ctx, 1318.51, 1318.51, 0.08, 0.22, 'sine', 0.28);
        break;
    }

    return true;
  }
}

export const soundEngine = new RetroSoundEngine();
