import type { NodeDef } from '../../types/node-def';
import type { ChannelSet } from '../../types/runtime';
import { getAudioContext, resumeAudioContext } from '../../runtime/audio-context';

let mediaStream: MediaStream | null = null;
let sourceNode: MediaStreamAudioSourceNode | null = null;
let analyserForWaveform: AnalyserNode | null = null;
let waveformData: Float32Array | null = null;
let micError: string | null = null;
let micState: 'idle' | 'requesting' | 'ready' | 'error' = 'idle';

async function requestMic() {
  if (micState !== 'idle') return;
  micState = 'requesting';

  try {
    await resumeAudioContext();
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const ctx = getAudioContext();
    sourceNode = ctx.createMediaStreamSource(mediaStream);

    // Create an analyser for waveform preview
    analyserForWaveform = ctx.createAnalyser();
    analyserForWaveform.fftSize = 2048;
    sourceNode.connect(analyserForWaveform);
    waveformData = new Float32Array(analyserForWaveform.fftSize);
    micError = null;
    micState = 'ready';
  } catch (err) {
    micError = err instanceof Error ? err.message : 'Microphone access denied';
    micState = 'error';
  }
}

/**
 * Trigger mic permission request. Should be called from a user gesture
 * (click handler) to ensure the browser allows getUserMedia.
 */
export function initAudioInput() {
  requestMic();
}

// Auto-request on first user interaction (click/keydown) to satisfy
// the user gesture requirement for getUserMedia in most browsers.
function onFirstInteraction() {
  requestMic();
  window.removeEventListener('click', onFirstInteraction);
  window.removeEventListener('keydown', onFirstInteraction);
}
window.addEventListener('click', onFirstInteraction);
window.addEventListener('keydown', onFirstInteraction);

export const audioInDef: NodeDef = {
  type: 'audio_in',
  category: 'audio',
  inputs: [],
  outputs: [{ name: 'audio', type: 'audio_stream' }],
  params: [{ name: 'source', type: 'string', default: 'microphone' }],
  needsFrame: true,
  evaluate: () => {
    if (micState === 'error') {
      throw new Error(micError!);
    }

    if (micState !== 'ready') {
      // Still waiting for permission — return null audio (no error)
      return {
        audio: {
          sourceNode: null,
          analyser: null,
          waveformData: null,
          audioContext: null,
        },
      };
    }

    // Compute RMS level from waveform for preview display
    let rms = 0;
    if (analyserForWaveform && waveformData) {
      analyserForWaveform.getFloatTimeDomainData(waveformData);
      let sum = 0;
      for (let i = 0; i < waveformData.length; i++) {
        sum += waveformData[i] * waveformData[i];
      }
      rms = Math.sqrt(sum / waveformData.length) * 255; // scale to ~0-255
    }

    // Return the audio source chain for downstream nodes
    // plus a ChannelSet 'level' output for the sparkline preview
    return {
      audio: {
        sourceNode,
        analyser: analyserForWaveform,
        waveformData,
        audioContext: getAudioContext(),
      },
      level: { values: { rms } } as ChannelSet,
    };
  },
};
