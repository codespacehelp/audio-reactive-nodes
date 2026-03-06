import type { NodeDef } from '../../types/node-def';
import type { ChannelSet } from '../../types/runtime';

// Cache analyser nodes per audio_analyzer node instance
const analysers = new Map<string, AnalyserNode>();

export const audioAnalyzerDef: NodeDef = {
  type: 'audio_analyzer',
  category: 'channels',
  inputs: [{ name: 'audio', type: 'audio_stream' }],
  outputs: [{ name: 'channels', type: 'channel_set' }],
  params: [
    { name: 'fft_size', type: 'int', default: 1024, min: 32, max: 32768 },
    { name: 'band_count', type: 'int', default: 3, min: 1, max: 32 },
    { name: 'smoothing', type: 'float', default: 0.7, min: 0, max: 1, step: 0.01 },
  ],
  needsFrame: true,
  evaluate: (ctx) => {
    const audioInput = ctx.inputs.audio as {
      sourceNode: AudioNode | null;
      audioContext: AudioContext | null;
    } | null;

    if (!audioInput?.sourceNode || !audioInput?.audioContext) {
      // No audio connected yet — return zero channels
      const bandCount = ctx.params.band_count as number;
      const values: Record<string, number> = {};
      for (let i = 0; i < bandCount; i++) {
        values[`band${i}`] = 0;
      }
      return { channels: { values } as ChannelSet };
    }

    const fftSize = ctx.params.fft_size as number;
    const bandCount = ctx.params.band_count as number;
    const smoothing = ctx.params.smoothing as number;

    // Get or create analyser for this node
    let analyser = analysers.get(ctx.nodeName);
    if (!analyser) {
      analyser = audioInput.audioContext.createAnalyser();
      audioInput.sourceNode.connect(analyser);
      analysers.set(ctx.nodeName, analyser);
    }

    // Update analyser settings
    analyser.fftSize = fftSize;
    analyser.smoothingTimeConstant = smoothing;

    // Get frequency data
    const frequencyData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(frequencyData);

    // Group into logarithmic bands
    const values: Record<string, number> = {};
    const binCount = frequencyData.length;

    for (let band = 0; band < bandCount; band++) {
      // Logarithmic band boundaries
      const lowRatio = Math.pow(band / bandCount, 2);
      const highRatio = Math.pow((band + 1) / bandCount, 2);
      const lowBin = Math.floor(lowRatio * binCount);
      const highBin = Math.min(Math.floor(highRatio * binCount), binCount - 1);

      let sum = 0;
      let count = 0;
      for (let i = lowBin; i <= highBin; i++) {
        sum += frequencyData[i];
        count++;
      }

      // Raw magnitude (0-255 from getByteFrequencyData)
      values[`band${band}`] = count > 0 ? sum / count : 0;
    }

    return { channels: { values } as ChannelSet };
  },
};
