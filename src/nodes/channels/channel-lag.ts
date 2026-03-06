import type { NodeDef } from '../../types/node-def';
import type { ChannelSet } from '../../types/runtime';

// Per-channel previous values, keyed by nodeName:channelName
const prevValues = new Map<string, number>();

export const channelLagDef: NodeDef = {
  type: 'channel_lag',
  category: 'channels',
  inputs: [{ name: 'in', type: 'channel_set' }],
  outputs: [{ name: 'out', type: 'channel_set' }],
  params: [
    { name: 'attack_ms', type: 'float', default: 30, min: 0, max: 5000, step: 1, expressionEnabled: true },
    { name: 'release_ms', type: 'float', default: 220, min: 0, max: 5000, step: 1, expressionEnabled: true },
    { name: 'gain', type: 'float', default: 1, min: 0, max: 10, step: 0.01, expressionEnabled: true },
  ],
  needsFrame: true,
  evaluate: (ctx) => {
    const input = ctx.inputs.in as ChannelSet | null;
    if (!input) return { out: { values: {} } as ChannelSet };

    const attackMs = ctx.params.attack_ms as number;
    const releaseMs = ctx.params.release_ms as number;
    const gain = ctx.params.gain as number;
    const dt = ctx.dt;

    const values: Record<string, number> = {};

    for (const [name, rawVal] of Object.entries(input.values)) {
      const target = rawVal * gain;
      const key = `${ctx.nodeName}:${name}`;
      const prev = prevValues.get(key) ?? 0;

      // Choose attack or release based on direction
      const timeConstantMs = target > prev ? attackMs : releaseMs;
      const alpha = timeConstantMs > 0 ? 1 - Math.exp(-dt * 1000 / timeConstantMs) : 1;

      const smoothed = prev + alpha * (target - prev);
      values[name] = smoothed;
      prevValues.set(key, smoothed);
    }

    return { out: { values } as ChannelSet };
  },
};
