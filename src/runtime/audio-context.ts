/**
 * Shared AudioContext singleton.
 * Lazily created on first use (requires user gesture in most browsers).
 */
let audioContext: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

export function resumeAudioContext(): Promise<void> {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    return ctx.resume();
  }
  return Promise.resolve();
}
