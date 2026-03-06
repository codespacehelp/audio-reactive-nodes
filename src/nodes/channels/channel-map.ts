import type { NodeDef } from '../../types/node-def';
import type { ChannelSet } from '../../types/runtime';

export const channelMapDef: NodeDef = {
  type: 'channel_map',
  category: 'channels',
  inputs: [{ name: 'in', type: 'channel_set' }],
  outputs: [{ name: 'out', type: 'channel_set' }],
  params: [
    { name: 'in_min', type: 'float', default: 0, expressionEnabled: true },
    { name: 'in_max', type: 'float', default: 255, expressionEnabled: true },
    { name: 'out_min', type: 'float', default: 0, expressionEnabled: true },
    { name: 'out_max', type: 'float', default: 1, expressionEnabled: true },
    { name: 'clip_mode', type: 'string', default: 'none', options: ['none', 'clamp'] },
  ],
  evaluate: (ctx) => {
    const input = ctx.inputs.in as ChannelSet | null;
    if (!input) return { out: { values: {} } as ChannelSet };

    const inMin = ctx.params.in_min as number;
    const inMax = ctx.params.in_max as number;
    const outMin = ctx.params.out_min as number;
    const outMax = ctx.params.out_max as number;
    const clipMode = ctx.params.clip_mode as string;

    const values: Record<string, number> = {};

    for (const [name, val] of Object.entries(input.values)) {
      const t = (val - inMin) / (inMax - inMin);
      let mapped = outMin + t * (outMax - outMin);

      if (clipMode === 'clamp') {
        const lo = Math.min(outMin, outMax);
        const hi = Math.max(outMin, outMax);
        mapped = Math.min(hi, Math.max(lo, mapped));
      }

      values[name] = mapped;
    }

    return { out: { values } as ChannelSet };
  },
};
