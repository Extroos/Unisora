/**
 * VoiceAudioService
 * Handles Web Audio API synthesizer for chimes (connect, disconnect, mute, unmute)
 * and real-time microphone volume analysis to detect speaking.
 */

class VoiceAudioService {
  private audioCtx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private animationFrameId: number | null = null;
  private onSpeakingChange: ((isSpeaking: boolean) => void) | null = null;
  private isSpeaking = false;
  private speakingThreshold = 0.015; // sensitivity threshold

  private initAudioContext() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // Synthesize chimes using OscillatorNode and GainNode
  public playChime(type: 'connect' | 'disconnect' | 'mute' | 'unmute' | 'message') {
    try {
      const ctx = this.initAudioContext();
      const now = ctx.currentTime;

      // Play different chimes based on type
      if (type === 'connect') {
        // Ascending chime (C4 -> E4 -> G4)
        this.playTone(ctx, 261.63, now, 0.1);
        this.playTone(ctx, 329.63, now + 0.12, 0.1);
        this.playTone(ctx, 392.00, now + 0.24, 0.25);
      } else if (type === 'disconnect') {
        // Descending chime (G4 -> E4 -> C4)
        this.playTone(ctx, 392.00, now, 0.1);
        this.playTone(ctx, 329.63, now + 0.12, 0.1);
        this.playTone(ctx, 261.63, now + 0.24, 0.25);
      } else if (type === 'mute') {
        // Soft descending sine chime (E4 -> C4)
        this.playTone(ctx, 329.63, now, 0.08, 'sine');
        this.playTone(ctx, 261.63, now + 0.09, 0.12, 'sine');
      } else if (type === 'unmute') {
        // Soft ascending sine chime (C4 -> E4)
        this.playTone(ctx, 261.63, now, 0.08, 'sine');
        this.playTone(ctx, 329.63, now + 0.09, 0.12, 'sine');
      } else if (type === 'message') {
        // High double chime (C5 -> G5)
        this.playTone(ctx, 523.25, now, 0.05, 'sine');
        this.playTone(ctx, 783.99, now + 0.06, 0.1, 'sine');
      }
    } catch (e) {
      console.warn('Could not play synthesized chime:', e);
    }
  }

  private playTone(
    ctx: AudioContext, 
    freq: number, 
    startTime: number, 
    duration: number, 
    type: OscillatorType = 'sine'
  ) {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gainNode.gain.setValueAtTime(0.08, startTime);
    // Smooth decay
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  // Start microphone level detection
  public async startMicMonitoring(onSpeaking: (isSpeaking: boolean) => void) {
    this.stopMicMonitoring();
    this.onSpeakingChange = onSpeaking;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this.micStream = stream;

      const ctx = this.initAudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      this.analyser = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        if (!this.analyser) return;
        this.analyser.getByteTimeDomainData(dataArray);

        // Calculate Root Mean Square (RMS) volume level
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          const val = (dataArray[i] - 128) / 128;
          sum += val * val;
        }
        const rms = Math.sqrt(sum / bufferLength);

        const speakingNow = rms > this.speakingThreshold;
        if (speakingNow !== this.isSpeaking) {
          this.isSpeaking = speakingNow;
          this.onSpeakingChange?.(speakingNow);
        }

        this.animationFrameId = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (e) {
      console.error('Error starting microphone monitor:', e);
    }
  }

  // Stop microphone monitoring
  public stopMicMonitoring() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach(track => track.stop());
      this.micStream = null;
    }
    this.analyser = null;
    this.isSpeaking = false;
  }
}

export const voiceAudioService = new VoiceAudioService();
