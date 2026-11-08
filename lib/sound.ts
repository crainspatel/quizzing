type Note = {
  frequency: number;
  offset: number;
  duration: number;
  level: number;
  wave?: OscillatorType;
  endFrequency?: number;
};

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted = false;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx?.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  private playNotes(notes: Note[]) {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const baseTime = ctx.currentTime;

    notes.forEach(({ frequency, offset, duration, level, wave = 'sine', endFrequency }) => {
      const start = baseTime + offset;
      const oscillator = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const envelope = ctx.createGain();

      oscillator.type = wave;
      oscillator.frequency.setValueAtTime(frequency, start);
      if (endFrequency && endFrequency !== frequency) {
        oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration * 0.55);
      }

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2400, start);
      filter.Q.setValueAtTime(0.45, start);

      envelope.gain.setValueAtTime(0.0001, start);
      envelope.gain.exponentialRampToValueAtTime(level, start + 0.018);
      envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);

      oscillator.connect(filter);
      filter.connect(envelope);
      envelope.connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.02);
    });
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // A clean two-note lift for positive score awards.
  public playPositiveScore() {
    this.playNotes([
      { frequency: 659.25, offset: 0, duration: 0.22, level: 0.05, wave: 'triangle' },
      { frequency: 783.99, offset: 0.09, duration: 0.31, level: 0.043 },
    ]);
  }

  // A short, cheerful three-note flourish for answer reveals.
  public playAnswerReveal() {
    this.playNotes([
      { frequency: 523.25, offset: 0, duration: 0.2, level: 0.052, wave: 'triangle' },
      { frequency: 659.25, offset: 0.075, duration: 0.24, level: 0.046 },
      { frequency: 783.99, offset: 0.15, duration: 0.3, level: 0.04 },
    ]);
  }

  // Keep the original low sawtooth buzz for score deductions.
  public playWrong() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(130.81, now);
    oscillator.frequency.setValueAtTime(123.47, now + 0.15);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.45);
  }

  // A light two-note shimmer for each revealed hint.
  public playClueReveal() {
    this.playNotes([
      { frequency: 783.99, offset: 0, duration: 0.13, level: 0.035 },
      { frequency: 1046.5, offset: 0.055, duration: 0.17, level: 0.028 },
    ]);
  }

  // A restrained C-major finish, with a little extra time to land on the final note.
  public playFanfare() {
    this.playNotes([
      { frequency: 523.25, offset: 0, duration: 0.38, level: 0.052 },
      { frequency: 659.25, offset: 0.13, duration: 0.4, level: 0.047 },
      { frequency: 783.99, offset: 0.26, duration: 0.45, level: 0.043 },
      { frequency: 1046.5, offset: 0.39, duration: 0.65, level: 0.038 },
    ]);
  }
}

export const sounds = new SoundEngine();
